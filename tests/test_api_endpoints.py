import sys
from pathlib import Path
from uuid import uuid4

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from backend.server import app
from database.db import get_db

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_login():
    res = client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert data["user"]["role"] == "admin"

def test_role_specific_login_portal():
    employee_login = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
        "portal": "employee",
    })
    assert employee_login.status_code == 403

    admin_login = client.post("/api/auth/login", json={
        "username": "admin",
        "password": "admin123",
        "portal": "admin",
    })
    assert admin_login.status_code == 200
    assert admin_login.json()["user"]["role"] == "admin"

def test_employee_registration_roles_are_available():
    response = client.get("/api/auth/employee-roles")
    assert response.status_code == 200
    roles = response.json()["roles"]
    assert len(roles) >= 10
    assert all({"id", "role_name", "department"} <= role.keys() for role in roles)

def test_employee_registration_persists_account_and_allows_login():
    email = f"new-employee-{uuid4().hex}@example.com"
    try:
        roles_response = client.get("/api/auth/employee-roles")
        assert roles_response.status_code == 200
        role = roles_response.json()["roles"][0]

        registration = client.post("/api/auth/register-employee", json={
            "name": "New Test Employee",
            "email": email,
            "password": "strong-test-password",
            "role_id": role["id"],
            "experience_level": "Junior",
            "location": "Remote",
        })
        assert registration.status_code == 201

        conn = get_db()
        saved_user = conn.execute(
            "SELECT id, role FROM users WHERE email = ?", (email,)
        ).fetchone()
        saved_employee = conn.execute(
            "SELECT user_id, role_name FROM employees WHERE email = ?", (email,)
        ).fetchone()
        conn.close()
        assert saved_user["role"] == "employee"
        assert saved_employee["user_id"] == saved_user["id"]
        assert saved_employee["role_name"] == role["role_name"]

        login = client.post("/api/auth/login", json={
            "username": email,
            "password": "strong-test-password",
            "portal": "employee",
        })
        assert login.status_code == 200
        assert login.json()["user"]["email"] == email
        assert login.json()["user"]["employee_id"] == registration.json()["employee_id"]

        staff_login = client.post("/api/auth/login", json={
            "username": email,
            "password": "strong-test-password",
            "portal": "admin",
        })
        assert staff_login.status_code == 403
    finally:
        conn = get_db()
        conn.execute("DELETE FROM employees WHERE email = ?", (email,))
        conn.execute("DELETE FROM users WHERE email = ?", (email,))
        conn.close()

def test_list_roles():
    res = client.get("/api/roles")
    assert res.status_code == 200
    data = res.json()
    assert len(data["roles"]) >= 10

def test_get_matrix():
    res = client.get("/api/matrix")
    assert res.status_code == 200
    data = res.json()
    assert len(data["matrix"]) >= 50

def test_generate_and_validate_plan():
    res = client.post("/api/plans/generate", json={
        "employee_id": 1,
        "role_name": "Software Support Engineer"
    })
    assert res.status_code == 200
    data = res.json()
    assert "plan_id" in data
    assert "validation" in data
    assert data["validation"]["coverage_score"] > 0

def test_comparison_report():
    res = client.get("/api/comparison/multi-role")
    assert res.status_code == 200
    data = res.json()
    assert "total_roles_evaluated" in data
    assert data["total_requirement_items"] >= 50

def test_review_action_audit():
    res = client.post("/api/reviews/1/action", json={
        "review_id": 1,
        "action": "override",
        "reviewer_username": "reviewer",
        "override_reason": "Verified under updated Q3 budget exception.",
        "comment": "Approved by committee."
    })
    assert res.status_code == 200

    audit_res = client.get("/api/audit")
    assert audit_res.status_code == 200
    logs = audit_res.json()["audit_trail"]
    assert any(log["action_type"] == "REVIEW_ACTION" for log in logs)
