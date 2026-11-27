import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    auth_provider_id = Column(String(128), unique=True, nullable=False, index=True)
    email = Column(String(255), nullable=True, index=True)
    display_name = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    translations = relationship("Translation", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Translation(Base):
    __tablename__ = "translations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    input_type = Column(String(32), nullable=False, index=True)  # text, image, audio, document, video, website, live
    source_language = Column(String(16), nullable=False)
    target_language = Column(String(16), nullable=False)
    original_text = Column(Text, nullable=False)
    translated_text = Column(Text, nullable=False)
    translation_style = Column(String(32), default="Natural", nullable=False)
    provider = Column(String(64), default="gemini", nullable=False)
    status = Column(String(32), default="completed", nullable=False)
    is_favorite = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    user = relationship("User", back_populates="translations")

    __table_args__ = (
        Index("ix_translations_user_created", "user_id", "created_at"),
    )


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    job_type = Column(String(32), nullable=False)  # image, audio, document, video, website
    progress = Column(Float, default=0.0, nullable=False)
    status = Column(String(32), default="queued", nullable=False, index=True)  # queued, processing, completed, failed, cancelled
    status_message = Column(String(255), nullable=True)
    result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="jobs")


class UserSetting(Base):
    __tablename__ = "user_settings"

    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    default_source_language = Column(String(16), default="auto", nullable=False)
    default_target_language = Column(String(16), default="en", nullable=False)
    preferred_theme = Column(String(16), default="light", nullable=False)
    translation_style = Column(String(32), default="Natural", nullable=False)
    preferred_voice = Column(String(64), nullable=True)
    history_enabled = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="settings")
