import asyncio
import io
import logging
from typing import List, Tuple

import fitz  # PyMuPDF
from docx import Document as DocxDocument
from pptx import Presentation
import openpyxl

from app.services.ocr.ocr_service import OCRService

logger = logging.getLogger(__name__)


class DocumentService:
    def __init__(self):
        self.ocr_service = OCRService()

    async def extract_text(self, file_bytes: bytes, filename: str) -> Tuple[str, int, List[str]]:
        """Returns (extracted_text, page_count, warnings)."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
        warnings: List[str] = []

        if ext == "txt":
            text = file_bytes.decode("utf-8", errors="replace")
            return text.strip(), 1, warnings

        if ext == "pdf":
            return await self._extract_pdf(file_bytes, warnings)

        if ext == "docx":
            text, count = await asyncio.to_thread(self._extract_docx, file_bytes)
            return text, count, warnings

        if ext == "pptx":
            text, count = await asyncio.to_thread(self._extract_pptx, file_bytes)
            return text, count, warnings

        if ext == "xlsx":
            text, count = await asyncio.to_thread(self._extract_xlsx, file_bytes)
            return text, count, warnings

        raise ValueError(f"Unsupported document format: .{ext}")

    async def _extract_pdf(self, file_bytes: bytes, warnings: List[str]) -> Tuple[str, int, List[str]]:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        page_count = len(doc)
        pages_text: List[str] = []
        ocr_pages = 0

        for idx, page in enumerate(doc):
            text = page.get_text("text").strip()
            if len(text) < 20:
                # Likely scanned page; render to PNG and run OCR
                try:
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    ocr_text, _, _ = await self.ocr_service.extract_text(img_bytes, "image/png")
                    text = ocr_text
                    ocr_pages += 1
                except Exception as exc:
                    logger.warning("PDF page %d OCR failed: %s", idx + 1, exc)
                    text = text or f"[Page {idx + 1}: Unable to extract text]"
            pages_text.append(f"--- Page {idx + 1} ---\n{text}")

        if ocr_pages > 0:
            warnings.append(f"Applied OCR to {ocr_pages} scanned PDF page(s).")

        return "\n\n".join(pages_text), page_count, warnings

    def _extract_docx(self, file_bytes: bytes) -> Tuple[str, int]:
        doc = DocxDocument(io.BytesIO(file_bytes))
        parts: List[str] = []
        for para in doc.paragraphs:
            if para.text.strip():
                parts.append(para.text.strip())
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    parts.append(row_text)
        return "\n\n".join(parts), max(1, len(parts) // 20 + 1)

    def _extract_pptx(self, file_bytes: bytes) -> Tuple[str, int]:
        prs = Presentation(io.BytesIO(file_bytes))
        slides_text: List[str] = []
        for idx, slide in enumerate(prs.slides):
            texts = []
            for shape in slide.shapes:
                if shape.has_text_frame:
                    t = shape.text_frame.text.strip()
                    if t:
                        texts.append(t)
            if texts:
                slides_text.append(f"--- Slide {idx + 1} ---\n" + "\n".join(texts))
        return "\n\n".join(slides_text), len(prs.slides)

    def _extract_xlsx(self, file_bytes: bytes) -> Tuple[str, int]:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=False)
        sheets_text: List[str] = []
        for name in wb.sheetnames:
            ws = wb[name]
            rows = []
            for row in ws.iter_rows(values_only=True):
                cells = [str(c) for c in row if c is not None and str(c).strip() and not str(c).startswith("=")]
                if cells:
                    rows.append(" | ".join(cells))
            if rows:
                sheets_text.append(f"--- Sheet: {name} ---\n" + "\n".join(rows))
        return "\n\n".join(sheets_text), len(wb.sheetnames)
