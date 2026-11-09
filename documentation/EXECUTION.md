# SkillSprint AI — Execution Guide

This document details how to run the end-to-end backend pipelines, validation scripts, and security test suites.

---

## 1. Run Master Pipeline Execution
Executes document ingestion, onboarding plan compilation for all 10 roles, Python rule validation, comparison engine metrics, and prompt injection security audit:

```powershell
python run_full_pipeline.py
```

### Generated Artifacts Location:
- Onboarding Plans: `reports/onboarding_plans/` (10 Role JSON Files)
- Overall Validation Report: `reports/validation_report.json`
- GenAI vs Python Comparison Report: `reports/comparison_report.json`
- Security Audit Report: `reports/security_testing_report.json`

---

## 2. Run Requirement Verification Checklist
Executes automated checks verifying that all competition requirements (10 conflicts, 20 version files, 10 adversarial docs, Role Matrix) are present:

```powershell
python validate_requirements.py
```

---

## 3. Run Individual Pipeline Components

### Run Document Parser:
```powershell
python document_processing/parser.py
```

### Run GenAI Plan Generator for a Specific Role:
```powershell
python genai_pipeline/generator.py
```

### Run Independent Python Validation Engine:
```powershell
python python_validation/validator.py
```

### Run Security Audit Engine:
```powershell
python security/security_tester.py
```
