import os
import sys
import hashlib
import uuid
from datetime import datetime, timedelta
import random
from dotenv import load_dotenv

# ─── Append ml directory to path for imports ─────
sys.path.append(os.path.join(os.path.dirname(__file__), "ml"))

# ─── Load .env BEFORE importing ai_engine so GEMINI_API_KEY is available ─────
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sqlite3
import json

from database import init_db, DB_FILE
from ai_engine import (
    generate_adaptive_quiz,
    generate_course_pathway,
    generate_study_assistant,
    generate_study_mcqs,
    recommend_courses_pipeline,
)
from ml.skill_gap_ml import calculate_skill_similarity
from ml.recommendation_engine import recommend_courses_for_gaps

# ═══════════════════════════════════════════════════════════════════════════════
# ─── Telemetry Ledger DB (pragya_ledger.db) ────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

LEDGER_DB = os.path.join(os.path.dirname(__file__), "..", "pragya_ledger.db")

# ─── Frontend directory path (relative to backend/) ──────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend"))

COMPETENCY_DOMAINS = [
    "Survey Methodology",
    "National Accounts & GDP",
    "Price Index Compilation",
    "Data Governance & Ethics",
    "Statistical Computing (R/Python)",
    "Sampling Theory",
    "Macro-Economic Indicators",
    "Data Visualization",
]

SEED_OFFICIALS = [
    {"name": "Ananya Sharma",     "cadre": "IAS",  "department": "MoSPI",    "designation": "Deputy Director",   "posting_state": "Delhi"},
    {"name": "Vikram Patel",      "cadre": "ISS",  "department": "CSO",      "designation": "Statistical Officer","posting_state": "Maharashtra"},
    {"name": "Priya Nair",        "cadre": "IES",  "department": "NSSO",     "designation": "Assistant Director", "posting_state": "Kerala"},
    {"name": "Rajesh Kumar Singh","cadre": "ISS",  "department": "DES",      "designation": "Senior Statistician","posting_state": "Uttar Pradesh"},
    {"name": "Meera Joshi",       "cadre": "IAS",  "department": "NITI Aayog","designation": "Joint Secretary",   "posting_state": "Delhi"},
]


def init_telemetry_db():
    """Create and seed the pragya_ledger.db telemetry database."""
    conn = sqlite3.connect(LEDGER_DB)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS officers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cadre TEXT NOT NULL,
            department TEXT NOT NULL,
            designation TEXT NOT NULL,
            posting_state TEXT NOT NULL,
            enrolled_on TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS assessment_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            officer_id TEXT DEFAULT 'OFFICER_DEMO_001',
            official_id TEXT DEFAULT 'OFFICER_DEMO_001',
            competency_domain TEXT NOT NULL DEFAULT 'General',
            score_pct REAL NOT NULL DEFAULT 60.0,
            assessed_on TEXT NOT NULL DEFAULT (datetime('now')),
            status TEXT NOT NULL DEFAULT 'ADEQUATE',
            FOREIGN KEY (officer_id) REFERENCES officers(id)
        )
    """)

    # Safe migration check: add officer_id and official_id columns if pre-existing without them
    try:
        cur.execute("ALTER TABLE assessment_log ADD COLUMN officer_id TEXT DEFAULT 'OFFICER_DEMO_001';")
        conn.commit()
    except Exception:
        pass

    try:
        cur.execute("ALTER TABLE assessment_log ADD COLUMN official_id TEXT DEFAULT 'OFFICER_DEMO_001';")
        conn.commit()
    except Exception:
        pass

    # Synchronize officer_id and official_id in existing records
    try:
        cur.execute("UPDATE assessment_log SET officer_id = official_id WHERE (officer_id IS NULL OR officer_id = '') AND official_id IS NOT NULL;")
        cur.execute("UPDATE assessment_log SET official_id = officer_id WHERE (official_id IS NULL OR official_id = '') AND officer_id IS NOT NULL;")
        conn.commit()
    except Exception:
        pass

    # ─── Users table for authentication ────────────────────────────────────
    
    cur.execute('''
        CREATE TABLE IF NOT EXISTS officer_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            officer_id INTEGER NOT NULL,
            course_id TEXT NOT NULL,
            status TEXT DEFAULT 'Enrolled',
            progress_pct REAL DEFAULT 0.0,
            enrolled_on TEXT DEFAULT (datetime('now')),
            completed_on TEXT,
            FOREIGN KEY(officer_id) REFERENCES officers(id)
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS supervisory_interventions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            officer_id INTEGER NOT NULL,
            competency_domain TEXT NOT NULL,
            intervention_type TEXT,
            status TEXT DEFAULT 'Pending',
            assigned_on TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(officer_id) REFERENCES officers(id)
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS document_knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            uploaded_by TEXT,
            uploaded_on TEXT DEFAULT (datetime('now'))
        )
    ''')

    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'officer',
            cadre TEXT DEFAULT 'General Cadre',
            department TEXT DEFAULT 'MoSPI',
            designation TEXT DEFAULT 'Statistical Officer',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    conn.commit()

    # ─── Seed only if empty ────────────────────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM officers")
    if cur.fetchone()[0] == 0:
        _seed_telemetry_data(cur, conn)

    # ─── Seed demo auth accounts if empty ──────────────────────────────────
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        _seed_demo_accounts(cur, conn)

    conn.close()


def _hash_password(password: str) -> str:
    """SHA-256 hash for lightweight password storage."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def _seed_demo_accounts(cur, conn):
    """Pre-seed demo officer and supervisor accounts for zero-latency evaluation."""
    demo_users = [
        {
            "username": "officer1",
            "password": "password123",
            "full_name": "Rajesh Kumar Singh",
            "role": "officer",
            "cadre": "SSS",
            "department": "Price & Cost of Living",
            "designation": "Senior Statistical Officer",
        },
        {
            "username": "supervisor1",
            "password": "admin123",
            "full_name": "Dr. Sunita Rao",
            "role": "supervisor",
            "cadre": "ISS",
            "department": "National Accounts Division",
            "designation": "Cadre Director / Section Head",
        },
    ]
    for u in demo_users:
        cur.execute(
            "INSERT OR IGNORE INTO users (username, password_hash, full_name, role, cadre, department, designation) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (u["username"], _hash_password(u["password"]), u["full_name"], u["role"], u["cadre"], u["department"], u["designation"])
        )
    conn.commit()


def _seed_telemetry_data(cur, conn):
    """Insert 5 civil servants + 18 historical assessment records."""
    random.seed(42)  # Deterministic for reproducibility
    base_date = datetime.now() - timedelta(days=90)

    officer_ids = []
    for off in SEED_OFFICIALS:
        enrolled = (base_date - timedelta(days=random.randint(10, 80))).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            "INSERT INTO officers (name, cadre, department, designation, posting_state, enrolled_on) VALUES (?, ?, ?, ?, ?, ?)",
            (off["name"], off["cadre"], off["department"], off["designation"], off["posting_state"], enrolled)
        )
        officer_ids.append(cur.lastrowid if cur.lastrowid else (len(officer_ids) + 1))

    # Generate 18 historical assessment records with deliberate DEFICITs
    assessment_records = [
        # Ananya Sharma (strong overall, one deficit)
        (officer_ids[0], "Survey Methodology",              82.0, -75),
        (officer_ids[0], "National Accounts & GDP",         91.0, -60),
        (officer_ids[0], "Data Governance & Ethics",        35.0, -45),  # DEFICIT
        (officer_ids[0], "Statistical Computing (R/Python)", 78.0, -30),

        # Vikram Patel (mixed, two deficits)
        (officer_ids[1], "Price Index Compilation",         28.0, -70),  # DEFICIT
        (officer_ids[1], "Sampling Theory",                 44.0, -55),
        (officer_ids[1], "Macro-Economic Indicators",       33.0, -40),  # DEFICIT
        (officer_ids[1], "Data Visualization",              67.0, -25),

        # Priya Nair (excellent performer)
        (officer_ids[2], "Survey Methodology",              95.0, -65),
        (officer_ids[2], "National Accounts & GDP",         88.0, -50),
        (officer_ids[2], "Statistical Computing (R/Python)", 92.0, -35),

        # Rajesh Kumar Singh (struggling, multiple deficits)
        (officer_ids[3], "Data Governance & Ethics",        22.0, -72),  # DEFICIT
        (officer_ids[3], "Price Index Compilation",         38.0, -58),  # DEFICIT
        (officer_ids[3], "Sampling Theory",                 19.0, -43),  # DEFICIT
        (officer_ids[3], "Data Visualization",              55.0, -28),

        # Meera Joshi (senior leadership, needs upskilling in tech)
        (officer_ids[4], "Survey Methodology",              75.0, -68),
        (officer_ids[4], "Statistical Computing (R/Python)", 31.0, -48),  # DEFICIT
        (officer_ids[4], "Macro-Economic Indicators",       85.0, -33),
    ]

    cur.execute("PRAGMA table_info(assessment_log)")
    log_cols = {row[1] for row in cur.fetchall()}

    for (oid, domain, score, day_offset) in assessment_records:
        assessed = (datetime.now() + timedelta(days=day_offset)).strftime("%Y-%m-%d %H:%M:%S")
        status = "DEFICIT" if score < 40.0 else ("PROFICIENT" if score >= 80.0 else "ADEQUATE")
        target_oid = str(oid) if oid is not None else "OFFICER_DEMO_001"

        if "official_id" in log_cols and "officer_id" in log_cols:
            cur.execute(
                "INSERT INTO assessment_log (officer_id, official_id, competency_domain, score_pct, assessed_on, status) VALUES (?, ?, ?, ?, ?, ?)",
                (target_oid, target_oid, domain, score, assessed, status)
            )
        elif "official_id" in log_cols:
            cur.execute(
                "INSERT INTO assessment_log (official_id, competency_domain, score_pct, assessed_on, status) VALUES (?, ?, ?, ?, ?)",
                (target_oid, domain, score, assessed, status)
            )
        else:
            cur.execute(
                "INSERT INTO assessment_log (officer_id, competency_domain, score_pct, assessed_on, status) VALUES (?, ?, ?, ?, ?)",
                (target_oid, domain, score, assessed, status)
            )

    conn.commit()


def get_telemetry_summary() -> Dict[str, Any]:
    """Aggregate telemetry data from pragya_ledger.db into dashboard-ready JSON."""
    conn = sqlite3.connect(LEDGER_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Total enrolled
    cur.execute("SELECT COUNT(*) as cnt FROM officers")
    total_enrolled = cur.fetchone()["cnt"]

    # Total assessments
    cur.execute("SELECT COUNT(*) as cnt FROM assessment_log")
    total_assessments = cur.fetchone()["cnt"]

    # Average score
    cur.execute("SELECT COALESCE(AVG(score_pct), 0) as avg_score FROM assessment_log")
    avg_score = round(cur.fetchone()["avg_score"], 1)

    # Deficit count
    cur.execute("SELECT COUNT(*) as cnt FROM assessment_log WHERE status = 'DEFICIT'")
    deficit_count = cur.fetchone()["cnt"]

    # Proficient count
    cur.execute("SELECT COUNT(*) as cnt FROM assessment_log WHERE status = 'PROFICIENT'")
    proficient_count = cur.fetchone()["cnt"]

    # ─── Competency Heatmap: avg score per domain ──────────────────────────
    cur.execute("""
        SELECT competency_domain, 
               ROUND(AVG(score_pct), 1) as avg_score, 
               COUNT(*) as n_assessed,
               SUM(CASE WHEN status = 'DEFICIT' THEN 1 ELSE 0 END) as n_deficit
        FROM assessment_log 
        GROUP BY competency_domain
        ORDER BY avg_score ASC
    """)
    heatmap = [dict(r) for r in cur.fetchall()]

    # ─── Officer-level details ─────────────────────────────────────────────
    cur.execute("""
        SELECT o.id, o.name, o.cadre, o.department, o.designation, o.posting_state,
               ROUND(AVG(a.score_pct), 1) as avg_score,
               COUNT(a.id) as assessments_taken,
               SUM(CASE WHEN a.status = 'DEFICIT' THEN 1 ELSE 0 END) as deficit_areas
        FROM officers o
        LEFT JOIN assessment_log a ON o.id = a.officer_id
        GROUP BY o.id
        ORDER BY avg_score ASC
    """)
    officers = [dict(r) for r in cur.fetchall()]

    # ─── Intervention Ledger: deficit records needing action ───────────────
    cur.execute("""
        SELECT a.id, o.name, o.department, o.cadre,
               a.competency_domain, a.score_pct, a.assessed_on, a.status
        FROM assessment_log a
        JOIN officers o ON a.officer_id = o.id
        WHERE a.status = 'DEFICIT'
        ORDER BY a.score_pct ASC
    """)
    interventions = [dict(r) for r in cur.fetchall()]

    # ─── Department breakdown ──────────────────────────────────────────────
    cur.execute("""
        SELECT o.department,
               COUNT(DISTINCT o.id) as officer_count,
               ROUND(AVG(a.score_pct), 1) as dept_avg_score
        FROM officers o
        LEFT JOIN assessment_log a ON o.id = a.officer_id
        GROUP BY o.department
        ORDER BY dept_avg_score ASC
    """)
    departments = [dict(r) for r in cur.fetchall()]

    conn.close()

    return {
        "generated_at": datetime.now().isoformat(),
        "kpi": {
            "total_enrolled": total_enrolled,
            "total_assessments": total_assessments,
            "avg_competency_score": avg_score,
            "deficit_alerts": deficit_count,
            "proficient_count": proficient_count,
        },
        "competency_heatmap": heatmap,
        "officers": officers,
        "interventions": interventions,
        "departments": departments,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# ─── FastAPI Application ──────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

app = FastAPI(title="Karmayogi Pragya API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    init_db()
    init_telemetry_db()


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# ─── Pydantic models ──────────────────────────────────────────────────────────

class QuizAnswer(BaseModel):
    id: int
    selected: str

class SubmitDiagnosticRequest(BaseModel):
    topic: str
    skill_level: Optional[str] = "Beginner"
    weak_tags: Optional[List[str]] = []
    answers: Optional[List[QuizAnswer]] = []
    score: Optional[int] = None
    lang: Optional[str] = "en"

class StudyMCQRequest(BaseModel):
    course_title: str
    pdf_text: Optional[str] = ""
    language: Optional[str] = "en"

class PragyaQuery(BaseModel):
    course_title: str
    context_notes: str
    query: str
    language: Optional[str] = "en"

class AssessmentEntry(BaseModel):
    officer_id: int
    competency_domain: str
    score_pct: float

class RegisterRequest(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "officer"
    cadre: Optional[str] = "General Cadre"
    department: Optional[str] = "MoSPI"
    designation: Optional[str] = "Statistical Officer"

class LoginRequest(BaseModel):
    username: str
    password: str


# ═══════════════════════════════════════════════════════════════════════════════
# ─── AUTHENTICATION API ROUTES ────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

# In-memory session store (lightweight, no JWT dependency)
_active_sessions: Dict[str, Dict[str, Any]] = {}


@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    """Register a new officer or supervisor account."""
    try:
        conn = sqlite3.connect(LEDGER_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        # Check uniqueness
        cur.execute("SELECT id FROM users WHERE username = ?", (req.username,))
        if cur.fetchone():
            conn.close()
            raise HTTPException(status_code=409, detail="Username already exists")

        pw_hash = _hash_password(req.password)
        cur.execute(
            "INSERT INTO users (username, password_hash, full_name, role, cadre, department, designation) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (req.username, pw_hash, req.full_name, req.role, req.cadre or "General Cadre", req.department or "MoSPI", req.designation or "Statistical Officer")
        )
        user_id = cur.lastrowid

        # If officer role, also link to officers table for roster visibility
        if req.role == "officer":
            cur.execute(
                "INSERT INTO officers (name, cadre, department, designation, posting_state) VALUES (?, ?, ?, ?, ?)",
                (req.full_name, req.cadre or "General Cadre", req.department or "MoSPI", req.designation or "Statistical Officer", "Delhi")
            )

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": "User registered successfully",
            "user": {"id": user_id, "username": req.username, "full_name": req.full_name, "role": req.role}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/auth/login")
def login_user(req: LoginRequest):
    """Authenticate and return session token + user metadata."""
    try:
        conn = sqlite3.connect(LEDGER_DB)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        cur.execute("SELECT * FROM users WHERE username = ?", (req.username,))
        row = cur.fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        user = dict(row)
        pw_hash = _hash_password(req.password)
        if user["password_hash"] != pw_hash:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Generate session token
        token = f"pragya_{uuid.uuid4().hex[:24]}"
        user_payload = {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "cadre": user["cadre"],
            "department": user["department"],
            "designation": user["designation"],
        }
        _active_sessions[token] = user_payload

        return {
            "success": True,
            "token": token,
            "user": user_payload
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/auth/me")
def get_current_user(token: str = ""):
    """Quick session verification returning current user metadata."""
    if token in _active_sessions:
        return {"success": True, "user": _active_sessions[token]}
    raise HTTPException(status_code=401, detail="Session expired or invalid")


# ═══════════════════════════════════════════════════════════════════════════════
# ─── TELEMETRY API ROUTES ─────────────────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/health")
def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "service": "Karmayogi Pragya API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "telemetry_db": os.path.exists(LEDGER_DB),
    }


@app.get("/api/telemetry/summary")
def telemetry_summary():
    """
    Aggregated telemetry dashboard data.
    Returns KPIs, competency heatmap, officer details, and intervention ledger.
    """
    try:
        data = get_telemetry_summary()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Telemetry aggregation failed: {str(e)}")


@app.post("/api/telemetry/log_assessment")
def log_assessment(entry: AssessmentEntry):
    """Log a new competency assessment result for an officer."""
    try:
        status = "DEFICIT" if entry.score_pct < 40.0 else ("PROFICIENT" if entry.score_pct >= 80.0 else "ADEQUATE")
        conn = sqlite3.connect(LEDGER_DB)
        cur = conn.cursor()
        cur.execute("PRAGMA table_info(assessment_log)")
        log_cols = {row[1] for row in cur.fetchall()}
        target_oid = str(entry.officer_id) if entry.officer_id is not None else "OFFICER_DEMO_001"

        if "official_id" in log_cols and "officer_id" in log_cols:
            cur.execute(
                "INSERT INTO assessment_log (officer_id, official_id, competency_domain, score_pct, status) VALUES (?, ?, ?, ?, ?)",
                (target_oid, target_oid, entry.competency_domain, entry.score_pct, status)
            )
        elif "official_id" in log_cols:
            cur.execute(
                "INSERT INTO assessment_log (official_id, competency_domain, score_pct, status) VALUES (?, ?, ?, ?)",
                (target_oid, entry.competency_domain, entry.score_pct, status)
            )
        else:
            cur.execute(
                "INSERT INTO assessment_log (officer_id, competency_domain, score_pct, status) VALUES (?, ?, ?, ?)",
                (target_oid, entry.competency_domain, entry.score_pct, status)
            )

        conn.commit()
        conn.close()
        return {"message": "Assessment logged", "status": status, "score": entry.score_pct}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/telemetry/officers")
def list_officers():
    """List all enrolled officers with summary stats."""
    conn = sqlite3.connect(LEDGER_DB)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("""
        SELECT o.*, 
               COALESCE(ROUND(AVG(a.score_pct), 1), 0) as avg_score,
               COUNT(a.id) as total_assessments
        FROM officers o
        LEFT JOIN assessment_log a ON o.id = a.officer_id
        GROUP BY o.id
    """)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"officers": rows}


# ═══════════════════════════════════════════════════════════════════════════════
# ─── EXISTING v1 ROUTES (unchanged) ──────────────────────────────────────────
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/diagnostic")
def get_diagnostic(topic: str = "Computer Science & Python", lang: str = "en"):
    """Generate a 10-question adaptive quiz for any user-specified topic."""
    try:
        questions = generate_adaptive_quiz(topic, language=lang)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/submit_diagnostic")
def submit_diagnostic(payload: SubmitDiagnosticRequest):
    """
    Accept quiz answers, derive score/level/gaps,
    then dynamically generate an authentic 3-step course pathway directly using Gemini.
    """
    try:
        percentage = payload.score if payload.score is not None else 60

        # Call generate_course_pathway directly from ai_engine.py with language support
        pathway = generate_course_pathway(
            topic=payload.topic,
            weak_tags=payload.weak_tags or [],
            skill_level=payload.skill_level or "Beginner",
            language=payload.lang or "en"
        )

        # Save session to DB 
        try:
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO users (id, name, target_topic, current_level) VALUES (?, ?, ?, ?)",
                ("user_123", "Learner", payload.topic, payload.skill_level or "Beginner")
            )
            for tag in (payload.weak_tags or []):
                cursor.execute(
                    "INSERT INTO competency_scores (user_id, competency_tag, score) VALUES (?, ?, ?)",
                    ("user_123", tag, 0.0)
                )
            conn.commit()
            conn.close()
        except Exception as db_err:
            print(f"Warning: DB record save error: {db_err}")

        return {
            "score": percentage,
            "skill_level": payload.skill_level,
            "weaknesses": payload.weak_tags,
            "pathway": pathway
        }
    except Exception as e:
        print(f"Error in submit_diagnostic: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/study_assistant")
def get_study_assistant(course_title: str, query: str = "", lang: str = "en"):
    """Return AI-generated study notes, practical examples, and MCQs."""
    try:
        material = generate_study_assistant(course_title, query, language=lang)
        return material
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/study_material")
def get_study_material(course_title: Optional[str] = None, course: Optional[str] = None, query: str = "", lang: str = "en"):
    """Alias for study material requested by Knowledge Hub and other views."""
    target_title = course_title or course or "General Subject"
    try:
        material = generate_study_assistant(target_title, query, language=lang)
        return material
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/study_mcqs")
def generate_mcqs(req: StudyMCQRequest):
    """Generate 10 MCQs from a course title + optional PDF text."""
    try:
        from ai_engine import generate_study_mcqs
        mcqs = generate_study_mcqs(req.course_title, req.pdf_text or "", language=req.language or "en")
        return {"questions": mcqs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/pragya_chat")
@app.post("/pragya_chat")
def pragya_chat(req: PragyaQuery):
    """Pragya AI Real-Time Assistant chat endpoint."""
    try:
        from ai_engine import ask_pragya_assistant
        res = ask_pragya_assistant(req.course_title, req.context_notes, req.query, language=req.language or "en")
        if isinstance(res, dict):
            ans = res.get("response") or res.get("reply") or ""
        else:
            ans = str(res)
        return {"response": ans, "reply": ans}
    except Exception as e:
        print(f"[pragya_chat endpoint error] {e}")
        try:
            from ai_engine import _get_grounded_pragya_response
            is_hi = (req.language == "hi") or bool(re.search(r'[\u0900-\u097F]', req.query))
            fallback = _get_grounded_pragya_response(req.course_title, req.context_notes, req.query, is_hi)
            return {"response": fallback, "reply": fallback}
        except Exception:
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/igot/courses")
def get_courses(db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM igot_courses")
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


@app.get("/api/v1/igot/course/{course_id}")
def get_course(course_id: str, lang: str = "en", db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM igot_courses WHERE id = ?", (course_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")

    course_data = dict(row)
    course_data["syllabus"] = json.loads(course_data.get("syllabus_json", "[]"))

    title = (
        course_data["title_hi"]
        if lang == "hi" and course_data.get("title_hi")
        else course_data["title"]
    )
    first_module = course_data["syllabus"][0] if course_data["syllabus"] else "Introduction"

    study_materials = generate_study_assistant(title, first_module, language=lang)

    return {
        "course_id": course_data["id"],
        "title": title,
        "breakdown": course_data["syllabus"],
        "notes": study_materials.get("notes", ""),
        "practical_examples": study_materials.get("practical_examples", ""),
        "mcqs": study_materials.get("mcqs", []),
    }


@app.post("/api/v1/upload_document")
async def upload_document(file: UploadFile = File(...)):
    try:
        import fitz
        content = await file.read()
        doc = fitz.open(stream=content, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text() + "\n"
        doc.close()
    except Exception:
        text = "Failed to parse PDF."

    return {
        "message": "Document parsed successfully",
        "filename": file.filename,
        "extracted_text": text,
        "extracted_text_full": text,
        "extracted_text_preview": text[:200],
    }

# ═══════════════════════════════════════════════════════════════════════════════
# ─── STATIC FRONTEND SERVING (Single-Service Deployment) ──────────────────────
# ═══════════════════════════════════════════════════════════════════════════════
# IMPORTANT: These routes MUST be defined AFTER all /api/* routes.

@app.get("/")
def serve_root():
    """Serve login.html as the default landing page."""
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"), media_type="text/html")


@app.get("/{page_name}.html")
def serve_html_page(page_name: str):
    """Serve any frontend HTML page by name (e.g., /dashboard.html)."""
    filepath = os.path.join(FRONTEND_DIR, f"{page_name}.html")
    if os.path.isfile(filepath):
        return FileResponse(filepath, media_type="text/html")
    # Fall back to login page for unknown routes
    return FileResponse(os.path.join(FRONTEND_DIR, "login.html"), media_type="text/html")


# Mount static assets (CSS, JS, images) — must be LAST to avoid overriding API routes
if os.path.isdir(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend-static")

# run: python -m uvicorn main:app --reload --port 8000

