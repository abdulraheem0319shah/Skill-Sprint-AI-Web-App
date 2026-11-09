-- SkillSprint AI Master SQLite Schema (22 Tables)
-- Compliant with TechWiz7 Master Specifications

PRAGMA foreign_keys = ON;

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'training_manager', 'reviewer', 'employee')),
    department TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_code TEXT UNIQUE NOT NULL,
    file_name TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'obsolete', 'draft', 'quarantined')),
    file_type TEXT NOT NULL DEFAULT 'txt',
    file_size INTEGER DEFAULT 0,
    content TEXT,
    uploaded_by INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    effective_date TEXT,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- 3. DOCUMENT CHUNKS
CREATE TABLE IF NOT EXISTS document_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chunk_id TEXT UNIQUE NOT NULL,
    document_id INTEGER NOT NULL,
    doc_code TEXT NOT NULL,
    version TEXT NOT NULL,
    section TEXT NOT NULL,
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 4. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_code TEXT UNIQUE NOT NULL,
    role_name TEXT NOT NULL,
    department TEXT NOT NULL,
    description TEXT,
    clearance_level TEXT DEFAULT 'Standard',
    conflict_precedence_rules TEXT,
    adversarial_protection TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. ROLE DOCUMENTS (Many-to-Many linking)
CREATE TABLE IF NOT EXISTS role_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    is_mandatory INTEGER DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    UNIQUE(role_id, document_id)
);

-- 6. EMPLOYEES
CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_code TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    department TEXT NOT NULL,
    experience_level TEXT DEFAULT 'Junior',
    location TEXT DEFAULT 'Headquarters',
    joining_date TEXT NOT NULL,
    reporting_manager TEXT,
    training_status TEXT DEFAULT 'In Progress' CHECK(training_status IN ('Not Started', 'In Progress', 'Completed', 'Requires Attention', 'Behind Schedule')),
    plan_progress INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 7. ROLE REQUIREMENT MATRIX
CREATE TABLE IF NOT EXISTS role_requirement_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    req_code TEXT UNIQUE NOT NULL,
    role_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    policy_requirement TEXT NOT NULL,
    competency TEXT NOT NULL,
    is_mandatory INTEGER DEFAULT 1,
    priority TEXT DEFAULT 'High' CHECK(priority IN ('Critical', 'High', 'Medium', 'Low')),
    source_doc_code TEXT NOT NULL,
    source_section TEXT NOT NULL,
    due_stage TEXT NOT NULL CHECK(due_stage IN ('Day 1', 'Week 1', 'Week 2', 'First 30 Days', '60 Days', '90 Days')),
    assessment_topic TEXT,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 8. ONBOARDING PLANS
CREATE TABLE IF NOT EXISTS onboarding_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_code TEXT UNIQUE NOT NULL,
    employee_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    generation_source TEXT DEFAULT 'GenAI Gemini 1.5 Flash',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'verified_warning', 'flagged', 'rejected', 'approved', 'manual_review_required', 'partially_verified', 'incomplete', 'unsupported')),
    coverage_score REAL DEFAULT 0.0,
    traceability_score REAL DEFAULT 0.0,
    consistency_score REAL DEFAULT 0.0,
    raw_ai_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 9. LEARNING MODULES
CREATE TABLE IF NOT EXISTS learning_modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    module_code TEXT NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    purpose TEXT,
    learning_objectives TEXT,
    key_concepts TEXT,
    source_doc_code TEXT,
    source_section TEXT,
    stage TEXT NOT NULL,
    duration TEXT DEFAULT '45 min',
    is_mandatory INTEGER DEFAULT 1,
    status TEXT DEFAULT 'not-started' CHECK(status IN ('not-started', 'in-progress', 'completed')),
    progress INTEGER DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 10. CHECKLIST ITEMS
CREATE TABLE IF NOT EXISTS checklist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    activity TEXT NOT NULL,
    category TEXT NOT NULL,
    due_stage TEXT NOT NULL,
    is_required INTEGER DEFAULT 1,
    is_done INTEGER DEFAULT 0,
    source_reference TEXT,
    responsible_person TEXT DEFAULT 'Employee',
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 11. TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_outcome TEXT,
    source_req_code TEXT,
    difficulty TEXT DEFAULT 'Medium',
    due_stage TEXT NOT NULL,
    is_completed INTEGER DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 12. QUIZZES
CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    passing_score INTEGER DEFAULT 80,
    source_module TEXT,
    questions_json TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 13. QUIZ ATTEMPTS
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    score REAL NOT NULL,
    passed INTEGER NOT NULL,
    answers_json TEXT,
    attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- 14. ASSESSMENTS
CREATE TABLE IF NOT EXISTS assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    assessment_type TEXT DEFAULT 'practical' CHECK(assessment_type IN ('knowledge', 'practical', 'scenario', 'role-specific')),
    description TEXT,
    due_stage TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    score REAL,
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 15. ASSESSMENT RUBRICS
CREATE TABLE IF NOT EXISTS assessment_rubrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id INTEGER NOT NULL,
    criterion TEXT NOT NULL,
    weight REAL DEFAULT 1.0,
    expected_performance TEXT,
    pass_condition TEXT,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
);

-- 16. VALIDATION RESULTS
CREATE TABLE IF NOT EXISTS validation_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    role_name TEXT NOT NULL,
    status TEXT NOT NULL,
    coverage_score REAL NOT NULL,
    traceability_score REAL NOT NULL,
    expected_trainings_count INTEGER DEFAULT 0,
    covered_trainings_count INTEGER DEFAULT 0,
    contradictions_count INTEGER DEFAULT 0,
    security_warnings_count INTEGER DEFAULT 0,
    missing_trainings_json TEXT,
    active_precedence_rules TEXT,
    adversarial_summary TEXT,
    evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 17. COMPARISON REPORTS
CREATE TABLE IF NOT EXISTS comparison_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_name TEXT NOT NULL,
    total_roles INTEGER NOT NULL,
    comparison_data_json TEXT NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. MANUAL REVIEWS (Review Queue)
CREATE TABLE IF NOT EXISTS manual_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_code TEXT UNIQUE NOT NULL,
    plan_id INTEGER NOT NULL,
    employee_name TEXT NOT NULL,
    role_name TEXT NOT NULL,
    risk_flag TEXT DEFAULT 'low' CHECK(risk_flag IN ('low', 'medium', 'high', 'critical')),
    flag_reason TEXT NOT NULL,
    ai_content_preview TEXT,
    source_reference TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'edited', 'regenerated')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES onboarding_plans(id) ON DELETE CASCADE
);

-- 19. AUDIT TRAIL
CREATE TABLE IF NOT EXISTS audit_trail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    user_id INTEGER,
    username TEXT,
    details_json TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. PROMPT TEMPLATES
CREATE TABLE IF NOT EXISTS prompt_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_name TEXT UNIQUE NOT NULL,
    version TEXT NOT NULL,
    prompt_content TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 21. GENERATION LOGS
CREATE TABLE IF NOT EXISTS generation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    model_name TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    latency_seconds REAL DEFAULT 0.0,
    status TEXT NOT NULL,
    error_message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 22. PROGRESS TRACKING
CREATE TABLE IF NOT EXISTS progress_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER UNIQUE NOT NULL,
    modules_completed INTEGER DEFAULT 0,
    total_modules INTEGER DEFAULT 0,
    checklist_completed INTEGER DEFAULT 0,
    total_checklist INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    total_tasks INTEGER DEFAULT 0,
    quiz_average_score REAL DEFAULT 0.0,
    status_label TEXT DEFAULT 'On Track' CHECK(status_label IN ('On Track', 'Requires Attention', 'Behind Schedule', 'Assessment Required', 'Completed')),
    weak_areas_json TEXT,
    adaptive_recommendations_json TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
);
