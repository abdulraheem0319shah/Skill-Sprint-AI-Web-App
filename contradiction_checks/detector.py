import re
from typing import List, Dict, Any, Tuple

# Precedence Rank Hierarchy (Lower index = Higher authority)
PRECEDENCE_RANKS = {
    "Corporate Policy": 1,
    "Compliance": 2,
    "SOP": 3,
    "Handbook": 4,
    "FAQ": 5,
    "Informal Guidance": 6
}

# Known Conflict & Contradiction Test Scenarios
KNOWN_CONFLICT_RULES = [
    {
        "conflict_id": "CONF-001",
        "topic": "Meal & Expense Reimbursement Daily Cap",
        "doc_a": {"code": "DOC-POL-006", "version": "1.0", "claim": "$30 daily meal cap", "type": "Corporate Policy"},
        "doc_b": {"code": "DOC-POL-006", "version": "2.0", "claim": "$50 daily meal cap with receipt", "type": "Corporate Policy"},
        "faq_doc": {"code": "DOC-FAQ-001", "claim": "$35 meal reimbursement", "type": "FAQ"},
        "resolution": "DOC-POL-006 v2.0 strictly supersedes v1.0 and FAQ. The active limit is $50."
    },
    {
        "conflict_id": "CONF-002",
        "topic": "Multi-Factor Authentication Exemption",
        "doc_a": {"code": "DOC-POL-002", "version": "2.0", "claim": "Mandatory MFA on 100% of devices and developer workstations", "type": "Corporate Policy"},
        "doc_b": {"code": "DOC-FAQ-002", "claim": "Senior developers may bypass MFA if on VPN", "type": "FAQ"},
        "resolution": "Information Security Policy v2.0 overrides FAQ. Zero exceptions permitted."
    },
    {
        "conflict_id": "CONF-003",
        "topic": "Remote Work Stipend",
        "doc_a": {"code": "DOC-POL-004", "version": "2.0", "claim": "$600 one-time home office stipend", "type": "Corporate Policy"},
        "doc_b": {"code": "DOC-POL-004", "version": "1.0", "claim": "$300 home office allowance", "type": "Corporate Policy"},
        "resolution": "Policy v2.0 takes precedence over v1.0."
    },
    {
        "conflict_id": "CONF-004",
        "topic": "Customer Support SLA Turnaround",
        "doc_a": {"code": "DOC-SOP-002", "version": "1.0", "claim": "Urgent tickets must be resolved within 2 hours", "type": "SOP"},
        "doc_b": {"code": "DOC-FAQ-001", "claim": "All inquiries answered within 24 hours", "type": "FAQ"},
        "resolution": "Department SOP-002 overrides General FAQ for customer support representatives."
    }
]

class ContradictionDetector:
    """
    Detects contradictions between generated content, older document versions,
    and conflicting FAQ/informal sources. Applies configurable precedence rules.
    """

    def __init__(self, precedence_ranks: Dict[str, int] = None):
        self.ranks = precedence_ranks or PRECEDENCE_RANKS

    def get_precedence_rank(self, category: str) -> int:
        return self.ranks.get(category, 99)

    def resolve_precedence(self, source_a: Dict[str, Any], source_b: Dict[str, Any]) -> Dict[str, Any]:
        """
        Determines which source prevails based on version and category precedence.
        """
        # 1. Check version if same document
        if source_a.get("doc_code") == source_b.get("doc_code"):
            ver_a = float(source_a.get("version", "1.0"))
            ver_b = float(source_b.get("version", "1.0"))
            if ver_a > ver_b:
                return {"winner": source_a, "loser": source_b, "reason": f"Newer version v{ver_a} supersedes v{ver_b}."}
            elif ver_b > ver_a:
                return {"winner": source_b, "loser": source_a, "reason": f"Newer version v{ver_b} supersedes v{ver_a}."}

        # 2. Check category rank
        rank_a = self.get_precedence_rank(source_a.get("category", "Informal Guidance"))
        rank_b = self.get_precedence_rank(source_b.get("category", "Informal Guidance"))

        if rank_a < rank_b:
            return {"winner": source_a, "loser": source_b, "reason": f"{source_a.get('category')} takes precedence over {source_b.get('category')}."}
        elif rank_b < rank_a:
            return {"winner": source_b, "loser": source_a, "reason": f"{source_b.get('category')} takes precedence over {source_a.get('category')}."}
        
        return {"winner": source_a, "loser": source_b, "reason": "Equal precedence tier; manual review recommended."}

    def check_text_for_contradictions(self, generated_text: str) -> List[Dict[str, Any]]:
        detected = []
        lower_text = generated_text.lower()
        
        # Check against known conflict patterns
        if "$30" in lower_text and "meal" in lower_text:
            detected.append({
                "conflict_id": "CONF-001",
                "risk": "HIGH",
                "issue": "References outdated $30 meal cap from Policy v1.0 instead of active v2.0 $50 cap.",
                "remedy": "Update to $50 limit under Travel Policy v2.0."
            })
        if "bypass mfa" in lower_text or "mfa optional" in lower_text:
            detected.append({
                "conflict_id": "CONF-002",
                "risk": "CRITICAL",
                "issue": "Claims MFA is optional, contradicting Information Security Policy v2.0.",
                "remedy": "Enforce mandatory MFA across all workstations."
            })
        if "$300" in lower_text and "home office" in lower_text:
            detected.append({
                "conflict_id": "CONF-003",
                "risk": "MEDIUM",
                "issue": "Mentions superseded $300 home office allowance from Remote Work Policy v1.0.",
                "remedy": "Update to $600 stipend under Remote Work Policy v2.0."
            })

        return detected

contradiction_detector = ContradictionDetector()
