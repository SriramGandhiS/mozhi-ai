import asyncio
import json
import logging
from typing import List, Tuple

from google import genai
from google.genai import types
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.providers.translation_provider import ProviderError
from app.schemas.translation import TimestampedSegment

logger = logging.getLogger(__name__)


class SpeechService:
    def __init__(self):
        self.settings = get_settings()
        self.gemini_client = (
            genai.Client(api_key=self.settings.GEMINI_API_KEY)
            if self.settings.GEMINI_API_KEY
            else None
        )
        self.openai_client = (
            AsyncOpenAI(api_key=self.settings.OPENAI_API_KEY)
            if self.settings.OPENAI_API_KEY
            else None
        )

    async def transcribe(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/mp3",
        filename: str = "audio.mp3",
    ) -> Tuple[str, str, List[TimestampedSegment], str]:
        """Returns (transcript, detected_language, segments, provider_used)."""
        if self.gemini_client and self.settings.SPEECH_PROVIDER in ("gemini", "auto"):
            try:
                prompt = (
                    "Transcribe this audio accurately in its original language (supporting Tamil, English, Tanglish, and other languages). "
                    "Break it into timestamped segments. "
                    "Respond ONLY with JSON: "
                    '{"detected_language": "<2-letter code>", "transcript": "<full transcript>", '
                    '"segments": [{"start": 0.0, "end": 4.5, "text": "...", "speaker": "Speaker 1", "uncertain": false}]}'
                )
                response = await asyncio.to_thread(
                    self.gemini_client.models.generate_content,
                    model=self.settings.GEMINI_MODEL,
                    contents=[
                        types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                    ),
                )
                data = json.loads((response.text or "{}").strip())
                transcript = data.get("transcript", "").strip()
                detected = data.get("detected_language", "auto").strip().lower()
                raw_segments = data.get("segments", [])
                segments = [
                    TimestampedSegment(
                        start=float(seg.get("start", 0.0)),
                        end=float(seg.get("end", 0.0)),
                        original_text=seg.get("text", ""),
                        translated_text="",
                        speaker=seg.get("speaker"),
                        uncertain=bool(seg.get("uncertain", False)),
                    )
                    for seg in raw_segments
                    if seg.get("text")
                ]
                if transcript:
                    return transcript, detected, segments, "gemini_audio"
            except Exception as exc:
                logger.warning("Gemini audio transcription failed: %s", exc)

        if self.openai_client:
            try:
                resp = await self.openai_client.audio.transcriptions.create(
                    model="whisper-1",
                    file=(filename, audio_bytes, mime_type),
                    response_format="verbose_json",
                )
                transcript = (resp.text or "").strip()
                detected = getattr(resp, "language", "auto") or "auto"
                segments = []
                for seg in getattr(resp, "segments", []) or []:
                    segments.append(
                        TimestampedSegment(
                            start=float(seg.get("start", 0.0)),
                            end=float(seg.get("end", 0.0)),
                            original_text=seg.get("text", "").strip(),
                            translated_text="",
                        )
                    )
                if transcript:
                    return transcript, detected[:2].lower(), segments, "openai_whisper"
            except Exception as exc:
                logger.warning("OpenAI Whisper failed: %s", exc)

        raise ProviderError(
            "No speech recognition provider is configured or all providers failed. Set GEMINI_API_KEY or OPENAI_API_KEY.",
            "speech",
            retryable=False,
        )
