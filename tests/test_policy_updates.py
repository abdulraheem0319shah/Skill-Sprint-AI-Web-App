import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from backend.server import app

client = TestClient(app)

def test_policy_impact_analysis_endpoint():
    res = client.post("/api/policies/impact-analysis", json={
        "doc_code": "DOC-POL-001",
        "new_version": "2.0"
    })
    assert res.status_code == 200
    data = res.json()
    assert "total_affected_modules" in data
    assert "affected_employees_count" in data
    assert "recommendation" in data

def test_selective_regeneration_endpoint():
    res = client.post("/api/policies/selective-regenerate", json={
        "doc_code": "DOC-POL-001",
        "new_version": "2.0"
    })
    assert res.status_code == 200
    data = res.json()
    assert "updated_count" in data
