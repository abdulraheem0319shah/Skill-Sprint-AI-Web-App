import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from genai_pipeline.generator import genai_pipeline
from role_matrix.matrix_manager import matrix_manager

def test_genai_structured_plan_generation():
    emp = {
        "name": "Hamza Tariq",
        "role_name": "Sales Executive",
        "department": "Sales & Business Development",
        "experience_level": "Mid",
        "location": "Karachi HQ",
        "joining_date": "2026-09-20"
    }
    matrix = matrix_manager.get_matrix_for_role("Sales Executive")
    if not matrix:
        matrix = matrix_manager.get_all_requirements()[:5]
    
    docs = [{"doc_code": "DOC-POL-001", "version": "2.0", "title": "Conduct", "content": "Adhere to zero gifts."}]
    
    plan = genai_pipeline.generate_onboarding_plan(emp, matrix, docs)
    assert plan is not None
    assert plan["role"] == "Sales Executive"
    assert "modules" in plan
    assert len(plan["modules"]) > 0
    assert all("source_doc_code" in m for m in plan["modules"])
    assert all("tasks" in m for m in plan["modules"])
    assert all("stage" in m for m in plan["modules"])
