import json
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import SessionLocal, get_db
from app.core.languages import get_languages_for_provider
from app.core.security import get_current_user_optional, read_validated_upload
from app.models.db_models import ProcessingJob, Translation, User, UserSetting
from app.providers.translation_provider import ProviderError, TranslationRouter
from app.schemas.translation import (
    DetectLanguageRequest,
    DetectLanguageResponse,
    HistoryItemResponse,
    JobStatusResponse,
    SpeechGenerateRequest,
    TextTranslateRequest,
    TranslationResponse,
    UserSettingsSchema,
    WebsiteTranslateRequest,
)
from app.services.documents.document_service import DocumentService
from app.services.media.video_service import extract_audio_from_video, segments_to_srt, segments_to_vtt
from app.services.ocr.ocr_service import OCRService
from app.services.speech.speech_service import SpeechService
from app.services.translation.language_detector import detect_language_local
from app.services.website.website_service import UnsafeURLError, extract_article_from_url

router = APIRouter()

IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp", "heic"}
AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "aac", "ogg", "flac", "webm"}
DOCUMENT_EXTENSIONS = {"pdf", "docx", "txt", "pptx", "xlsx"}
VIDEO_EXTENSIONS = {"mp4", "webm", "mov", "mkv"}


def _save_history(
    db: Session,
    user: Optional[User],
    input_type: str,
    source_language: str,
    target_language: str,
    original_text: str,
    translated_text: str,
    style: str,
    provider: str,
) -> None:
    record = Translation(
        user_id=user.id if user else None,
        input_type=input_type,
        source_language=source_language,
        target_language=target_language,
        original_text=original_text[:50000],
        translated_text=translated_text[:50000],
        translation_style=style,
        provider=provider,
        status="completed",
    )
    db.add(record)
    db.commit()


@router.get("/health")
async def health_check():
    settings = get_settings()
    return {
        "status": "ok",
        "app_name": settings.APP_NAME,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "openai_configured": bool(settings.OPENAI_API_KEY),
    }


@router.get("/languages")
async def list_languages(provider: Optional[str] = Query(default=None)):
    langs = get_languages_for_provider(provider)
    return {"languages": [lang.model_dump() for lang in langs]}


@router.post("/detect-language", response_model=DetectLanguageResponse)
async def detect_language(payload: DetectLanguageRequest):
    return detect_language_local(payload.text)


@router.post("/translate/text", response_model=TranslationResponse)
async def translate_text(
    payload: TextTranslateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    start = time.perf_counter()
    local_detect = detect_language_local(payload.text)
    source_lang = payload.source_language
    if source_lang == "auto":
        source_lang = local_detect.detected_language

    translation_router = TranslationRouter()
    try:
        translated, detected, provider = await translation_router.translate(
            text=payload.text,
            source_language=source_lang,
            target_language=payload.target_language,
            style=payload.style,
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))

    duration_ms = int((time.perf_counter() - start) * 1000)
    if payload.save_history:
        _save_history(
            db,
            user,
            "text",
            detected,
            payload.target_language,
            payload.text,
            translated,
            payload.style,
            provider,
        )

    return TranslationResponse(
        request_id=str(uuid.uuid4()),
        status="completed",
        detected_language=detected,
        target_language=payload.target_language,
        original_content=payload.text,
        translated_content=translated,
        processing_duration_ms=duration_ms,
        provider=provider,
        metadata={"is_mixed": local_detect.is_mixed, "is_tanglish": local_detect.is_tanglish},
    )


@router.post("/translate/image", response_model=TranslationResponse)
async def translate_image(
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("en"),
    style: str = Form("Natural"),
    save_history: bool = Form(True),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    start = time.perf_counter()
    image_bytes, safe_name = await read_validated_upload(file, IMAGE_EXTENSIONS)

    ocr_service = OCRService()
    try:
        extracted_text, ocr_provider, regions = await ocr_service.extract_text(
            image_bytes, file.content_type or "image/png"
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))

    translation_router = TranslationRouter()
    try:
        translated, detected, trans_provider = await translation_router.translate(
            text=extracted_text,
            source_language=source_language,
            target_language=target_language,
            style=style,
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))

    duration_ms = int((time.perf_counter() - start) * 1000)
    if save_history:
        _save_history(
            db,
            user,
            "image",
            detected,
            target_language,
            extracted_text,
            translated,
            style,
            f"{ocr_provider}+{trans_provider}",
        )

    return TranslationResponse(
        request_id=str(uuid.uuid4()),
        status="completed",
        detected_language=detected,
        target_language=target_language,
        original_content=extracted_text,
        translated_content=translated,
        processing_duration_ms=duration_ms,
        provider=f"{ocr_provider}+{trans_provider}",
        metadata={"filename": safe_name, "regions": regions},
    )


@router.post("/translate/audio", response_model=TranslationResponse)
async def translate_audio(
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("en"),
    style: str = Form("Natural"),
    save_history: bool = Form(True),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    start = time.perf_counter()
    audio_bytes, safe_name = await read_validated_upload(file, AUDIO_EXTENSIONS)

    speech_service = SpeechService()
    try:
        transcript, detected, segments, speech_provider = await speech_service.transcribe(
            audio_bytes, file.content_type or "audio/mp3", safe_name
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))

    translation_router = TranslationRouter()
    try:
        translated, detected_final, trans_provider = await translation_router.translate(
            text=transcript,
            source_language=source_language if source_language != "auto" else detected,
            target_language=target_language,
            style=style,
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))

    # Translate individual segments if present
    for seg in segments:
        try:
            seg_trans, _, _ = await translation_router.translate(
                text=seg.original_text,
                source_language=detected_final,
                target_language=target_language,
                style=style,
            )
            seg.translated_text = seg_trans
        except Exception:
            seg.translated_text = ""

    duration_ms = int((time.perf_counter() - start) * 1000)
    if save_history:
        _save_history(
            db,
            user,
            "audio",
            detected_final,
            target_language,
            transcript,
            translated,
            style,
            f"{speech_provider}+{trans_provider}",
        )

    return TranslationResponse(
        request_id=str(uuid.uuid4()),
        status="completed",
        detected_language=detected_final,
        target_language=target_language,
        original_content=transcript,
        translated_content=translated,
        segments=segments,
        processing_duration_ms=duration_ms,
        provider=f"{speech_provider}+{trans_provider}",
        metadata={
            "filename": safe_name,
            "srt": segments_to_srt(segments, use_translated=True) if segments else "",
            "vtt": segments_to_vtt(segments, use_translated=True) if segments else "",
        },
    )


async def _process_document_job(
    job_id: str,
    file_bytes: bytes,
    filename: str,
    source_language: str,
    target_language: str,
    style: str,
):
    db = SessionLocal()
    start = time.perf_counter()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job or job.status == "cancelled":
            return
        job.status = "processing"
        job.progress = 20.0
        job.status_message = "Extracting document content..."
        db.commit()

        doc_service = DocumentService()
        extracted_text, page_count, warnings = await doc_service.extract_text(file_bytes, filename)

        job.progress = 55.0
        job.status_message = f"Translating {page_count} page(s)..."
        db.commit()

        translation_router = TranslationRouter()
        translated, detected, provider = await translation_router.translate(
            text=extracted_text,
            source_language=source_language,
            target_language=target_language,
            style=style,
        )

        duration_ms = int((time.perf_counter() - start) * 1000)
        result = TranslationResponse(
            request_id=job_id,
            status="completed",
            detected_language=detected,
            target_language=target_language,
            original_content=extracted_text,
            translated_content=translated,
            processing_duration_ms=duration_ms,
            warnings=warnings,
            provider=provider,
            metadata={"filename": filename, "page_count": page_count},
        )
        job.status = "completed"
        job.progress = 100.0
        job.status_message = "Completed"
        job.result_json = result.model_dump_json()
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(exc)
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


@router.post("/translate/document")
async def translate_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("en"),
    style: str = Form("Natural"),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    file_bytes, safe_name = await read_validated_upload(file, DOCUMENT_EXTENSIONS)
    job = ProcessingJob(
        user_id=user.id if user else None,
        job_type="document",
        progress=5.0,
        status="queued",
        status_message="Queued for document extraction...",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _process_document_job,
        job.id,
        file_bytes,
        safe_name,
        source_language,
        target_language,
        style,
    )
    return {"job_id": job.id, "status": job.status, "progress": job.progress}


@router.post("/translate/video", response_model=TranslationResponse)
async def translate_video(
    file: UploadFile = File(...),
    source_language: str = Form("auto"),
    target_language: str = Form("en"),
    style: str = Form("Natural"),
    save_history: bool = Form(True),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    start = time.perf_counter()
    video_bytes, safe_name = await read_validated_upload(file, VIDEO_EXTENSIONS)
    ext = safe_name.rsplit(".", 1)[-1].lower()

    try:
        audio_bytes = await extract_audio_from_video(video_bytes, ext=ext)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    speech_service = SpeechService()
    try:
        transcript, detected, segments, speech_provider = await speech_service.transcribe(
            audio_bytes, "audio/mp3", f"{safe_name}.mp3"
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(err))

    translation_router = TranslationRouter()
    try:
        translated, detected_final, trans_provider = await translation_router.translate(
            text=transcript,
            source_language=source_language if source_language != "auto" else detected,
            target_language=target_language,
            style=style,
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))

    for seg in segments:
        try:
            seg_trans, _, _ = await translation_router.translate(
                text=seg.original_text,
                source_language=detected_final,
                target_language=target_language,
                style=style,
            )
            seg.translated_text = seg_trans
        except Exception:
            seg.translated_text = ""

    duration_ms = int((time.perf_counter() - start) * 1000)
    if save_history:
        _save_history(
            db,
            user,
            "video",
            detected_final,
            target_language,
            transcript,
            translated,
            style,
            f"{speech_provider}+{trans_provider}",
        )

    return TranslationResponse(
        request_id=str(uuid.uuid4()),
        status="completed",
        detected_language=detected_final,
        target_language=target_language,
        original_content=transcript,
        translated_content=translated,
        segments=segments,
        processing_duration_ms=duration_ms,
        provider=f"{speech_provider}+{trans_provider}",
        metadata={
            "filename": safe_name,
            "srt": segments_to_srt(segments, use_translated=True) if segments else "",
            "vtt": segments_to_vtt(segments, use_translated=True) if segments else "",
        },
    )


@router.post("/translate/website", response_model=TranslationResponse)
async def translate_website(
    payload: WebsiteTranslateRequest,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    start = time.perf_counter()
    try:
        article = await extract_article_from_url(str(payload.url))
    except UnsafeURLError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract article from URL: {exc}",
        )

    content = article["content"] or ""
    title = article.get("title") or ""
    combined = f"# {title}\n\n{content}" if title else content

    translation_router = TranslationRouter()
    try:
        translated, detected, provider = await translation_router.translate(
            text=combined[:30000],
            source_language=payload.source_language,
            target_language=payload.target_language,
            style=payload.style,
        )
    except ProviderError as err:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(err))

    duration_ms = int((time.perf_counter() - start) * 1000)
    if payload.save_history:
        _save_history(
            db,
            user,
            "website",
            detected,
            payload.target_language,
            combined,
            translated,
            payload.style,
            provider,
        )

    return TranslationResponse(
        request_id=str(uuid.uuid4()),
        status="completed",
        detected_language=detected,
        target_language=payload.target_language,
        original_content=combined,
        translated_content=translated,
        processing_duration_ms=duration_ms,
        provider=provider,
        metadata={"url": str(payload.url), "title": title},
    )


@router.post("/speech/generate")
async def generate_speech(payload: SpeechGenerateRequest):
    # Browser Speech Synthesis API is used by default on frontend;
    # this endpoint provides structured TTS metadata or cloud TTS hook.
    return {
        "status": "browser_tts_recommended",
        "language": payload.language,
        "text": payload.text,
        "speed": payload.speed,
        "message": "Use browser SpeechSynthesis API or configure Google Cloud TTS.",
    }


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    result = TranslationResponse(**json.loads(job.result_json)) if job.result_json else None
    return JobStatusResponse(
        job_id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress,
        status_message=job.status_message,
        result=result,
        error_message=job.error_message,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")
    if job.status in ("queued", "processing"):
        job.status = "cancelled"
        job.status_message = "Cancelled by user"
        db.commit()
    return {"job_id": job.id, "status": job.status}


@router.get("/history", response_model=List[HistoryItemResponse])
async def get_history(
    input_type: Optional[str] = Query(default=None),
    language: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Translation)
    if user:
        query = query.filter(Translation.user_id == user.id)
    if input_type:
        query = query.filter(Translation.input_type == input_type)
    if language:
        query = query.filter(
            (Translation.source_language == language) | (Translation.target_language == language)
        )
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Translation.original_text.ilike(like)) | (Translation.translated_text.ilike(like))
        )
    return query.order_by(Translation.created_at.desc()).limit(limit).all()


@router.patch("/history/{item_id}/favorite")
async def toggle_favorite(item_id: str, db: Session = Depends(get_db)):
    item = db.query(Translation).filter(Translation.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")
    item.is_favorite = not item.is_favorite
    db.commit()
    return {"id": item.id, "is_favorite": item.is_favorite}


@router.delete("/history/{item_id}")
async def delete_history_item(item_id: str, db: Session = Depends(get_db)):
    item = db.query(Translation).filter(Translation.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="History item not found.")
    db.delete(item)
    db.commit()
    return {"deleted": True, "id": item_id}


@router.delete("/history")
async def clear_history(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = db.query(Translation)
    if user:
        query = query.filter(Translation.user_id == user.id)
    deleted = query.delete()
    db.commit()
    return {"cleared": deleted}


@router.get("/settings", response_model=UserSettingsSchema)
async def get_user_settings(
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if not user:
        return UserSettingsSchema()
    setting = db.query(UserSetting).filter(UserSetting.user_id == user.id).first()
    if not setting:
        return UserSettingsSchema()
    return UserSettingsSchema(
        default_source_language=setting.default_source_language,
        default_target_language=setting.default_target_language,
        preferred_theme=setting.preferred_theme,
        translation_style=setting.translation_style,
        preferred_voice=setting.preferred_voice,
        history_enabled=setting.history_enabled,
    )


@router.put("/settings", response_model=UserSettingsSchema)
async def update_user_settings(
    payload: UserSettingsSchema,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    if not user:
        return payload
    setting = db.query(UserSetting).filter(UserSetting.user_id == user.id).first()
    if not setting:
        setting = UserSetting(user_id=user.id)
        db.add(setting)
    setting.default_source_language = payload.default_source_language
    setting.default_target_language = payload.default_target_language
    setting.preferred_theme = payload.preferred_theme
    setting.translation_style = payload.translation_style
    setting.preferred_voice = payload.preferred_voice
    setting.history_enabled = payload.history_enabled
    db.commit()
    return payload


@router.websocket("/live/translate")
async def live_translate_ws(websocket: WebSocket):
    await websocket.accept()
    translation_router = TranslationRouter()
    try:
        while True:
            data = await websocket.receive_json()
            text = (data.get("text") or "").strip()
            source_lang = data.get("source_language", "auto")
            target_lang = data.get("target_language", "en")
            style = data.get("style", "Natural")

            if not text:
                continue

            try:
                translated, detected, provider = await translation_router.translate(
                    text=text,
                    source_language=source_lang,
                    target_language=target_lang,
                    style=style,
                )
                await websocket.send_json(
                    {
                        "status": "ok",
                        "original_text": text,
                        "translated_text": translated,
                        "detected_language": detected,
                        "provider": provider,
                    }
                )
            except ProviderError as err:
                await websocket.send_json({"status": "error", "detail": str(err)})
    except WebSocketDisconnect:
        pass
