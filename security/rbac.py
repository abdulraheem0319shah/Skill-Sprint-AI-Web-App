import hashlib
import hmac
import secrets
from typing import Dict, List, Optional

ROLE_PERMISSIONS = {
    "admin": {
        "view_all": True,
        "manage_users": True,
        "upload_documents": True,
        "delete_documents": True,
        "create_roles": True,
        "edit_matrix": True,
        "generate_plans": True,
        "validate_plans": True,
        "review_approvals": True,
        "override_verifications": True,
        "view_reports": True,
        "export_data": True,
        "view_audit_trail": True,
        "system_settings": True
    },
    "training_manager": {
        "view_all": True,
        "manage_users": False,
        "upload_documents": True,
        "delete_documents": False,
        "create_roles": True,
        "edit_matrix": True,
        "generate_plans": True,
        "validate_plans": True,
        "review_approvals": True,
        "override_verifications": False,
        "view_reports": True,
        "export_data": True,
        "view_audit_trail": False,
        "system_settings": False
    },
    "reviewer": {
        "view_all": True,
        "manage_users": False,
        "upload_documents": False,
        "delete_documents": False,
        "create_roles": False,
        "edit_matrix": False,
        "generate_plans": False,
        "validate_plans": True,
        "review_approvals": True,
        "override_verifications": True,
        "view_reports": True,
        "export_data": False,
        "view_audit_trail": True,
        "system_settings": False
    },
    "employee": {
        "view_all": False,
        "manage_users": False,
        "upload_documents": False,
        "delete_documents": False,
        "create_roles": False,
        "edit_matrix": False,
        "generate_plans": False,
        "validate_plans": False,
        "review_approvals": False,
        "override_verifications": False,
        "view_reports": False,
        "export_data": False,
        "view_audit_trail": False,
        "system_settings": False,
        "view_own_plan": True,
        "submit_quizzes": True,
        "complete_tasks": True,
        "view_own_progress": True
    }
}

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 260_000)
    return f"pbkdf2_sha256${salt.hex()}${password_hash.hex()}"

def verify_password(password: str, hashed: str) -> bool:
    if hashed.startswith("pbkdf2_sha256$"):
        try:
            _, salt_hex, expected_hex = hashed.split("$", 2)
            actual = hashlib.pbkdf2_hmac(
                "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), 260_000
            )
            return hmac.compare_digest(actual.hex(), expected_hex)
        except ValueError:
            return False

    # Support password hashes created by earlier versions until the user signs in.
    legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return hmac.compare_digest(legacy_hash, hashed)

def has_permission(user_role: str, permission: str) -> bool:
    role_perms = ROLE_PERMISSIONS.get(user_role, {})
    return role_perms.get(permission, False)
