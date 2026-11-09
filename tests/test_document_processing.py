import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from document_processing.parser import document_parser
from document_processing.chunker import document_chunker
from document_validation.validator import document_validator

def test_document_parsing_txt():
    sample_text = b"""Document ID: DOC-TEST-001\nTitle: Safety Protocol\nCategory: Policy\nVersion: 2.0\nSection: Section 1\n\nAll staff must wear PPE."""
    parsed = document_parser.parse_bytes("DOC-TEST-001.txt", sample_text)
    assert parsed["doc_id"] == "DOC-TEST-001"
    assert parsed["version"] == "2.0"
    assert parsed["category"] == "Policy"
    assert "PPE" in parsed["content"]

def test_document_parsing_process_categories():
    process_text = b"""Document ID: DOC-PROC-001\nTitle: Employee Offboarding Process\nCategory: Employee Process\nVersion: 1.0\nSection: Section 1\n\nManagers must complete offboarding steps before final day."""
    parsed = document_parser.parse_bytes("DOC-PROC-001.txt", process_text)
    assert parsed["category"] == "Employee Process"

    generic_process = b"""Document ID: DOC-PROC-002\nTitle: Expense Approval Process\nCategory: Process\nVersion: 2.0\nSection: Section 2\n\nApproval must be completed before reimbursement."""
    parsed2 = document_parser.parse_bytes("DOC-PROC-002.txt", generic_process)
    assert parsed2["category"] == "Process"

def test_document_chunking():
    sample_doc = {
        "doc_id": "DOC-TEST-001",
        "version": "2.0",
        "section": "Section 1",
        "file_name": "test.txt",
        "content": "Section 1: Safety\nAll staff must wear safety boots.\n\nSection 2: Evacuation\nGather at Assembly Point B in case of fire."
    }
    chunks = document_chunker.chunk(sample_doc)
    assert len(chunks) >= 1
    assert all("chunk_id" in c for c in chunks)
    assert all("section" in c for c in chunks)

def test_document_validation_rules():
    valid, msg, meta = document_validator.validate_file_upload("valid.pdf", b"%PDF-1.4 dummy content")
    assert valid is True
    
    invalid_ext, msg2, _ = document_validator.validate_file_upload("malicious.exe", b"binary")
    assert invalid_ext is False
    assert "Unsupported file type" in msg2

    empty_val, msg3, _ = document_validator.validate_file_upload("empty.txt", b"")
    assert empty_val is False
    assert "empty" in msg3
