import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from role_matrix.extractor import requirement_extractor

def test_extract_mandatory_and_optional_requirements():
    text = """Section 1 - Workstation Access
    All employees must configure Multi-Factor Authentication on Day 1.
    Employees may optionally install the company calendar widget on personal phones.
    Employees shall report security anomalies within 15 minutes.
    """
    reqs = requirement_extractor.extract_from_text(text, "DOC-POL-002", "2.0")
    assert len(reqs) >= 2
    mandatory_items = [r for r in reqs if r["is_mandatory"]]
    optional_items = [r for r in reqs if not r["is_mandatory"]]
    
    assert len(mandatory_items) >= 2
    assert len(optional_items) >= 1
    assert any(r["due_stage"] == "Day 1" for r in reqs)
