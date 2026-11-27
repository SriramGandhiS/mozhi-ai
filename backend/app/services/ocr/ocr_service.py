import asyncio
import base64
import io
import json
import logging
import os
from typing import Any, Dict, List, Optional, Tuple

from google import genai
from google.genai import types
from openai import AsyncOpenAI
from PIL import Image, ImageOps
import pytesseract

if os.name == "nt" and os.path.exists(r"C:\Program Files\Tesseract-OCR\tesseract.exe"):
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

_local_tessdata = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "tessdata"))
if os.path.isdir(_local_tessdata):
    os.environ["TESSDATA_PREFIX"] = _local_tessdata

from app.core.config import get_settings
from app.providers.translation_provider import ProviderError

logger = logging.getLogger(__name__)


class OCRService:
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

    def preprocess_image(self, image_bytes: bytes) -> Tuple[bytes, int, int]:
        img = Image.open(io.BytesIO(image_bytes))
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue(), img.width, img.height

    async def extract_text(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
    ) -> Tuple[str, str, List[Dict[str, Any]]]:
        """Returns (extracted_text, provider_used, regions)."""
        processed_bytes, width, height = await asyncio.to_thread(self.preprocess_image, image_bytes)

        if self.gemini_client and self.settings.OCR_PROVIDER in ("gemini", "auto"):
            try:
                prompt = (
                    "Extract all visible text from this image accurately, preserving reading order and line breaks. "
                    "Support Tamil, English, and any other languages present. "
                    "Respond ONLY with JSON: "
                    '{"extracted_text": "<full text>", "detected_language": "<2-letter code>", "regions": [{"text": "...", "box": [ymin, xmin, ymax, xmax]}]}'
                )
                response = await asyncio.to_thread(
                    self.gemini_client.models.generate_content,
                    model=self.settings.GEMINI_MODEL,
                    contents=[
                        types.Part.from_bytes(data=processed_bytes, mime_type="image/png"),
                        prompt,
                    ],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        response_mime_type="application/json",
                    ),
                )
                data = json.loads((response.text or "{}").strip())
                extracted = data.get("extracted_text", "").strip()
                regions = data.get("regions", [])
                if extracted:
                    return extracted, "gemini_vision", regions
            except Exception as exc:
                logger.warning("Gemini OCR failed, falling back: %s", exc)

        if self.openai_client:
            try:
                b64 = base64.b64encode(processed_bytes).decode("ascii")
                resp = await self.openai_client.chat.completions.create(
                    model=self.settings.OPENAI_MODEL,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "Extract all visible text from this image accurately, preserving reading order and line breaks. "
                                        "Support Tamil, English, and any other languages present. "
                                        'Respond ONLY with JSON: {"extracted_text": "<full text>"}'
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:image/png;base64,{b64}"},
                                },
                            ],
                        }
                    ],
                    temperature=0.1,
                    response_format={"type": "json_object"},
                )
                data = json.loads((resp.choices[0].message.content or "{}").strip())
                extracted = data.get("extracted_text", "").strip()
                if extracted:
                    return extracted, "openai_vision", []
            except Exception as exc:
                logger.warning("OpenAI Vision OCR failed, falling back to Tesseract: %s", exc)

        # Fallback to Tesseract OCR
        try:
            img = Image.open(io.BytesIO(processed_bytes))
            avail_langs = pytesseract.get_languages(config="")
            lang_arg = "tam+eng" if "tam" in avail_langs else "eng"
            text = await asyncio.to_thread(pytesseract.image_to_string, img, lang=lang_arg)
            text = text.strip()
            if not text:
                raise ProviderError("No text detected in the image.", "tesseract", retryable=False)
            return text, "tesseract", []
        except ProviderError:
            raise
        except Exception as exc:
            raise ProviderError(
                f"OCR extraction failed. Ensure GEMINI_API_KEY is set or Tesseract is installed: {exc}",
                "ocr",
                retryable=False,
            )
