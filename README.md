# Lingua AI — Universal Multimodal Translation Platform

Translate anything. Understand everything.

## Features
- **Text Translation**: Debounced instant translation, Tamil script & Tanglish support, 6 styles (`Natural`, `Literal`, `Professional`, `Casual`, `Academic`, `Simplified`).
- **Image Translation**: OCR via Gemini Vision or Tesseract (`tam+eng`), zoom/rotate controls, 3 views (`Text`, `Side-by-Side`, `Overlay`).
- **Audio Translation**: Speech-to-text with timestamped segments, editable transcript, SRT/VTT/TXT export.
- **Document Translation**: Background job processing for PDF (with scanned-page OCR fallback), DOCX, PPTX, XLSX, TXT.
- **Video Translation**: FFmpeg audio extraction, transcription, and SRT/VTT subtitle generation.
- **Website Translation**: SSRF-protected article extraction and Medium-inspired reading view.
- **Live Translator**: Real-time WebSocket microphone translation.
- **History & Settings**: Searchable, filterable translation history, favorites, light/dark themes.

## Local Setup

### 1. Backend
```bash
cd lingua-ai/backend
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
pip install -r requirements.txt
# Copy .env.example to .env and add GEMINI_API_KEY (and/or OPENAI_API_KEY)
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd lingua-ai/frontend
npm install
npm run dev
```

Open `http://localhost:5173`.
