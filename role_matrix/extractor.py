import re
from typing import List, Dict, Any

# Modal verbs indicating mandatory requirement levels
MANDATORY_KEYWORDS = [
    r"\bmust\b", r"\bshall\b", r"\brequired\b", r"\bmandatory\b",
    r"\bstrictly\s+prohibited\b", r"\bzero[- ]tolerance\b", r"\benforce\b",
    r"\bcompulsory\b", r"\bobligation\b"
]

OPTIONAL_KEYWORDS = [
    r"\bmay\b", r"\boptional\b", r"\brecommended\b", r"\bsuggested\b",
    r"\bguideline\b", r"\bdiscretionary\b", r"\bif\s+applicable\b"
]

CATEGORY_PATTERNS = {
    "Must Know": [r"understand", r"familiarize", r"know", r"learn", r"review", r"study"],
    "Must Complete": [r"complete", r"submit", r"configure", r"setup", r"enroll", r"finish"],
    "Must Demonstrate": [r"demonstrate", r"apply", r"execute", r"pass", r"perform", r"resolve"],
    "Must Acknowledge": [r"acknowledge", r"sign", r"accept", r"confirm", r"agree"]
}

class RequirementExtractor:
    """
    Deterministic NLP and heuristic-based requirement extractor.
    Extracts policy and process requirements from document text into candidate matrix items.
    """

    def extract_from_text(self, text: str, doc_code: str, version: str = "1.0") -> List[Dict[str, Any]]:
        extracted = []
        sentences = re.split(r"\r?\n+|(?<=[.!?])\s+", text)
        
        req_index = 1
        current_section = "General"

        for s in sentences:
            clean_s = s.strip()
            if not clean_s or len(clean_s) < 20:
                continue

            # Track section headers
            if clean_s.startswith("Section ") or clean_s.startswith("## "):
                current_section = clean_s.split(":")[0].replace("##", "").strip()
                continue

            is_mandatory = any(re.search(pat, clean_s, re.IGNORECASE) for pat in MANDATORY_KEYWORDS)
            is_optional = any(re.search(pat, clean_s, re.IGNORECASE) for pat in OPTIONAL_KEYWORDS)

            if not is_mandatory and not is_optional:
                # Informational statement
                continue

            # Classify requirement type
            req_type = "Must Know"
            for r_type, patterns in CATEGORY_PATTERNS.items():
                if any(re.search(p, clean_s, re.IGNORECASE) for p in patterns):
                    req_type = r_type
                    break

            priority = "Critical" if "zero-tolerance" in clean_s.lower() or "strictly" in clean_s.lower() or "emergency" in clean_s.lower() else ("High" if is_mandatory else "Medium")
            
            # Due stage heuristics
            due_stage = "Day 1"
            if "first 30" in clean_s.lower() or "30 days" in clean_s.lower():
                due_stage = "First 30 Days"
            elif "60 days" in clean_s.lower():
                due_stage = "60 Days"
            elif "90 days" in clean_s.lower() or "quarterly" in clean_s.lower():
                due_stage = "90 Days"
            elif "week 2" in clean_s.lower():
                due_stage = "Week 2"
            elif "week 1" in clean_s.lower() or "first week" in clean_s.lower():
                due_stage = "Week 1"

            extracted.append({
                "req_code": f"EXT-{doc_code}-{req_index:03d}",
                "policy_requirement": clean_s,
                "requirement_type": req_type,
                "is_mandatory": is_mandatory and not is_optional,
                "priority": priority,
                "source_doc_code": doc_code,
                "source_section": current_section,
                "due_stage": due_stage,
                "version": version
            })
            req_index += 1

        return extracted

requirement_extractor = RequirementExtractor()
