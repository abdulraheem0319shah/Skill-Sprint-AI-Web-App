import os
import re
import io
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
    import docx
except ImportError:
    docx = None

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

class DocumentParser:
    """
    Handles document ingestion, parsing, and traceability metadata extraction
    for policy documents (TXT, PDF, DOCX, MD, CSV).
    """

    def __init__(self, documents_dir: Optional[str] = None):
        self.documents_dir = Path(documents_dir) if documents_dir else None

    def parse_bytes(self, filename: str, file_bytes: bytes) -> Dict[str, Any]:
        """Parses in-memory bytes based on file extension."""
        path = Path(filename)
        ext = path.suffix.lower()

        if ext in {".txt", ".md", ".csv"}:
            content = file_bytes.decode("utf-8", errors="ignore")
            page_count = 1
        elif ext == ".pdf":
            content, page_count = self._parse_pdf_bytes(file_bytes)
        elif ext == ".docx":
            content, page_count = self._parse_docx_bytes(file_bytes)
        else:
            content = file_bytes.decode("utf-8", errors="ignore")
            page_count = 1

        meta = self._extract_metadata(filename, content)
        meta["page_count"] = page_count
        meta["file_size"] = len(file_bytes)
        meta["file_type"] = ext.replace(".", "")
        return meta

    def parse_file(self, file_path: Path) -> Dict[str, Any]:
        path = Path(file_path)
        with open(path, "rb") as f:
            bytes_data = f.read()
        return self.parse_bytes(path.name, bytes_data)

    def _parse_pdf_bytes(self, file_bytes: bytes) -> tuple[str, int]:
        content_pages = []
        if pypdf:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                for idx, page in enumerate(reader.pages, 1):
                    txt = page.extract_text() or ""
                    content_pages.append(f"[Page {idx}]\n{txt}")
                return "\n\n".join(content_pages), len(reader.pages)
            except Exception as e:
                print(f"pypdf error: {e}")

        if pdfplumber:
            try:
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    for idx, page in enumerate(pdf.pages, 1):
                        txt = page.extract_text() or ""
                        content_pages.append(f"[Page {idx}]\n{txt}")
                    return "\n\n".join(content_pages), len(pdf.pages)
            except Exception as e:
                print(f"pdfplumber error: {e}")

        return "[PDF text extraction fallback]", 1

    def _parse_docx_bytes(self, file_bytes: bytes) -> tuple[str, int]:
        if docx:
            try:
                doc = docx.Document(io.BytesIO(file_bytes))
                paragraphs = [p.text for p in doc.paragraphs if p.text]
                return "\n".join(paragraphs), max(1, len(paragraphs) // 10)
            except Exception as e:
                print(f"docx error: {e}")
        return "[DOCX text extraction fallback]", 1

    def _extract_metadata(self, filename: str, content: str) -> Dict[str, Any]:
        # Extract standard header tokens
        doc_id_match = re.search(r"Document\s*ID:\s*([A-Za-z0-9\-_]+)", content, re.IGNORECASE)
        version_match = re.search(r"Version:\s*([0-9\.]+)", content, re.IGNORECASE)
        section_match = re.search(r"Section:\s*([^\n\r]+)", content, re.IGNORECASE)
        title_match = re.search(r"Title:\s*([^\n\r]+)", content, re.IGNORECASE)
        category_match = re.search(r"Category:\s*([^\n\r]+)", content, re.IGNORECASE)
        date_match = re.search(r"Effective\s*Date:\s*([^\n\r]+)", content, re.IGNORECASE)

        stem = Path(filename).stem
        doc_id = doc_id_match.group(1) if doc_id_match else (stem.split("_")[0] if "_" in stem else stem)
        
        # Version heuristics
        if version_match:
            version = version_match.group(1).strip()
        elif "v2.0" in filename.lower() or "v2" in filename.lower():
            version = "2.0"
        elif "v1.0" in filename.lower() or "v1" in filename.lower():
            version = "1.0"
        else:
            version = "1.0"

        section = section_match.group(1).strip() if section_match else "General"
        
        # Title heuristics
        if title_match:
            title = title_match.group(1).strip()
        else:
            title = stem.replace("DOC-", "").replace("_", " ").title()

        # Category heuristics
        if category_match:
            category = category_match.group(1).strip()
        elif "adv" in filename.lower() or "injection" in filename.lower():
            category = "Adversarial"
        elif "conflict" in filename.lower():
            category = "Conflict"
        elif "employee process" in filename.lower() or "employee-process" in filename.lower() or "employee_process" in filename.lower():
            category = "Employee Process"
        elif "role" in filename.lower() or "responsibility" in filename.lower() or "job" in filename.lower():
            category = "Role"
        elif "pol" in filename.lower() or "policy" in filename.lower():
            category = "Policy"
        elif "sop" in filename.lower():
            category = "SOP"
        elif "hbk" in filename.lower() or "handbook" in filename.lower():
            category = "Handbook"
        elif "faq" in filename.lower():
            category = "FAQ"
        else:
            category = "Compliance"

        effective_date = date_match.group(1).strip() if date_match else "2026-01-01"

        return {
            "file_name": filename,
            "doc_id": doc_id,
            "title": title,
            "category": category,
            "version": version,
            "section": section,
            "effective_date": effective_date,
            "content": content
        }

    def chunk_document(self, parsed_doc: Dict[str, Any], max_chunk_chars: int = 1500) -> List[Dict[str, Any]]:
        """
        Divides document content into traceable chunks preserving section headers and location tokens.
        """
        content = parsed_doc.get("content", "")
        chunks = []
        raw_sections = [s.strip() for s in re.split(r"\n\s*\n|(?=Section\s+\d+:)", content) if s.strip()]

        chunk_idx = 1
        for sec in raw_sections:
            sec_header_match = re.search(r"^(Section\s+[^:\n]+):?", sec, re.IGNORECASE)
            sec_name = sec_header_match.group(1).strip() if sec_header_match else parsed_doc.get("section", "General")
            
            # Split large sections into smaller chunks if necessary
            if len(sec) > max_chunk_chars:
                sub_parts = [sec[i:i + max_chunk_chars] for i in range(0, len(sec), max_chunk_chars)]
                for part in sub_parts:
                    chunks.append({
                        "chunk_id": f"{parsed_doc['doc_id']}_C{chunk_idx:02d}",
                        "doc_id": parsed_doc["doc_id"],
                        "file_name": parsed_doc.get("file_name", ""),
                        "version": parsed_doc.get("version", "1.0"),
                        "section": sec_name,
                        "content": part.strip(),
                        "chunk_index": chunk_idx
                    })
                    chunk_idx += 1
            else:
                chunks.append({
                    "chunk_id": f"{parsed_doc['doc_id']}_C{chunk_idx:02d}",
                    "doc_id": parsed_doc["doc_id"],
                    "file_name": parsed_doc.get("file_name", ""),
                    "version": parsed_doc.get("version", "1.0"),
                    "section": sec_name,
                    "content": sec.strip(),
                    "chunk_index": chunk_idx
                })
                chunk_idx += 1

        return chunks

    def load_and_parse_all(self) -> List[Dict[str, Any]]:
        if not self.documents_dir or not self.documents_dir.exists():
            return []
        parsed = []
        for ext in ["*.txt", "*.pdf", "*.docx", "*.md"]:
            for p in sorted(self.documents_dir.glob(ext)):
                try:
                    parsed.append(self.parse_file(p))
                except Exception as e:
                    print(f"Error reading {p}: {e}")
        return parsed

document_parser = DocumentParser()
