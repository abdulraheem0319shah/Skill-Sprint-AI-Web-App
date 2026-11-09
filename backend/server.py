import sys
import os
import json
import time
import io
import re
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, Any, List, Optional

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, Response

from config.settings import settings
from database.db import get_db, dict_from_row, dicts_from_rows, init_db
from security.rbac import hash_password, verify_password, has_permission
from security.injection_detector import injection_detector
from document_validation.validator import document_validator
from document_processing.parser import document_parser
from document_processing.chunker import document_chunker
from role_matrix.matrix_manager import matrix_manager
from role_matrix.extractor import requirement_extractor
from contradiction_checks.detector import contradiction_detector
from hallucination_checks.verifier import hallucination_checker
from python_validation.validator import python_validator
from prompt_templates.templates import SYSTEM_PROMPT_ONBOARDING, USER_PROMPT_ONBOARDING
from comparison_engine.compare import comparison_engine
from genai_pipeline.generator import genai_pipeline
from schemas.models import (
    RoleModel, EmployeeModel, RoleRequirementItem,
    ReviewAction, StructuredPlanOutput, EmployeeRegistration
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    conn = get_db()
    try:
        cursor = conn.cursor()
        doc_count = cursor.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        user_count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        role_count = cursor.execute("SELECT COUNT(*) FROM roles").fetchone()[0]
    finally:
        conn.close()

    if doc_count == 0 or user_count == 0 or role_count == 0:
        from database.seed_data import seed_database
        seed_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SkillSprint AI - Enterprise Onboarding Intelligence Platform",
    lifespan=lifespan,
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# AUDIT HELPER
# -------------------------------------------------------------
def log_audit(action: str, entity_type: str, entity_id: str, username: str = "system", details: Any = None):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO audit_trail (action_type, entity_type, entity_id, username, details_json)
            VALUES (?, ?, ?, ?, ?)
        """, (action, entity_type, str(entity_id), username, json.dumps(details or {})))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Audit Log Error]: {e}")

# -------------------------------------------------------------
# 1. AUTHENTICATION ENDPOINTS
# -------------------------------------------------------------
@app.post("/api/auth/login")
def login(payload: Dict[str, str]):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "")
    portal = payload.get("portal", "staff")
    portal_roles = {
        "employee": {"employee"},
        "admin": {"admin"},
        "manager": {"training_manager"},
        "reviewer": {"reviewer"},
        "staff": {"admin", "training_manager", "reviewer"},
    }
    if portal not in portal_roles:
        raise HTTPException(status_code=400, detail="Invalid sign-in portal.")

    conn = get_db()
    cursor = conn.cursor()
    try:
        row = cursor.execute(
            "SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?",
            (username, username),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Invalid email/username or password.")

        user = dict_from_row(row)
        if not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email/username or password.")

        if user["role"] not in portal_roles[portal]:
            raise HTTPException(
                status_code=403,
                detail=f"This account cannot use the {portal} sign-in portal.",
            )

        if not user["password_hash"].startswith("pbkdf2_sha256$"):
            cursor.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (hash_password(password), user["id"]),
            )
        employee = cursor.execute(
            """
            SELECT id FROM employees
            WHERE user_id = ? OR lower(email) = ?
            ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END
            LIMIT 1
            """,
            (user["id"], user["email"].lower(), user["id"]),
        ).fetchone()
    finally:
        conn.close()

    log_audit("USER_LOGIN", "users", user["id"], username=username, details={"role": user["role"]})

    return {
        "token": f"bearer_{user['id']}_{int(time.time())}",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "department": user["department"],
            "avatar": user["avatar"],
            "employee_id": employee["id"] if employee else None,
        }
    }

@app.get("/api/auth/employee-roles")
def get_employee_registration_roles():
    conn = get_db()
    try:
        rows = conn.execute(
            "SELECT id, role_name, department FROM roles ORDER BY role_name"
        ).fetchall()
        if not rows:
            raise HTTPException(
                status_code=503,
                detail="No job roles are configured. Please contact an administrator.",
            )
        return {"roles": dicts_from_rows(rows)}
    finally:
        conn.close()

@app.post("/api/auth/register-employee", status_code=201)
def register_employee(payload: EmployeeRegistration):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required.")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(status_code=422, detail="Enter a valid email address.")

    conn = get_db()
    try:
        conn.execute("BEGIN IMMEDIATE")
        role = conn.execute(
            "SELECT id, role_name, department FROM roles WHERE id = ?",
            (payload.role_id,),
        ).fetchone()
        if not role:
            raise HTTPException(status_code=422, detail="Select a valid job role.")

        existing = conn.execute(
            "SELECT 1 FROM users WHERE lower(email) = ? OR lower(username) = ?",
            (email, email),
        ).fetchone()
        if existing or conn.execute(
            "SELECT 1 FROM employees WHERE lower(email) = ?", (email,)
        ).fetchone():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        avatar = "".join(part[0] for part in name.split()[:2]).upper()
        cursor = conn.execute(
            """
            INSERT INTO users (username, name, email, password_hash, role, department, avatar)
            VALUES (?, ?, ?, ?, 'employee', ?, ?)
            """,
            (email, name, email, hash_password(payload.password), role["department"], avatar),
        )
        user_id = cursor.lastrowid
        employee_code = f"EMP-{secrets.token_hex(6).upper()}"
        employee_cursor = conn.execute(
            """
            INSERT INTO employees (
                employee_code, user_id, name, email, role_id, role_name, department,
                experience_level, location, joining_date, training_status, plan_progress
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Not Started', 0)
            """,
            (
                employee_code,
                user_id,
                name,
                email,
                role["id"],
                role["role_name"],
                role["department"],
                payload.experience_level.strip(),
                payload.location.strip(),
                time.strftime("%Y-%m-%d"),
            ),
        )
        conn.commit()
        return {
            "message": "Employee account created. You can now sign in.",
            "employee_id": employee_cursor.lastrowid,
            "username": email,
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

@app.get("/api/auth/users")
def list_users():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT id, username, name, email, role, department, avatar, created_at FROM users").fetchall()
    conn.close()
    return {"users": dicts_from_rows(rows)}

# -------------------------------------------------------------
# 2. DASHBOARD & SYSTEM STATS
# -------------------------------------------------------------
@app.get("/api/stats/dashboard")
def get_dashboard_stats():
    conn = get_db()
    cursor = conn.cursor()

    total_docs = cursor.execute("SELECT COUNT(*) as c FROM documents").fetchone()["c"]
    active_docs = cursor.execute("SELECT COUNT(*) as c FROM documents WHERE status = 'active'").fetchone()["c"]
    total_roles = cursor.execute("SELECT COUNT(*) as c FROM roles").fetchone()["c"]
    total_employees = cursor.execute("SELECT COUNT(*) as c FROM employees").fetchone()["c"]
    total_plans = cursor.execute("SELECT COUNT(*) as c FROM onboarding_plans").fetchone()["c"]
    verified_plans = cursor.execute("SELECT COUNT(*) as c FROM onboarding_plans WHERE status IN ('verified', 'approved')").fetchone()["c"]
    pending_reviews = cursor.execute("SELECT COUNT(*) as c FROM manual_reviews WHERE status = 'pending'").fetchone()["c"]
    total_reqs = cursor.execute("SELECT COUNT(*) as c FROM role_requirement_matrix").fetchone()["c"]
    mandatory_reqs = cursor.execute("SELECT COUNT(*) as c FROM role_requirement_matrix WHERE is_mandatory = 1").fetchone()["c"]

    # Avg coverage score (calculated directly from actual database records, 0.0 if no records)
    avg_cov_row = cursor.execute("SELECT AVG(coverage_score) as a FROM onboarding_plans").fetchone()["a"]
    avg_cov = round(avg_cov_row, 1) if avg_cov_row is not None else 0.0

    avg_trace_row = cursor.execute("SELECT AVG(traceability_score) as a FROM onboarding_plans").fetchone()["a"]
    avg_trace = round(avg_trace_row, 1) if avg_trace_row is not None else 0.0

    # Recent plans
    recent_plans = cursor.execute("""
        SELECT p.id, p.plan_code, p.role_name, p.status, p.coverage_score, p.traceability_score, p.created_at, e.name as employee_name
        FROM onboarding_plans p
        LEFT JOIN employees e ON p.employee_id = e.id
        ORDER BY p.id DESC LIMIT 5
    """).fetchall()

    # Recent reviews
    recent_reviews = cursor.execute("""
        SELECT id, review_code, employee_name, role_name, risk_flag, flag_reason, status, created_at
        FROM manual_reviews
        ORDER BY id DESC LIMIT 5
    """).fetchall()

    conn.close()

    return {
        "stats": {
            "total_documents": total_docs,
            "active_documents": active_docs,
            "total_roles": total_roles,
            "total_employees": total_employees,
            "total_plans": total_plans,
            "verified_plans": verified_plans,
            "pending_reviews": pending_reviews,
            "total_matrix_requirements": total_reqs,
            "mandatory_requirements": mandatory_reqs,
            "average_coverage_score": round(avg_cov, 1),
            "average_traceability_score": round(avg_trace, 1)
        },
        "recent_plans": dicts_from_rows(recent_plans),
        "recent_reviews": dicts_from_rows(recent_reviews)
    }

# -------------------------------------------------------------
# 3. DOCUMENTS MANAGEMENT ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/documents")
def get_documents(category: Optional[str] = None, status: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM documents WHERE 1=1"
    params = []
    if category:
        query += " AND category = ?"
        params.append(category)
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY id DESC"
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    return {"documents": dicts_from_rows(rows)}

@app.get("/api/documents/{doc_id}")
def get_document_details(doc_id: int):
    conn = get_db()
    cursor = conn.cursor()
    doc_row = cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not doc_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc = dict_from_row(doc_row)
    chunks = cursor.execute("SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC", (doc_id,)).fetchall()
    conn.close()

    # Extract requirements preview
    extracted = requirement_extractor.extract_from_text(doc.get("content", ""), doc.get("doc_code", ""), doc.get("version", "1.0"))
    
    # Scan for adversarial patterns
    is_adv, threats = injection_detector.scan_text(doc.get("content", ""), source_name=doc.get("doc_code"))

    return {
        "document": doc,
        "chunks": dicts_from_rows(chunks),
        "extracted_requirements": extracted,
        "security_scan": {
            "has_threats": is_adv,
            "threat_count": len(threats),
            "threats": threats
        }
    }

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    uploaded_by: Optional[int] = Form(1)
):
    contents = await file.read()
    
    # 1. Validate file
    conn = get_db()
    cursor = conn.cursor()
    existing_hashes = {r["content"] for r in cursor.execute("SELECT content FROM documents").fetchall()}

    valid, msg, file_meta = document_validator.validate_file_upload(file.filename, contents)
    if not valid:
        conn.close()
        raise HTTPException(status_code=400, detail=msg)

    # 2. Parse text & metadata
    parsed = document_parser.parse_bytes(file.filename, contents)
    if category:
        parsed["category"] = category
    if version:
        parsed["version"] = version

    # 3. Adversarial prompt injection scan
    has_threats, threats = injection_detector.scan_text(parsed["content"], source_name=parsed["doc_id"])
    initial_status = "quarantined" if (has_threats and parsed["category"] != "Adversarial") else "active"

    # 4. Save document in DB
    cursor.execute("""
        INSERT INTO documents (doc_code, file_name, title, category, version, status, file_type, file_size, content, uploaded_by, effective_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        parsed["doc_id"],
        file.filename,
        parsed["title"],
        parsed["category"],
        parsed["version"],
        initial_status,
        parsed["file_type"],
        len(contents),
        parsed["content"],
        uploaded_by,
        parsed.get("effective_date", "2026-01-01")
    ))
    doc_id = cursor.lastrowid

    # 5. Chunk document & save chunks
    chunks = document_parser.chunk_document(parsed)
    for c in chunks:
        cursor.execute("""
            INSERT INTO document_chunks (chunk_id, document_id, doc_code, version, section, content, chunk_index)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (c["chunk_id"], doc_id, c["doc_id"], c["version"], c["section"], c["content"], c["chunk_index"]))

    conn.commit()
    conn.close()

    log_audit("DOCUMENT_UPLOAD", "documents", str(doc_id), details={"filename": file.filename, "status": initial_status, "threats": len(threats)})

    return {
        "message": f"Document '{file.filename}' processed and stored successfully.",
        "document_id": doc_id,
        "doc_code": parsed["doc_id"],
        "version": parsed["version"],
        "category": parsed["category"],
        "chunks_created": len(chunks),
        "status": initial_status,
        "adversarial_threats_detected": len(threats)
    }

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    log_audit("DOCUMENT_DELETE", "documents", str(doc_id))
    return {"message": "Document deleted successfully."}

@app.put("/api/documents/{doc_id}")
def update_document(doc_id: int, payload: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    doc = cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    title = payload.get("title", doc["title"])
    category = payload.get("category", doc["category"])
    version = payload.get("version", doc["version"])
    status = payload.get("status", doc["status"])
    effective_date = payload.get("effective_date", doc["effective_date"])

    cursor.execute("""
        UPDATE documents 
        SET title = ?, category = ?, version = ?, status = ?, effective_date = ?
        WHERE id = ?
    """, (title, category, version, status, effective_date, doc_id))
    conn.commit()
    conn.close()
    log_audit("DOCUMENT_UPDATE", "documents", str(doc_id), details={"title": title, "version": version, "status": status})
    return {"message": "Document updated successfully."}

@app.post("/api/documents/{doc_id}/extract-requirements")
def extract_document_requirements(doc_id: int, save_to_matrix: bool = Query(False), target_role: Optional[str] = Query(None)):
    conn = get_db()
    cursor = conn.cursor()
    doc = cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not doc:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_dict = dict_from_row(doc)
    extracted = requirement_extractor.extract_from_text(doc_dict.get("content", ""), doc_dict.get("doc_code", "DOC"), doc_dict.get("version", "1.0"))
    
    saved_count = 0
    if save_to_matrix and extracted:
        # Determine target role
        role_name = target_role or "Software Support Engineer"
        role_row = cursor.execute("SELECT id, role_name FROM roles WHERE role_name = ?", (role_name,)).fetchone()
        role_id = role_row["id"] if role_row else 1
        
        for item in extracted:
            existing = cursor.execute("SELECT id FROM role_requirement_matrix WHERE req_code = ?", (item["req_code"],)).fetchone()
            if not existing:
                cursor.execute("""
                    INSERT INTO role_requirement_matrix (req_code, role_id, role_name, policy_requirement, competency, is_mandatory, priority, source_doc_code, source_section, due_stage, assessment_topic)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item["req_code"],
                    role_id,
                    role_name,
                    item["policy_requirement"],
                    f"{doc_dict.get('category', 'General')} Compliance",
                    1 if item["is_mandatory"] else 0,
                    item["priority"],
                    item["source_doc_code"],
                    item["source_section"],
                    item["due_stage"],
                    f"Understanding of {doc_dict.get('title', 'Policy')}"
                ))
                saved_count += 1
        conn.commit()

    conn.close()
    return {
        "doc_code": doc_dict["doc_code"],
        "extracted_count": len(extracted),
        "saved_to_matrix_count": saved_count,
        "extracted_requirements": extracted
    }

@app.put("/api/documents/{doc_id}/status")
def update_document_status(doc_id: int, payload: Dict[str, str]):
    new_status = payload.get("status", "active")
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE documents SET status = ? WHERE id = ?", (new_status, doc_id))
    conn.commit()
    conn.close()
    log_audit("DOCUMENT_STATUS_UPDATE", "documents", str(doc_id), details={"new_status": new_status})
    return {"message": f"Document status updated to {new_status}."}

# -------------------------------------------------------------
# 4. ROLES & REQUIREMENT MATRIX ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/roles")
def list_roles():
    conn = get_db()
    cursor = conn.cursor()
    roles = cursor.execute("SELECT * FROM roles ORDER BY id ASC").fetchall()
    conn.close()
    return {"roles": dicts_from_rows(roles)}

@app.post("/api/roles")
def create_role(role: RoleModel):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO roles (role_code, role_name, department, description, clearance_level, conflict_precedence_rules, adversarial_protection)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (role.role_code, role.role_name, role.department, role.description, role.clearance_level, role.conflict_precedence_rules, role.adversarial_protection))
    conn.commit()
    role_id = cursor.lastrowid
    conn.close()
    log_audit("ROLE_CREATE", "roles", str(role_id), details={"role_name": role.role_name})
    return {"message": "Role created successfully.", "role_id": role_id}

@app.put("/api/roles/{role_id}")
def update_role(role_id: int, role: RoleModel):
    conn = get_db()
    cursor = conn.cursor()
    existing = cursor.execute("SELECT * FROM roles WHERE id = ?", (role_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Role not found")

    cursor.execute("""
        UPDATE roles 
        SET role_code = ?, role_name = ?, department = ?, description = ?, clearance_level = ?, conflict_precedence_rules = ?, adversarial_protection = ?
        WHERE id = ?
    """, (role.role_code, role.role_name, role.department, role.description, role.clearance_level, role.conflict_precedence_rules, role.adversarial_protection, role_id))
    conn.commit()
    conn.close()
    log_audit("ROLE_UPDATE", "roles", str(role_id), details={"role_name": role.role_name})
    return {"message": "Role updated successfully."}

@app.delete("/api/roles/{role_id}")
def delete_role(role_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM roles WHERE id = ?", (role_id,))
    conn.commit()
    conn.close()
    log_audit("ROLE_DELETE", "roles", str(role_id))
    return {"message": "Role deleted successfully."}

@app.get("/api/matrix")
def get_matrix(role_name: Optional[str] = None, is_mandatory: Optional[int] = None, due_stage: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM role_requirement_matrix WHERE 1=1"
    params = []
    if role_name:
        query += " AND role_name = ?"
        params.append(role_name)
    if is_mandatory is not None:
        query += " AND is_mandatory = ?"
        params.append(is_mandatory)
    if due_stage:
        query += " AND due_stage = ?"
        params.append(due_stage)
    query += " ORDER BY role_name, id ASC"
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    return {"matrix": dicts_from_rows(rows)}

@app.post("/api/matrix")
def add_matrix_requirement(item: RoleRequirementItem):
    req_id = matrix_manager.add_requirement(item.model_dump())
    log_audit("MATRIX_ADD_REQ", "role_requirement_matrix", str(req_id), details={"req_code": item.req_code})
    return {"message": "Requirement added successfully.", "req_id": req_id}

@app.put("/api/matrix/{req_id}")
def update_matrix_requirement(req_id: int, item: RoleRequirementItem):
    success = matrix_manager.update_requirement(req_id, item.model_dump())
    if not success:
        raise HTTPException(status_code=404, detail="Requirement not found")
    log_audit("MATRIX_UPDATE_REQ", "role_requirement_matrix", str(req_id))
    return {"message": "Requirement updated successfully."}

@app.delete("/api/matrix/{req_id}")
def delete_matrix_requirement(req_id: int):
    success = matrix_manager.delete_requirement(req_id)
    if not success:
        raise HTTPException(status_code=404, detail="Requirement not found")
    log_audit("MATRIX_DELETE_REQ", "role_requirement_matrix", str(req_id))
    return {"message": "Requirement deleted successfully."}

# -------------------------------------------------------------
# 5. EMPLOYEES ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/employees")
def list_employees():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM employees ORDER BY id ASC").fetchall()
    conn.close()
    return {"employees": dicts_from_rows(rows)}

@app.get("/api/employees/{emp_id}")
def get_employee(emp_id: int):
    conn = get_db()
    cursor = conn.cursor()
    emp_row = cursor.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
    if not emp_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")
    
    emp = dict_from_row(emp_row)
    plan_row = cursor.execute("SELECT * FROM onboarding_plans WHERE employee_id = ? ORDER BY id DESC LIMIT 1", (emp_id,)).fetchone()
    progress_row = cursor.execute("SELECT * FROM progress_tracking WHERE employee_id = ?", (emp_id,)).fetchone()
    conn.close()

    return {
        "employee": emp,
        "active_plan": dict_from_row(plan_row),
        "progress": dict_from_row(progress_row)
    }

@app.post("/api/employees")
def create_employee(emp: EmployeeModel):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO employees (employee_code, name, email, role_id, role_name, department, experience_level, location, joining_date, reporting_manager, training_status, plan_progress)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (emp.employee_code, emp.name, emp.email, emp.role_id, emp.role_name, emp.department, emp.experience_level, emp.location, emp.joining_date, emp.reporting_manager, emp.training_status, emp.plan_progress))
    emp_id = cursor.lastrowid

    # Create initial progress record
    cursor.execute("""
        INSERT OR IGNORE INTO progress_tracking (employee_id, status_label)
        VALUES (?, 'On Track')
    """, (emp_id,))

    conn.commit()
    conn.close()
    log_audit("EMPLOYEE_CREATE", "employees", str(emp_id), details={"name": emp.name, "role": emp.role_name})
    return {"message": "Employee created successfully.", "employee_id": emp_id}

@app.put("/api/employees/{emp_id}")
def update_employee(emp_id: int, emp: EmployeeModel):
    conn = get_db()
    cursor = conn.cursor()
    existing = cursor.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Employee not found")

    cursor.execute("""
        UPDATE employees 
        SET employee_code = ?, name = ?, email = ?, role_id = ?, role_name = ?, department = ?, experience_level = ?, location = ?, joining_date = ?, reporting_manager = ?, training_status = ?, plan_progress = ?
        WHERE id = ?
    """, (emp.employee_code, emp.name, emp.email, emp.role_id, emp.role_name, emp.department, emp.experience_level, emp.location, emp.joining_date, emp.reporting_manager, emp.training_status, emp.plan_progress, emp_id))
    conn.commit()
    conn.close()
    log_audit("EMPLOYEE_UPDATE", "employees", str(emp_id), details={"name": emp.name, "role": emp.role_name})
    return {"message": "Employee updated successfully."}

@app.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM employees WHERE id = ?", (emp_id,))
    cursor.execute("DELETE FROM progress_tracking WHERE employee_id = ?", (emp_id,))
    conn.commit()
    conn.close()
    log_audit("EMPLOYEE_DELETE", "employees", str(emp_id))
    return {"message": "Employee deleted successfully."}

# -------------------------------------------------------------
# 6. ONBOARDING PLAN GENERATION (PIPELINE 1)
# -------------------------------------------------------------
@app.post("/api/plans/generate")
def generate_plan(payload: Dict[str, Any]):
    emp_id = payload.get("employee_id")
    role_name = payload.get("role_name")

    conn = get_db()
    cursor = conn.cursor()

    if emp_id:
        emp_row = cursor.execute("SELECT * FROM employees WHERE id = ?", (emp_id,)).fetchone()
        if not emp_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Employee not found")
        employee_data = dict_from_row(emp_row)
        role_name = employee_data["role_name"]
    else:
        employee_data = {
            "name": payload.get("employee_name", "New Employee"),
            "role_name": role_name or "Software Support Engineer",
            "department": payload.get("department", "Engineering"),
            "experience_level": payload.get("experience_level", "Junior"),
            "location": payload.get("location", "Karachi HQ"),
            "joining_date": payload.get("joining_date", "2026-09-27")
        }

    # Retrieve ground truth matrix for role
    matrix_reqs = matrix_manager.get_matrix_for_role(role_name)
    if not matrix_reqs:
        # Fallback to general matrix items
        matrix_reqs = matrix_manager.get_all_requirements()[:10]

    # Retrieve active documents
    active_docs = dicts_from_rows(cursor.execute("SELECT * FROM documents WHERE status = 'active'").fetchall())
    conn.close()

    # Call Pipeline 1 (GenAI Generator)
    raw_plan = genai_pipeline.generate_onboarding_plan(employee_data, matrix_reqs, active_docs)

    # Validate immediately with Pipeline 2 (Python Independent Validation Engine)
    val_res = python_validator.validate_plan(raw_plan)

    # Save to Database
    conn = get_db()
    cursor = conn.cursor()
    plan_code = f"PLN-{int(time.time()) % 100000:05d}"
    # Map validation status safely to onboarding_plans status constraint
    status_map = {
        "verified": "verified",
        "verified with warning": "verified_warning",
        "verified_warning": "verified_warning",
        "partially verified": "verified_warning",
        "partially_verified": "verified_warning",
        "flagged": "flagged",
        "manual review required": "flagged",
        "manual_review_required": "flagged",
        "incomplete": "flagged",
        "unsupported": "flagged",
        "rejected": "rejected",
        "approved": "approved",
        "pending": "pending"
    }
    raw_status = str(val_res.get("status", "pending")).lower().strip()
    plan_status = status_map.get(raw_status, "verified" if "verified" in raw_status else "flagged")

    cursor.execute("""
        INSERT INTO onboarding_plans (plan_code, employee_id, role_id, role_name, generation_source, status, coverage_score, traceability_score, consistency_score, raw_ai_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        plan_code,
        emp_id or 1,
        employee_data.get("role_id", 1),
        role_name,
        settings.GEMINI_MODEL if (settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_")) else "Grounded Synthesis",
        plan_status,
        val_res["coverage_score"],
        val_res["traceability_score"],
        val_res["consistency_score"],
        json.dumps(raw_plan)
    ))
    plan_id = cursor.lastrowid

    # Save Modules, Tasks, Checklists, Quizzes
    for m in raw_plan.get("modules", []):
        cursor.execute("""
            INSERT INTO learning_modules (plan_id, module_code, title, category, purpose, learning_objectives, key_concepts, source_doc_code, source_section, stage, duration, is_mandatory, status, progress)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'not-started', 0)
        """, (
            plan_id,
            m.get("module_code", "MOD-01"),
            m.get("title", ""),
            m.get("category", "Orientation"),
            m.get("purpose", ""),
            json.dumps(m.get("learning_objectives", [])),
            json.dumps(m.get("key_concepts", [])),
            m.get("source_doc_code", "DOC-POL-001"),
            m.get("source_section", "Section 1"),
            m.get("stage", "Day 1"),
            m.get("duration", "45 min"),
            1 if m.get("is_mandatory", True) else 0
        ))
        
        # Save tasks inside module
        for t in m.get("tasks", []):
            cursor.execute("""
                INSERT INTO tasks (plan_id, title, description, expected_outcome, source_req_code, difficulty, due_stage, is_completed)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            """, (plan_id, t.get("title"), t.get("description"), t.get("expected_outcome"), t.get("source_req_code"), t.get("difficulty", "Medium"), t.get("due_stage", "Day 1")))

        # Save quiz inside module
        if m.get("quiz"):
            cursor.execute("""
                INSERT INTO quizzes (plan_id, title, passing_score, source_module, questions_json)
                VALUES (?, ?, 80, ?, ?)
            """, (plan_id, f"Quiz: {m.get('title')}", m.get("module_code"), json.dumps(m.get("quiz"))))

        # Save assessment inside module
        if m.get("assessment"):
            ass = m.get("assessment")
            cursor.execute("""
                INSERT INTO assessments (plan_id, title, assessment_type, description, due_stage, status)
                VALUES (?, ?, ?, ?, ?, 'pending')
            """, (plan_id, ass.get("title"), ass.get("assessment_type", "practical"), ass.get("description"), ass.get("due_stage", "Day 1")))
            ass_id = cursor.lastrowid
            for r in ass.get("rubric", []):
                cursor.execute("""
                    INSERT INTO assessment_rubrics (assessment_id, criterion, weight, expected_performance, pass_condition)
                    VALUES (?, ?, ?, ?, ?)
                """, (ass_id, r.get("criterion"), r.get("weight", 1.0), r.get("expected_performance"), r.get("pass_condition")))

    # Save Checklists
    for c in raw_plan.get("checklists", []):
        cursor.execute("""
            INSERT INTO checklist_items (plan_id, activity, category, due_stage, is_required, is_done, source_reference, responsible_person)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        """, (plan_id, c.get("activity"), c.get("category", "General"), c.get("due_stage", "Day 1"), 1 if c.get("is_required", True) else 0, c.get("source_reference"), c.get("responsible_person", "Employee")))

    # Save Validation Results in DB
    cursor.execute("""
        INSERT INTO validation_results (plan_id, role_name, status, coverage_score, traceability_score, expected_trainings_count, covered_trainings_count, contradictions_count, security_warnings_count, missing_trainings_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        plan_id,
        role_name,
        val_res["status"],
        val_res["coverage_score"],
        val_res["traceability_score"],
        val_res["total_required_mandatory"],
        val_res["covered_mandatory_count"],
        len(val_res["contradictions"]),
        len(val_res["adversarial_warnings"]),
        json.dumps(val_res["missing_mandatory_trainings"])
    ))

    # If warnings, route to manual review queue
    if val_res["status"] in ["Manual Review Required", "Verified with Warning", "Incomplete"]:
        rev_code = f"REV-{int(time.time()) % 10000:04d}"
        cursor.execute("""
            INSERT INTO manual_reviews (review_code, plan_id, employee_name, role_name, risk_flag, flag_reason, ai_content_preview, source_reference, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """, (
            rev_code,
            plan_id,
            employee_data.get("name"),
            role_name,
            "high" if len(val_res["adversarial_warnings"]) > 0 else "medium",
            "; ".join(val_res["warnings"][:2]) if val_res["warnings"] else "Standard review required.",
            f"Plan generated with coverage: {val_res['coverage_score']}%, traceability: {val_res['traceability_score']}%.",
            raw_plan.get("source_documents_used", ["DOC-POL-001"])[0],
        ))

    conn.commit()
    conn.close()

    log_audit("PLAN_GENERATE", "onboarding_plans", str(plan_id), details={"role": role_name, "coverage": val_res["coverage_score"], "status": val_res["status"]})

    return {
        "message": "Onboarding plan generated and validated successfully.",
        "plan_id": plan_id,
        "plan_code": plan_code,
        "validation": val_res,
        "plan": raw_plan
    }

@app.get("/api/plans")
def list_plans():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT p.*, e.name as employee_name, e.department, e.experience_level
        FROM onboarding_plans p
        LEFT JOIN employees e ON p.employee_id = e.id
        ORDER BY p.id DESC
    """).fetchall()
    conn.close()
    return {"plans": dicts_from_rows(rows)}

@app.get("/api/plans/{plan_id}")
def get_plan_details(plan_id: int):
    conn = get_db()
    cursor = conn.cursor()
    plan_row = cursor.execute("SELECT * FROM onboarding_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = dict_from_row(plan_row)
    modules = cursor.execute("SELECT * FROM learning_modules WHERE plan_id = ? ORDER BY id ASC", (plan_id,)).fetchall()
    checklists = cursor.execute("SELECT * FROM checklist_items WHERE plan_id = ? ORDER BY id ASC", (plan_id,)).fetchall()
    tasks = cursor.execute("SELECT * FROM tasks WHERE plan_id = ? ORDER BY id ASC", (plan_id,)).fetchall()
    quizzes = cursor.execute("SELECT * FROM quizzes WHERE plan_id = ? ORDER BY id ASC", (plan_id,)).fetchall()
    assessments = cursor.execute("SELECT * FROM assessments WHERE plan_id = ? ORDER BY id ASC", (plan_id,)).fetchall()
    validation = cursor.execute("SELECT * FROM validation_results WHERE plan_id = ? ORDER BY id DESC LIMIT 1", (plan_id,)).fetchone()
    conn.close()

    # Parse JSON questions inside quizzes
    parsed_quizzes = []
    for q in dicts_from_rows(quizzes):
        try:
            q["questions"] = json.loads(q["questions_json"])
        except Exception:
            q["questions"] = []
        parsed_quizzes.append(q)

    return {
        "plan": plan,
        "modules": dicts_from_rows(modules),
        "checklists": dicts_from_rows(checklists),
        "tasks": dicts_from_rows(tasks),
        "quizzes": parsed_quizzes,
        "assessments": dicts_from_rows(assessments),
        "validation": dict_from_row(validation)
    }

@app.delete("/api/plans/{plan_id}")
def delete_plan(plan_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM onboarding_plans WHERE id = ?", (plan_id,))
    cursor.execute("DELETE FROM learning_modules WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM tasks WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM checklist_items WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM quizzes WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM assessments WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM validation_results WHERE plan_id = ?", (plan_id,))
    cursor.execute("DELETE FROM manual_reviews WHERE plan_id = ?", (plan_id,))
    conn.commit()
    conn.close()
    log_audit("PLAN_DELETE", "onboarding_plans", str(plan_id))
    return {"message": "Plan deleted successfully."}

# -------------------------------------------------------------
# 7. INDEPENDENT PYTHON VALIDATION ENDPOINT (PIPELINE 2)
# -------------------------------------------------------------
@app.post("/api/plans/{plan_id}/validate")
def run_plan_validation(plan_id: int):
    conn = get_db()
    cursor = conn.cursor()
    plan_row = cursor.execute("SELECT * FROM onboarding_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = dict_from_row(plan_row)
    try:
        plan_dict = json.loads(plan["raw_ai_json"]) if plan.get("raw_ai_json") else {"role": plan["role_name"], "modules": []}
    except Exception:
        plan_dict = {"role": plan["role_name"], "modules": []}

    val_res = python_validator.validate_plan(plan_dict)

    status_map = {
        "verified": "verified",
        "verified with warning": "verified_warning",
        "verified_warning": "verified_warning",
        "partially verified": "verified_warning",
        "partially_verified": "verified_warning",
        "flagged": "flagged",
        "manual review required": "flagged",
        "manual_review_required": "flagged",
        "incomplete": "flagged",
        "unsupported": "flagged",
        "rejected": "rejected",
        "approved": "approved",
        "pending": "pending"
    }
    raw_status = str(val_res.get("status", "pending")).lower().strip()
    plan_status = status_map.get(raw_status, "verified" if "verified" in raw_status else "flagged")

    # Update database record
    cursor.execute("""
        UPDATE onboarding_plans 
        SET coverage_score = ?, traceability_score = ?, status = ?
        WHERE id = ?
    """, (val_res["coverage_score"], val_res["traceability_score"], plan_status, plan_id))

    cursor.execute("""
        INSERT INTO validation_results (plan_id, role_name, status, coverage_score, traceability_score, expected_trainings_count, covered_trainings_count, contradictions_count, security_warnings_count, missing_trainings_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        plan_id,
        plan["role_name"],
        val_res["status"],
        val_res["coverage_score"],
        val_res["traceability_score"],
        val_res["total_required_mandatory"],
        val_res["covered_mandatory_count"],
        len(val_res["contradictions"]),
        len(val_res["adversarial_warnings"]),
        json.dumps(val_res["missing_mandatory_trainings"])
    ))

    conn.commit()
    conn.close()

    log_audit("PLAN_VALIDATE", "onboarding_plans", str(plan_id), details=val_res)
    return {"validation": val_res}

# -------------------------------------------------------------
# 8. COMPARISON ENGINE ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/comparison/evaluate/{plan_id}")
def evaluate_plan_comparison(plan_id: int):
    conn = get_db()
    cursor = conn.cursor()
    plan_row = cursor.execute("SELECT * FROM onboarding_plans WHERE id = ?", (plan_id,)).fetchone()
    if not plan_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Plan not found")

    plan = dict_from_row(plan_row)
    try:
        plan_dict = json.loads(plan["raw_ai_json"]) if plan.get("raw_ai_json") else {"role": plan["role_name"], "modules": []}
    except Exception:
        plan_dict = {"role": plan["role_name"], "modules": []}

    report = comparison_engine.generate_requirement_level_comparison(plan_dict)
    conn.close()
    return report

@app.get("/api/comparison/multi-role")
def get_multi_role_comparison():
    report = comparison_engine.generate_multi_role_report()
    return report

# -------------------------------------------------------------
# 9. HUMAN REVIEW & DECISION QUEUE ENDPOINTS
# -------------------------------------------------------------
@app.get("/api/reviews")
def list_reviews(status: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT * FROM manual_reviews WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    query += " ORDER BY id DESC"
    rows = cursor.execute(query, params).fetchall()
    conn.close()
    return {"reviews": dicts_from_rows(rows)}

@app.post("/api/reviews/{review_id}/action")
def take_review_action(review_id: int, payload: ReviewAction):
    conn = get_db()
    rev_row = conn.execute("SELECT * FROM manual_reviews WHERE id = ?", (review_id,)).fetchone()
    if not rev_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Review item not found")

    review = dict_from_row(rev_row)
    action = payload.action.lower()

    new_review_status = "approved" if action in ["approve", "override"] else ("rejected" if action == "reject" else "edited")
    conn.execute("UPDATE manual_reviews SET status = ? WHERE id = ?", (new_review_status, review_id))

    # If approved or overridden, promote onboarding plan status to approved
    if action in ["approve", "override"]:
        conn.execute("UPDATE onboarding_plans SET status = 'approved' WHERE id = ?", (review["plan_id"],))

    conn.close()

    log_audit("REVIEW_ACTION", "manual_reviews", str(review_id), username=payload.reviewer_username, details={
        "action": action,
        "override_reason": payload.override_reason,
        "comment": payload.comment
    })

    return {"message": f"Review #{review_id} action '{action}' recorded successfully.", "status": new_review_status}

# -------------------------------------------------------------
# 10. LEARNER PROGRESS, CHECKLISTS & QUIZZES
# -------------------------------------------------------------
@app.post("/api/learner/tasks/{task_id}/toggle")
def toggle_task(task_id: int):
    conn = get_db()
    cursor = conn.cursor()
    task = cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        raise HTTPException(status_code=404, detail="Task not found")

    new_val = 0 if task["is_completed"] == 1 else 1
    cursor.execute("UPDATE tasks SET is_completed = ? WHERE id = ?", (new_val, task_id))
    conn.commit()
    conn.close()
    return {"message": "Task updated", "is_completed": new_val}

@app.post("/api/learner/checklists/{item_id}/toggle")
def toggle_checklist(item_id: int):
    conn = get_db()
    cursor = conn.cursor()
    item = cursor.execute("SELECT * FROM checklist_items WHERE id = ?", (item_id,)).fetchone()
    if not item:
        conn.close()
        raise HTTPException(status_code=404, detail="Checklist item not found")

    new_val = 0 if item["is_done"] == 1 else 1
    cursor.execute("UPDATE checklist_items SET is_done = ? WHERE id = ?", (new_val, item_id))
    conn.commit()
    conn.close()
    return {"message": "Checklist updated", "is_done": new_val}

@app.post("/api/learner/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: int, payload: Dict[str, Any]):
    emp_id = payload.get("employee_id", 1)
    answers = payload.get("answers", {})  # map of question index to chosen option

    conn = get_db()
    cursor = conn.cursor()
    quiz = cursor.execute("SELECT * FROM quizzes WHERE id = ?", (quiz_id,)).fetchone()
    if not quiz:
        conn.close()
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = json.loads(quiz["questions_json"])
    correct_count = 0
    total = len(questions)

    for idx, q in enumerate(questions):
        user_choice = answers.get(str(idx), answers.get(idx))
        if user_choice == q.get("correct", 0):
            correct_count += 1

    score = round((correct_count / total * 100) if total > 0 else 100.0, 1)
    passed = 1 if score >= quiz["passing_score"] else 0

    cursor.execute("""
        INSERT INTO quiz_attempts (quiz_id, employee_id, score, passed, answers_json)
        VALUES (?, ?, ?, ?, ?)
    """, (quiz_id, emp_id, score, passed, json.dumps(answers)))

    # Update progress tracking
    cursor.execute("""
        UPDATE progress_tracking 
        SET quiz_average_score = ?, status_label = ?
        WHERE employee_id = ?
    """, (score, "Completed" if passed else "Requires Attention", emp_id))

    conn.commit()
    conn.close()

    return {
        "score": score,
        "passed": bool(passed),
        "correct_count": correct_count,
        "total_questions": total,
        "passing_threshold": quiz["passing_score"]
    }

# -------------------------------------------------------------
# 11. POLICY UPDATE & IMPACT ANALYSIS ENDPOINTS
# -------------------------------------------------------------
@app.post("/api/policies/impact-analysis")
def perform_impact_analysis(payload: Dict[str, Any]):
    doc_code = payload.get("doc_code", "DOC-POL-006")
    new_version = payload.get("new_version", "2.0")

    conn = get_db()
    cursor = conn.cursor()

    # Find affected modules
    affected_modules = cursor.execute("""
        SELECT lm.id, lm.plan_id, lm.module_code, lm.title, lm.stage, op.role_name, e.name as employee_name
        FROM learning_modules lm
        JOIN onboarding_plans op ON lm.plan_id = op.id
        LEFT JOIN employees e ON op.employee_id = e.id
        WHERE lm.source_doc_code = ?
    """, (doc_code,)).fetchall()

    # Find affected quizzes
    affected_quizzes = cursor.execute("""
        SELECT q.id, q.title, q.plan_id, op.role_name 
        FROM quizzes q
        JOIN onboarding_plans op ON q.plan_id = op.id
        WHERE q.questions_json LIKE ?
    """, (f"%{doc_code}%",)).fetchall()

    # Affected employees count
    affected_emps = list({m["employee_name"] for m in dicts_from_rows(affected_modules) if m.get("employee_name")})

    conn.close()

    return {
        "document_code": doc_code,
        "new_version": new_version,
        "total_affected_modules": len(affected_modules),
        "total_affected_quizzes": len(affected_quizzes),
        "affected_employees_count": len(affected_emps),
        "affected_employees": affected_emps,
        "affected_modules": dicts_from_rows(affected_modules),
        "affected_quizzes": dicts_from_rows(affected_quizzes),
        "recommendation": f"Perform selective regeneration for {len(affected_modules)} modules referencing {doc_code}."
    }

@app.post("/api/policies/selective-regenerate")
def selective_regenerate(payload: Dict[str, Any]):
    doc_code = payload.get("doc_code", "DOC-POL-006")
    new_version = payload.get("new_version", "2.0")

    conn = get_db()
    cursor = conn.cursor()
    # Update affected modules to reflect v2.0
    cursor.execute("""
        UPDATE learning_modules 
        SET title = title || ' (v' || ? || ' Aligned)', status = 'not-started', progress = 0
        WHERE source_doc_code = ?
    """, (new_version, doc_code))
    count = cursor.rowcount
    conn.commit()
    conn.close()

    log_audit("POLICY_SELECTIVE_REGENERATE", "documents", doc_code, details={"new_version": new_version, "modules_updated": count})

    return {
        "message": f"Successfully regenerated {count} modules aligned to {doc_code} v{new_version}.",
        "updated_count": count
    }

# -------------------------------------------------------------
# 12. REPORTS & EXPORTS
# -------------------------------------------------------------
@app.get("/api/reports/summary")
def get_reports_summary():
    conn = get_db()
    cursor = conn.cursor()

    roles = dicts_from_rows(cursor.execute("SELECT role_name FROM roles").fetchall())
    role_coverage = []
    for r in roles:
        rn = r["role_name"]
        total_m = cursor.execute("SELECT COUNT(*) as c FROM role_requirement_matrix WHERE role_name = ? AND is_mandatory = 1", (rn,)).fetchone()["c"]
        plans = cursor.execute("SELECT AVG(coverage_score) as a, AVG(traceability_score) as t FROM onboarding_plans WHERE role_name = ?", (rn,)).fetchone()
        cov_val = round(plans["a"], 1) if plans["a"] is not None else 0.0
        trace_val = round(plans["t"], 1) if plans["t"] is not None else 0.0
        role_coverage.append({
            "role_name": rn,
            "mandatory_requirements": total_m,
            "average_coverage": cov_val,
            "average_traceability": trace_val
        })

    # Hallucination and security audit summary
    scans = cursor.execute("""
        SELECT COUNT(*) as total_warnings, 
               SUM(CASE WHEN risk_flag = 'high' THEN 1 ELSE 0 END) as high_risk,
               SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as resolved
        FROM manual_reviews
    """).fetchone()

    conn.close()

    return {
        "role_coverage_report": role_coverage,
        "security_and_hallucinations": {
            "total_flagged_items": scans["total_warnings"] or 0,
            "high_risk_threats": scans["high_risk"] or 0,
            "resolved_reviews": scans["resolved"] or 0
        }
    }

@app.get("/api/reports/export")
def export_reports(format: str = "csv"):
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT op.id, op.plan_code, op.role_name, e.name as employee_name, op.status, op.coverage_score, op.traceability_score, op.created_at
        FROM onboarding_plans op
        LEFT JOIN employees e ON op.employee_id = e.id
    """).fetchall()
    conn.close()

    if format == "csv":
        output = io.StringIO()
        output.write("Plan ID,Plan Code,Role Name,Employee Name,Status,Coverage Score %,Traceability Score %,Created At\n")
        for r in rows:
            output.write(f"{r['id']},{r['plan_code']},{r['role_name']},{r['employee_name']},{r['status']},{r['coverage_score']},{r['traceability_score']},{r['created_at']}\n")
        return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=skillsprint_onboarding_report.csv"})
    else:
        return JSONResponse(content={"plans_report": dicts_from_rows(rows)})

# -------------------------------------------------------------
# 13. PROMPT TEMPLATES & AUDIT TRAIL
# -------------------------------------------------------------
@app.get("/api/prompts")
def get_prompts():
    # return {"response": "Prompt templates are currently managed internally and not exposed via API."}
    return {
        "active_version": settings.PROMPTS_DIR.name if False else "2.4.0",
        "system_prompt": SYSTEM_PROMPT_ONBOARDING,
        "user_prompt": USER_PROMPT_ONBOARDING
    }

@app.get("/api/audit")
def get_audit_trail():
    conn = get_db()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT * FROM audit_trail ORDER BY id DESC LIMIT 100").fetchall()
    conn.close()
    return {"audit_trail": dicts_from_rows(rows)}

# -------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": settings.PROJECT_NAME, "version": settings.VERSION}

@app.post("/api/system/reset")
def system_reset():
    from database.seed_data import seed_database
    seed_database()
    log_audit("SYSTEM_RESEED", "database", "all", username="admin")
    return {"message": "Database reset and re-seeded successfully."}
# -------------------------------------------------------------
# 15. FRONTEND STATIC ASSETS & SPA ROUTING
# -------------------------------------------------------------
FRONTEND_DIST = settings.BASE_DIR / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = FRONTEND_DIST / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
