import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from python_validation.validator import python_validator

def test_independent_python_validation(monkeypatch):
    monkeypatch.setattr(
        python_validator,
        "get_active_docs",
        lambda: {
            "DOC-POL-001": {
                "status": "active",
                "version": "2.0",
                "content": "Company culture core values ethics and integrity.",
            },
            "DOC-POL-002": {
                "status": "active",
                "version": "2.0",
                "content": "Information security policy mandates MFA setup.",
            },
        },
    )

    # Test valid grounded plan
    mock_plan = {
        "role": "Software Support Engineer",
        "modules": [
            {
                "module_code": "MOD-01",
                "title": "Company Culture & Core Values Orientation",
                "purpose": "Ethics and core values orientation",
                "source_doc_code": "DOC-POL-001",
                "source_section": "Section 1",
                "stage": "Day 1",
                "duration": "45 min",
                "is_mandatory": True
            },
            {
                "module_code": "MOD-02",
                "title": "Information Security & MFA Enforcement v2.0",
                "purpose": "Mandatory MFA setup",
                "source_doc_code": "DOC-POL-002",
                "source_section": "Section 1",
                "stage": "Day 1",
                "duration": "45 min",
                "is_mandatory": True
            }
        ]
    }

    result = python_validator.validate_plan(mock_plan)
    assert "coverage_score" in result
    assert "traceability_score" in result
    assert "status" in result
    assert result["total_required_mandatory"] >= 1
    assert result["traceability_score"] > 0
