import re
from typing import List, Dict, Any
from database.db import get_db, dicts_from_rows

class RoleMatrixManager:
    """
    Manages the Ground-Truth Role Requirement Matrix in the database.
    Provides retrieval, role filtering, requirement matching, and coverage lookups.
    """

    def get_matrix_for_role(self, role_name: str) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT * FROM role_requirement_matrix 
            WHERE role_name = ?
            ORDER BY id ASC
        """, (role_name,)).fetchall()
        conn.close()
        return dicts_from_rows(rows)

    def get_all_requirements(self) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT * FROM role_requirement_matrix
            ORDER BY role_name, id ASC
        """).fetchall()
        conn.close()
        return dicts_from_rows(rows)

    def get_mandatory_requirements_for_role(self, role_name: str) -> List[Dict[str, Any]]:
        conn = get_db()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT * FROM role_requirement_matrix 
            WHERE role_name = ? AND is_mandatory = 1
            ORDER BY id ASC
        """, (role_name,)).fetchall()
        conn.close()
        return dicts_from_rows(rows)

    def add_requirement(self, req_data: Dict[str, Any]) -> int:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO role_requirement_matrix 
            (req_code, role_id, role_name, policy_requirement, competency, is_mandatory, priority, source_doc_code, source_section, due_stage, assessment_topic)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            req_data.get("req_code"),
            req_data.get("role_id", 1),
            req_data.get("role_name"),
            req_data.get("policy_requirement"),
            req_data.get("competency"),
            1 if req_data.get("is_mandatory", True) else 0,
            req_data.get("priority", "High"),
            req_data.get("source_doc_code"),
            req_data.get("source_section", "General"),
            req_data.get("due_stage", "Day 1"),
            req_data.get("assessment_topic", "")
        ))
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()
        return last_id

    def update_requirement(self, req_id: int, req_data: Dict[str, Any]) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE role_requirement_matrix 
            SET policy_requirement = ?, competency = ?, is_mandatory = ?, priority = ?, source_doc_code = ?, source_section = ?, due_stage = ?, assessment_topic = ?
            WHERE id = ?
        """, (
            req_data.get("policy_requirement"),
            req_data.get("competency"),
            1 if req_data.get("is_mandatory", True) else 0,
            req_data.get("priority", "High"),
            req_data.get("source_doc_code"),
            req_data.get("source_section", "General"),
            req_data.get("due_stage", "Day 1"),
            req_data.get("assessment_topic", ""),
            req_id
        ))
        conn.commit()
        updated = cursor.rowcount > 0
        conn.close()
        return updated

    def delete_requirement(self, req_id: int) -> bool:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM role_requirement_matrix WHERE id = ?", (req_id,))
        conn.commit()
        deleted = cursor.rowcount > 0
        conn.close()
        return deleted

matrix_manager = RoleMatrixManager()
