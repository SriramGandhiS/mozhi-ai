import re
from typing import Dict, List, Tuple
from app.core.languages import LANGUAGE_MAP
from app.schemas.translation import DetectLanguageResponse

SCRIPT_RANGES: List[Tuple[str, str, int, int]] = [
    ("ta", "Tamil", 0x0B80, 0x0BFF),
    ("hi", "Devanagari", 0x0900, 0x097F),
    ("te", "Telugu", 0x0C00, 0x0C7F),
    ("ml", "Malayalam", 0x0D00, 0x0D7F),
    ("kn", "Kannada", 0x0C80, 0x0CFF),
    ("bn", "Bengali", 0x0980, 0x09FF),
    ("gu", "Gujarati", 0x0A80, 0x0AFF),
    ("pa", "Gurmukhi", 0x0A00, 0x0A7F),
    ("ar", "Arabic", 0x0600, 0x06FF),
    ("ja", "Japanese", 0x3040, 0x30FF),
    ("ko", "Hangul", 0xAC00, 0xD7AF),
    ("zh", "Han", 0x4E00, 0x9FFF),
    ("ru", "Cyrillic", 0x0400, 0x04FF),
]

TANGLISH_MARKERS = {
    "naan", "nalaiku", "poganum", "epdi", "irukinga", "irukken", "vanakkam",
    "romba", "nallathu", "illai", "illa", "enna", "enga", "eppo", "yen",
    "sollunga", "theriyum", "theriyala", "pannunga", "saaptingala", "vaanga",
    "ponga", "machan", "da", "di", "thambi", "anna", "akka", "amma", "appa",
    "kalyanam", "veedu", "kaasu", "neram", "valakkam", "nandri", "innum",
}


def detect_language_local(text: str) -> DetectLanguageResponse:
    if not text or not text.strip():
        return DetectLanguageResponse(
            detected_language="en",
            language_name="English",
            confidence=0.0,
            is_mixed=False,
            detected_scripts=[],
            is_tanglish=False,
        )

    counts: Dict[str, int] = {}
    script_names: Dict[str, str] = {}
    latin_count = 0
    total_alpha = 0

    for ch in text:
        code_point = ord(ch)
        if ("A" <= ch <= "Z") or ("a" <= ch <= "z"):
            latin_count += 1
            total_alpha += 1
            continue
        matched = False
        for lang_code, script_name, start, end in SCRIPT_RANGES:
            if start <= code_point <= end:
                counts[lang_code] = counts.get(lang_code, 0) + 1
                script_names[lang_code] = script_name
                total_alpha += 1
                matched = True
                break
        if not matched and ch.isalpha():
            total_alpha += 1

    if total_alpha == 0:
        return DetectLanguageResponse(
            detected_language="en",
            language_name="English",
            confidence=0.5,
            is_mixed=False,
            detected_scripts=["Latin"],
            is_tanglish=False,
        )

    detected_scripts = [script_names[k] for k in counts.keys()]
    if latin_count > 0:
        detected_scripts.append("Latin")

    # Check if mixed language (e.g., Tamil + English)
    significant_scripts = [k for k, v in counts.items() if v / total_alpha > 0.1]
    is_mixed = len(significant_scripts) > 1 or (
        len(significant_scripts) >= 1 and (latin_count / total_alpha) > 0.15
    )

    if counts:
        top_lang = max(counts.items(), key=lambda x: x[1])[0]
        confidence = min(0.99, round(counts[top_lang] / total_alpha + 0.15, 2))
        lang_info = LANGUAGE_MAP.get(top_lang)
        return DetectLanguageResponse(
            detected_language=top_lang,
            language_name=lang_info.name if lang_info else top_lang,
            confidence=confidence,
            is_mixed=is_mixed,
            detected_scripts=detected_scripts,
            is_tanglish=False,
        )

    # Pure Latin script: check for Tanglish
    words = set(re.findall(r"[a-zA-Z]+", text.lower()))
    tanglish_hits = words.intersection(TANGLISH_MARKERS)
    is_tanglish = len(tanglish_hits) >= 2 or (len(words) <= 5 and len(tanglish_hits) >= 1)

    if is_tanglish:
        return DetectLanguageResponse(
            detected_language="ta",
            language_name="Tamil (Tanglish)",
            confidence=0.85,
            is_mixed=True,
            detected_scripts=["Latin"],
            is_tanglish=True,
        )

    return DetectLanguageResponse(
        detected_language="en",
        language_name="English",
        confidence=0.85,
        is_mixed=False,
        detected_scripts=["Latin"],
        is_tanglish=False,
    )
