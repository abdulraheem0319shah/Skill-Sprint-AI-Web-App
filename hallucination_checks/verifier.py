import re
from typing import List, Dict, Any, Set
from database.db import get_db, dicts_from_rows

class HallucinationChecker:
    """
    Evaluates generated modules, tasks, and objectives against ground-truth active document chunks.
    Detects fabricated policy claims, ungrounded numbers/dates, and unapproved company procedures.
    """

    def __init__(self):
        pass

    def get_active_corpus(self) -> Dict[str, str]:
        """Retrieves active document text mapped by document code."""
        conn = get_db()
        cursor = conn.cursor()
        rows = cursor.execute("""
            SELECT doc_code, content, title FROM documents 
            WHERE status = 'active'
        """).fetchall()
        conn.close()
        return {r["doc_code"]: r["content"] for r in dicts_from_rows(rows)}

    def verify_grounding(self, item_text: str, cited_doc_code: str, active_docs: Dict[str, str] = None) -> Dict[str, Any]:
        """
        Verifies if an item's factual claims are grounded in the cited document.
        """
        if active_docs is None:
            active_docs = self.get_active_corpus()

        if not cited_doc_code:
            return {
                "is_grounded": False,
                "confidence": 0.0,
                "reason": "No source document cited.",
                "hallucination_risk": "HIGH"
            }

        doc_content = active_docs.get(cited_doc_code)
        if not doc_content:
            return {
                "is_grounded": False,
                "confidence": 0.0,
                "reason": f"Cited document '{cited_doc_code}' not found in active corporate repository.",
                "hallucination_risk": "HIGH"
            }

        # Check key terms / factual tokens from item_text inside the document
        clean_words = [w.lower() for w in re.findall(r"\b[A-Za-z0-9\-\$]{4,}\b", item_text)]
        if not clean_words:
            return {"is_grounded": True, "confidence": 1.0, "reason": "General instructional statement.", "hallucination_risk": "LOW"}

        doc_lower = doc_content.lower()
        matched_tokens = [w for w in clean_words if w in doc_lower]
        grounding_ratio = len(matched_tokens) / len(clean_words)

        if grounding_ratio >= 0.35:
            return {
                "is_grounded": True,
                "confidence": round(grounding_ratio, 2),
                "reason": "Sufficient textual overlap with cited policy document.",
                "hallucination_risk": "LOW"
            }
        else:
            return {
                "is_grounded": False,
                "confidence": round(grounding_ratio, 2),
                "reason": f"Factual claims have low semantic grounding in {cited_doc_code} (grounding score: {grounding_ratio:.2f}).",
                "hallucination_risk": "MEDIUM" if grounding_ratio > 0.15 else "HIGH"
            }

hallucination_checker = HallucinationChecker()
