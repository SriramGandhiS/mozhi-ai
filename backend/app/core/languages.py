from typing import Dict, List, Optional
from pydantic import BaseModel


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
    script: str
    rtl: bool = False
    providers: List[str] = ["gemini", "openai", "google_translate"]
    priority: int = 99


SUPPORTED_LANGUAGES: List[LanguageInfo] = [
    LanguageInfo(code="ta", name="Tamil", native_name="தமிழ்", script="Tamil", priority=1),
    LanguageInfo(code="en", name="English", native_name="English", script="Latin", priority=2),
    LanguageInfo(code="hi", name="Hindi", native_name="हिन्दी", script="Devanagari", priority=3),
    LanguageInfo(code="te", name="Telugu", native_name="తెలుగు", script="Telugu", priority=4),
    LanguageInfo(code="ml", name="Malayalam", native_name="മലയാളം", script="Malayalam", priority=5),
    LanguageInfo(code="kn", name="Kannada", native_name="ಕನ್ನಡ", script="Kannada", priority=6),
    LanguageInfo(code="bn", name="Bengali", native_name="বাংলা", script="Bengali", priority=7),
    LanguageInfo(code="mr", name="Marathi", native_name="मराठी", script="Devanagari", priority=8),
    LanguageInfo(code="gu", name="Gujarati", native_name="ગુજરાતી", script="Gujarati", priority=9),
    LanguageInfo(code="pa", name="Punjabi", native_name="ਪੰਜਾਬੀ", script="Gurmukhi", priority=10),
    LanguageInfo(code="ur", name="Urdu", native_name="اردو", script="Arabic", rtl=True, priority=11),
    LanguageInfo(code="fr", name="French", native_name="Français", script="Latin", priority=12),
    LanguageInfo(code="de", name="German", native_name="Deutsch", script="Latin", priority=13),
    LanguageInfo(code="es", name="Spanish", native_name="Español", script="Latin", priority=14),
    LanguageInfo(code="ar", name="Arabic", native_name="العربية", script="Arabic", rtl=True, priority=15),
    LanguageInfo(code="ja", name="Japanese", native_name="日本語", script="Japanese", priority=16),
    LanguageInfo(code="ko", name="Korean", native_name="한국어", script="Hangul", priority=17),
    LanguageInfo(code="zh", name="Chinese", native_name="中文", script="Han", priority=18),
    LanguageInfo(code="ru", name="Russian", native_name="Русский", script="Cyrillic", priority=19),
]

LANGUAGE_MAP: Dict[str, LanguageInfo] = {lang.code: lang for lang in SUPPORTED_LANGUAGES}


def get_language_by_code(code: str) -> Optional[LanguageInfo]:
    if code == "auto":
        return LanguageInfo(code="auto", name="Auto Detect", native_name="Auto Detect", script="Any", priority=0)
    return LANGUAGE_MAP.get(code.lower())


def get_languages_for_provider(provider: Optional[str] = None) -> List[LanguageInfo]:
    if not provider:
        return SUPPORTED_LANGUAGES
    return [lang for lang in SUPPORTED_LANGUAGES if provider in lang.providers]
