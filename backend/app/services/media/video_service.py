import asyncio
import logging
import os
import subprocess
import tempfile
from typing import List

from app.schemas.translation import TimestampedSegment

logger = logging.getLogger(__name__)


def format_srt_timestamp(seconds: float) -> str:
    ms = int((seconds % 1) * 1000)
    total_sec = int(seconds)
    hrs = total_sec // 3600
    mins = (total_sec % 3600) // 60
    secs = total_sec % 60
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def format_vtt_timestamp(seconds: float) -> str:
    ms = int((seconds % 1) * 1000)
    total_sec = int(seconds)
    hrs = total_sec // 3600
    mins = (total_sec % 3600) // 60
    secs = total_sec % 60
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{ms:03d}"


def segments_to_srt(segments: List[TimestampedSegment], use_translated: bool = True) -> str:
    lines: List[str] = []
    for idx, seg in enumerate(segments, start=1):
        text = seg.translated_text if use_translated else seg.original_text
        lines.append(f"{idx}")
        lines.append(f"{format_srt_timestamp(seg.start)} --> {format_srt_timestamp(seg.end)}")
        lines.append(text.strip())
        lines.append("")
    return "\n".join(lines)


def segments_to_vtt(segments: List[TimestampedSegment], use_translated: bool = True) -> str:
    lines: List[str] = ["WEBVTT", ""]
    for seg in segments:
        text = seg.translated_text if use_translated else seg.original_text
        lines.append(f"{format_vtt_timestamp(seg.start)} --> {format_vtt_timestamp(seg.end)}")
        lines.append(text.strip())
        lines.append("")
    return "\n".join(lines)


async def extract_audio_from_video(video_bytes: bytes, ext: str = "mp4") -> bytes:
    """Extracts 16kHz mono MP3 audio from video bytes using FFmpeg."""
    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, f"input.{ext}")
        out_path = os.path.join(tmpdir, "output.mp3")
        with open(in_path, "wb") as f:
            f.write(video_bytes)

        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            in_path,
            "-vn",
            "-acodec",
            "libmp3lame",
            "-ar",
            "16000",
            "-ac",
            "1",
            out_path,
        ]
        proc = await asyncio.to_thread(
            subprocess.run,
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=120,
        )
        if proc.returncode != 0 or not os.path.exists(out_path):
            err = proc.stderr.decode("utf-8", errors="replace")[:300]
            raise RuntimeError(f"FFmpeg audio extraction failed: {err}")

        with open(out_path, "rb") as f:
            return f.read()
