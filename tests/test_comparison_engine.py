import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from comparison_engine.compare import comparison_engine

def test_comparison_engine_multi_role_report():
    report = comparison_engine.generate_multi_role_report()
    assert "total_roles_evaluated" in report
    assert report["total_roles_evaluated"] >= 5
    assert report["total_requirement_items"] >= 50
    assert len(report["role_reports"]) > 0
    
    first_role = report["role_reports"][0]
    assert "comparison_rows" in first_role
    assert len(first_role["comparison_rows"]) > 0
    assert all("match_status" in row for row in first_role["comparison_rows"])
