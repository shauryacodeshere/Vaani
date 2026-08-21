"""
L1 — Document Ingestion & Parsers.
Extracts clean, structured text from uploaded notice documents (PDF, DOCX, TXT, MD).
"""
from __future__ import annotations

import io
import re
from pathlib import Path
from app.schemas import SourceDocument


def clean_extracted_text(text: str) -> str:
    """Normalize whitespace and strip extraneous control characters."""
    text = re.sub(r"\r\n", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_title_from_text(text: str, default: str = "Official Notice Circular") -> str:
    """Extract first non-empty header/line as candidate title."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    if lines:
        first_line = lines[0]
        # Clean markdown headers
        first_line = re.sub(r"^#+\s*", "", first_line).strip()
        if len(first_line) > 100:
            first_line = first_line[:97] + "..."
        return first_line
    return default


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF (fitz) or pdfplumber."""
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text_pages = []
        for page in doc:
            text_pages.append(page.get_text())
        doc.close()
        combined = "\n\n".join(text_pages)
        if combined.strip():
            return clean_extracted_text(combined)
    except Exception:
        pass

    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [p.extract_text() or "" for p in pdf.pages]
            return clean_extracted_text("\n\n".join(pages))
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}")


def parse_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX document."""
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        # Also extract table text
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(c.text.strip() for c in row.cells if c.text.strip())
                if row_text:
                    paragraphs.append(row_text)
        return clean_extracted_text("\n\n".join(paragraphs))
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {e}")


def parse_file(file_bytes: bytes, filename: str, mime_type: str = "") -> SourceDocument:
    """
    Main parser entrypoint.
    Converts raw file bytes into a validated SourceDocument.
    """
    ext = Path(filename).suffix.lower()
    raw_text = ""

    if ext == ".pdf" or "pdf" in mime_type:
        raw_text = parse_pdf(file_bytes)
    elif ext in [".docx", ".doc"] or "word" in mime_type:
        raw_text = parse_docx(file_bytes)
    else:
        # Plain text / Markdown / CSV
        try:
            raw_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raw_text = file_bytes.decode("latin-1", errors="ignore")
        raw_text = clean_extracted_text(raw_text)

    if not raw_text or len(raw_text.strip()) < 10:
        raise ValueError(f"Extracted document text from '{filename}' is empty or too short.")

    title = extract_title_from_text(raw_text, default=Path(filename).stem.replace("_", " ").title())

    return SourceDocument(
        title=title,
        origin="upload",
        origin_ref=filename,
        raw_text=raw_text,
    )
