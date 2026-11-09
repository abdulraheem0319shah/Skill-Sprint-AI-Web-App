import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from contradiction_checks.detector import contradiction_detector

def test_contradiction_detection():
    conflicting_text = "Employees on travel can claim $30 meal cap without receipts, and junior devs may bypass MFA on VPN."
    conflicts = contradiction_detector.check_text_for_contradictions(conflicting_text)
    assert len(conflicts) >= 2
    assert any("CONF-001" in c["conflict_id"] for c in conflicts)
    assert any("CONF-002" in c["conflict_id"] for c in conflicts)

def test_precedence_resolution():
    doc_policy_v2 = {"doc_code": "DOC-POL-006", "version": "2.0", "category": "Corporate Policy"}
    doc_policy_v1 = {"doc_code": "DOC-POL-006", "version": "1.0", "category": "Corporate Policy"}
    res_ver = contradiction_detector.resolve_precedence(doc_policy_v2, doc_policy_v1)
    assert res_ver["winner"]["version"] == "2.0"

    doc_sop = {"doc_code": "DOC-SOP-001", "version": "1.0", "category": "SOP"}
    doc_faq = {"doc_code": "DOC-FAQ-001", "version": "1.0", "category": "FAQ"}
    res_cat = contradiction_detector.resolve_precedence(doc_sop, doc_faq)
    assert res_cat["winner"]["category"] == "SOP"
