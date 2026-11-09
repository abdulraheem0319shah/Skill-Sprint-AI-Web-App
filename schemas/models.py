from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

# --- Document Schemas ---
class DocumentMetadata(BaseModel):
    doc_id: str = Field(..., description="Unique Document Code e.g. DOC-POL-001")
    title: str = Field(..., description="Title of document")
    category: str = Field(..., description="Category: Policy, SOP, Handbook, Process, Employee Process, FAQ, Compliance, Adversarial")
    version: str = Field("1.0", description="Version string e.g. 1.0 or 2.0")
    status: str = Field("active", description="active, obsolete, draft, quarantined")
    section: Optional[str] = "General"
    effective_date: Optional[str] = None
    file_type: str = "txt"
    file_size: int = 0
    content: Optional[str] = None

class DocumentChunk(BaseModel):
    chunk_id: str
    doc_id: str
    version: str
    section: str
    content: str
    chunk_index: int = 1

# --- Role & Requirement Matrix Schemas ---
class RoleRequirementItem(BaseModel):
    req_code: str = Field(..., description="Requirement ID e.g. REQ-0001")
    role_id: Optional[int] = None
    role_name: str = Field(..., description="Target Job Role")
    policy_requirement: str = Field(..., description="Core policy or task requirement")
    competency: str = Field(..., description="Required competency or domain")
    is_mandatory: bool = Field(True, description="Whether requirement is mandatory")
    priority: str = Field("High", description="Critical, High, Medium, Low")
    source_doc_code: str = Field(..., description="Source Document ID e.g. DOC-POL-001")
    source_section: str = Field(..., description="Section reference e.g. Section 2.1")
    due_stage: str = Field("Day 1", description="Day 1, Week 1, Week 2, First 30 Days, 60 Days, 90 Days")
    assessment_topic: Optional[str] = Field(None, description="Linked assessment or quiz topic")

class RoleModel(BaseModel):
    id: Optional[int] = None
    role_code: str
    role_name: str
    department: str
    description: Optional[str] = None
    clearance_level: Optional[str] = "Standard"
    conflict_precedence_rules: Optional[str] = None
    adversarial_protection: Optional[str] = None

class EmployeeModel(BaseModel):
    id: Optional[int] = None
    employee_code: str
    user_id: Optional[int] = None
    name: str
    email: str
    role_id: int
    role_name: str
    department: str
    experience_level: str = "Junior"
    location: str = "Headquarters"
    joining_date: str
    reporting_manager: Optional[str] = None
    training_status: str = "In Progress"
    plan_progress: int = 0

class EmployeeRegistration(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    role_id: int = Field(..., gt=0)
    experience_level: str = Field("Junior", min_length=1, max_length=40)
    location: str = Field("Headquarters", min_length=1, max_length=120)

# --- GenAI Structured Output Schemas ---
class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    correct: int = Field(..., description="0-indexed correct option")
    explanation: str
    source_doc_code: Optional[str] = None
    source_section: Optional[str] = None
    difficulty: str = "Medium"

class AssessmentRubricItem(BaseModel):
    criterion: str
    weight: float = 1.0
    expected_performance: str
    pass_condition: str

class AssessmentItem(BaseModel):
    title: str
    assessment_type: str = "practical"  # knowledge, practical, scenario, role-specific
    description: str
    due_stage: str
    rubric: List[AssessmentRubricItem] = []

class PracticalTask(BaseModel):
    title: str
    description: str
    expected_outcome: str
    source_req_code: Optional[str] = None
    difficulty: str = "Medium"
    due_stage: str
    is_scenario: bool = False

class ChecklistItem(BaseModel):
    activity: str
    category: str
    due_stage: str
    is_required: bool = True
    source_reference: Optional[str] = None
    responsible_person: str = "Employee"

class LearningModule(BaseModel):
    module_code: str = Field(..., description="Module ID e.g. MOD-01")
    title: str
    category: str = "Orientation"
    purpose: str
    learning_objectives: List[str] = []
    key_concepts: List[str] = []
    source_doc_code: str
    source_section: str
    stage: str = "Day 1"
    duration: str = "45 min"
    is_mandatory: bool = True
    tasks: List[PracticalTask] = []
    quiz: Optional[List[QuizQuestion]] = None
    assessment: Optional[AssessmentItem] = None

class StructuredPlanOutput(BaseModel):
    role: str
    department: str
    experience_level: str
    plan_summary: Dict[str, Any] = {}
    modules: List[LearningModule] = []
    checklists: List[ChecklistItem] = []
    scenarios: List[PracticalTask] = []
    source_documents_used: List[str] = []
    version: str = "1.0"

# --- Independent Python Validation Output ---
class ValidationResult(BaseModel):
    plan_id: Optional[int] = None
    role_name: str
    status: str  # Verified, Verified with Warning, Partially Verified, Source Support Missing, Requirement Missing, Unsupported Requirement, Outdated Source, Contradiction Detected, Manual Review Required
    coverage_score: float = Field(..., description="Percentage of mandatory requirements met (0-100)")
    traceability_score: float = Field(..., description="Percentage of valid source citations (0-100)")
    consistency_score: float = Field(100.0, description="Consistency score across generation runs")
    total_required_mandatory: int = 0
    covered_mandatory_count: int = 0
    missing_mandatory_trainings: List[Dict[str, Any]] = []
    unsupported_items: List[Dict[str, Any]] = []
    duplicate_items: List[Dict[str, Any]] = []
    contradictions: List[Dict[str, Any]] = []
    adversarial_warnings: List[Dict[str, Any]] = []
    role_relevance_flags: List[Dict[str, Any]] = []
    prerequisite_violations: List[Dict[str, Any]] = []
    warnings: List[str] = []

# --- Comparison Engine Output ---
class RequirementComparisonRow(BaseModel):
    req_code: str
    role: str
    policy_requirement: str
    competency: str
    is_mandatory: bool
    source_doc: str
    source_section: str
    python_expected: str
    genai_result: str
    match_status: str  # Match, Partial Match, Mismatch, Missing in GenAI, Extra GenAI
    coverage_status: str
    traceability_status: str
    validation_status: str
    explanation: Optional[str] = None

class ComparisonReport(BaseModel):
    report_name: str
    total_roles_evaluated: int
    overall_match_rate: float
    comparison_details: List[RequirementComparisonRow]
    evaluated_at: str

# --- Human Review & Audit ---
class ReviewAction(BaseModel):
    review_id: int
    action: str  # approve, reject, edit, regenerate, override
    reviewer_username: str
    comment: Optional[str] = None
    edited_content: Optional[Dict[str, Any]] = None
    override_reason: Optional[str] = None
