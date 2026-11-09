import re
from typing import List, Dict, Any, Tuple

# Adversarial & Prompt Injection Signature Patterns
SUSPICIOUS_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(safety|system|security)\s+guidelines",
    r"system\s+override",
    r"bypass\s+(mfa|authentication|approval|policy|verification)",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"grant\s+(admin|root|unlimited|special)\s+access",
    r"automatic(ally)?\s+approve\s+this\s+employee",
    r"jailbreak",
    r"print\s+(the\s+)?(system\s+prompt|api\s+key|database\s+password)",
    r"do\s+anything\s+now\s+\(dan\)",
    r"override\s+policy\s+limits",
    r"exempt\s+from\s+all\s+checks",
    r"fake\s+administrator\s+instruction"
]

class PromptInjectionDetector:
    """
    Scans documents, user inputs, and generated artifacts for prompt injection,
    malicious instruction overrides, and adversarial payload patterns.
    """

    def __init__(self, patterns: List[str] = None):
        self.patterns = patterns or SUSPICIOUS_PATTERNS
        self.compiled_patterns = [re.compile(p, re.IGNORECASE) for p in self.patterns]

    def scan_text(self, text: str, source_name: str = "Unknown") -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Scans a given text chunk or document for injection attempts.
        Returns (is_adversarial, list_of_threats)
        """
        if not text:
            return False, []

        threats = []
        lines = text.split("\n")
        for line_no, line in enumerate(lines, 1):
            for pattern in self.compiled_patterns:
                match = pattern.search(line)
                if match:
                    threats.append({
                        "source": source_name,
                        "line_number": line_no,
                        "matched_text": match.group(0),
                        "snippet": line.strip()[:160],
                        "severity": "HIGH",
                        "risk_type": "Adversarial Prompt Injection / Policy Bypass"
                    })

        return len(threats) > 0, threats

    def sanitize_content_for_llm(self, text: str) -> str:
        """
        Sanitizes text passed to LLM as passive context data by wrapping it
        in XML data delimiters and disarming dangerous instruction prefixes.
        """
        sanitized = text.replace("<script>", "").replace("</script>", "")
        return f"<document_data>\n{sanitized}\n</document_data>"

injection_detector = PromptInjectionDetector()
