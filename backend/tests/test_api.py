import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.main import app
from app.services.translation.language_detector import detect_language_local
from app.services.website.website_service import UnsafeURLError, validate_public_url

Base.metadata.create_all(bind=engine)
client = TestClient(app)


def test_health_check():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "app_name" in data


def test_list_languages():
    resp = client.get("/api/v1/languages")
    assert resp.status_code == 200
    langs = resp.json()["languages"]
    codes = {l["code"] for l in langs}
    assert "ta" in codes
    assert "en" in codes
    assert "hi" in codes
    assert len(langs) >= 19


def test_detect_tamil_script():
    res = detect_language_local("நான் நாளைக்கு கல்லூரிக்கு போக வேண்டும்.")
    assert res.detected_language == "ta"
    assert res.is_tanglish is False


def test_detect_tanglish():
    res = detect_language_local("Naan nalaiku college poganum.")
    assert res.detected_language == "ta"
    assert res.is_tanglish is True


def test_detect_mixed_tamil_english():
    res = detect_language_local("நான் tomorrow college போக வேண்டும்.")
    assert res.detected_language == "ta"
    assert res.is_mixed is True


def test_ssrf_protection_blocks_localhost():
    with pytest.raises(UnsafeURLError):
        validate_public_url("http://localhost:8000/api/v1/health")
    with pytest.raises(UnsafeURLError):
        validate_public_url("http://127.0.0.1/admin")
    with pytest.raises(UnsafeURLError):
        validate_public_url("ftp://example.com/file")


def test_invalid_image_upload_rejected():
    resp = client.post(
        "/api/v1/translate/image",
        files={"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")},
    )
    assert resp.status_code == 400
    assert "Unsupported file format" in resp.json()["detail"]


def test_history_empty_and_clear():
    resp = client.get("/api/v1/history")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
