from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, HttpUrl

TranslationStyle = Literal["Natural", "Literal", "Professional", "Casual", "Academic", "Simplified"]
InputType = Literal["text", "image", "audio", "document", "video", "website", "live"]


class TimestampedSegment(BaseModel):
    start: float
    end: float
    original_text: str
    translated_text: str
    speaker: Optional[str] = None
    uncertain: bool = False


class TextTranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    source_language: str = Field(default="auto", max_length=16)
    target_language: str = Field(default="en", max_length=16)
    style: TranslationStyle = Field(default="Natural")
    save_history: bool = Field(default=True)


class WebsiteTranslateRequest(BaseModel):
    url: HttpUrl
    source_language: str = Field(default="auto", max_length=16)
    target_language: str = Field(default="en", max_length=16)
    style: TranslationStyle = Field(default="Natural")
    save_history: bool = Field(default=True)


class DetectLanguageRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000)


class DetectLanguageResponse(BaseModel):
    detected_language: str
    language_name: str
    confidence: float
    is_mixed: bool = False
    detected_scripts: List[str] = []
    is_tanglish: bool = False


class SpeechGenerateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(default="en", max_length=16)
    voice: Optional[str] = None
    speed: float = Field(default=1.0, ge=0.5, le=2.0)


class TranslationResponse(BaseModel):
    request_id: str
    status: str = "completed"
    detected_language: str
    target_language: str
    original_content: str
    translated_content: str
    segments: Optional[List[TimestampedSegment]] = None
    processing_duration_ms: int
    warnings: List[str] = []
    download_url: Optional[str] = None
    provider: str = "gemini"
    metadata: Optional[Dict[str, Any]] = None


class JobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    progress: float
    status_message: Optional[str] = None
    result: Optional[TranslationResponse] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class HistoryItemResponse(BaseModel):
    id: str
    input_type: str
    source_language: str
    target_language: str
    original_text: str
    translated_text: str
    translation_style: str
    provider: str
    is_favorite: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserSettingsSchema(BaseModel):
    default_source_language: str = "auto"
    default_target_language: str = "en"
    preferred_theme: Literal["light", "dark"] = "light"
    translation_style: TranslationStyle = "Natural"
    preferred_voice: Optional[str] = None
    history_enabled: bool = True
