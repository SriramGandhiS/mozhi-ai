import os
import re
from typing import Optional
from fastapi import Depends, Header, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.db_models import User

_firebase_initialized = False


def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    settings = get_settings()
    if settings.FIREBASE_CREDENTIALS_JSON and os.path.exists(settings.FIREBASE_CREDENTIALS_JSON):
        import firebase_admin
        from firebase_admin import credentials

        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_JSON)
            firebase_admin.initialize_app(cred)
        _firebase_initialized = True


async def get_current_user_optional(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Verifies Firebase Bearer token if provided; returns None for guest access."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        return None

    _init_firebase()
    if not _firebase_initialized:
        return None

    try:
        from firebase_admin import auth as firebase_auth

        decoded = firebase_auth.verify_id_token(token)
        uid = decoded.get("uid")
        if not uid:
            return None

        user = db.query(User).filter(User.auth_provider_id == uid).first()
        if not user:
            user = User(
                auth_provider_id=uid,
                email=decoded.get("email"),
                display_name=decoded.get("name"),
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        return user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )


def sanitize_filename(filename: str) -> str:
    base = os.path.basename(filename or "upload")
    return re.sub(r"[^a-zA-Z0-9._-]", "_", base)[:120]


async def read_validated_upload(
    file: UploadFile,
    allowed_extensions: set[str],
    max_bytes: Optional[int] = None,
) -> tuple[bytes, str]:
    settings = get_settings()
    limit = max_bytes or settings.max_upload_bytes
    safe_name = sanitize_filename(file.filename or "file")
    ext = safe_name.rsplit(".", 1)[-1].lower() if "." in safe_name else ""
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '.{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(content) > limit:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {limit // (1024 * 1024)} MB.",
        )
    return content, safe_name
