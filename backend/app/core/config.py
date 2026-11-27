from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Mozhi AI"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,https://mozhiai.netlify.app"

    # Database
    DATABASE_URL: str = "sqlite:///./lingua_ai.db"

    # Primary AI Provider
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Fallback Providers
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "openai/gpt-oss-120b"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    GOOGLE_CLOUD_PROJECT_ID: str = ""
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    INDICTRANS2_API_URL: str = ""

    # Multimodal Providers
    OCR_PROVIDER: str = "gemini"
    SPEECH_PROVIDER: str = "gemini"
    TTS_PROVIDER: str = "browser"

    # Storage & Limits
    STORAGE_BACKEND: str = "local"
    LOCAL_UPLOAD_DIR: str = "./tmp_uploads"
    MAX_UPLOAD_SIZE_MB: int = 50
    TEMP_FILE_TTL_MINUTES: int = 30

    # Firebase Auth
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_JSON: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
