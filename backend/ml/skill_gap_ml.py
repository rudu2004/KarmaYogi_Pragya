import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import Dict, List, Any
from pydantic import BaseModel
try:
    from ml.data_loader import load_competency_framework
except ModuleNotFoundError:
    from data_loader import load_competency_framework

# --- 1. Basic Configuration ---
app = FastAPI(
    title="SIH 2026 - Lightweight ML Skill Gap Engine",
    description="High-performance TF-IDF competency mapping with zero startup RAM overhead.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Load Competency Framework from Excel ---
ROLE_COMPETENCY_FRAMEWORK = load_competency_framework("competency_framework.xlsx")
if not ROLE_COMPETENCY_FRAMEWORK:
    ROLE_COMPETENCY_FRAMEWORK = {}

# --- 3. Pydantic Models for Structured Output ---
class SkillAssessment(BaseModel):
    skill_name: str
    domain: str
    similarity_score: float
    proficiency_level: str  # "Proficient", "Partial", or "Gap"
    status: str  # "Has Skill" or "Skill Gap Identified"

class SkillGapReport(BaseModel):
    user_role: str
    total_skills_assessed: int
    skills_proficient: int
    skills_with_gaps: int
    overall_competency_percentage: float
    detailed_assessment: List[SkillAssessment]
    strengths: List[str]
    identified_gaps: List[str]
    summary: str

# --- 4. Helper: Split text into sentences ---
def split_into_sentences(text: str) -> List[str]:
    """Splits a paragraph into individual sentences for better matching."""
    sentences = re.split(r'(?<=[.!?]) +', text)
    return [s.strip() for s in sentences if len(s.strip()) > 5]

# --- 5. Core ML Logic: TF-IDF Max Similarity (Zero-RAM, CPU-friendly) ---
def calculate_skill_similarity(user_profile: str, target_role: str) -> Dict[str, Any]:
    """
    Evaluates skill gap by computing TF-IDF cosine similarity between
    user profile sentences and required competencies.
    """
    sentences = split_into_sentences(user_profile)
    if not sentences:
        sentences = [user_profile]

    framework = ROLE_COMPETENCY_FRAMEWORK.get(target_role)
    if not framework:
        framework = list(ROLE_COMPETENCY_FRAMEWORK.values())[0] if ROLE_COMPETENCY_FRAMEWORK else {"General": ["Basic Knowledge", "Advanced Application"]}

    all_assessments = []
    strengths = []
    gaps = []

    # Threshold calibrated for TF-IDF character/word n-gram similarity
    PROFICIENCY_THRESHOLD = 0.20

    # Initialize TF-IDF Vectorizer
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
    try:
        all_corpus = sentences.copy()
        for skills in framework.values():
            all_corpus.extend(skills)
        vectorizer.fit(all_corpus)
        user_vecs = vectorizer.transform(sentences)
    except Exception:
        user_vecs = None

    for domain, skills in framework.items():
        for skill in skills:
            max_sim = 0.0
            if user_vecs is not None:
                try:
                    skill_vec = vectorizer.transform([skill])
                    sims = cosine_similarity(skill_vec, user_vecs)[0]
                    max_sim = float(np.max(sims)) if len(sims) > 0 else 0.0
                except Exception:
                    max_sim = 0.0
            else:
                # Token-set overlap fallback
                skill_tokens = set(re.findall(r'\w+', skill.lower()))
                profile_tokens = set(re.findall(r'\w+', user_profile.lower()))
                overlap = len(skill_tokens & profile_tokens)
                max_sim = float(overlap / max(1, len(skill_tokens)))

            if max_sim >= PROFICIENCY_THRESHOLD:
                proficiency = "Proficient"
                status = "Has Skill"
                strengths.append(skill)
            else:
                proficiency = "Gap"
                status = "Skill Gap Identified"
                gaps.append(skill)

            all_assessments.append(SkillAssessment(
                skill_name=skill,
                domain=domain,
                similarity_score=round(max_sim, 4),
                proficiency_level=proficiency,
                status=status
            ))

    total_skills = len(all_assessments)
    proficient_count = len(strengths)
    gap_count = len(gaps)
    competency_percentage = round((proficient_count / total_skills) * 100, 2) if total_skills > 0 else 0

    summary = f"The candidate shows {proficient_count} out of {total_skills} required competencies ({competency_percentage}%). "
    if gap_count > 0:
        summary += f"Priority upskilling needed in {gap_count} areas."
    else:
        summary += "Candidate meets all competency requirements."

    report = SkillGapReport(
        user_role=target_role,
        total_skills_assessed=total_skills,
        skills_proficient=proficient_count,
        skills_with_gaps=gap_count,
        overall_competency_percentage=competency_percentage,
        detailed_assessment=all_assessments,
        strengths=strengths,
        identified_gaps=gaps,
        summary=summary
    )

    return report.model_dump()

# --- 6. FastAPI Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Lightweight Skill Gap Engine"}

@app.get("/get-available-roles")
def get_roles():
    return {"roles": list(ROLE_COMPETENCY_FRAMEWORK.keys())}

@app.post("/analyze-skill-gap", response_model=SkillGapReport)
def analyze_skill_gap(profile_text: str, role: str):
    if not profile_text.strip():
        raise HTTPException(status_code=400, detail="Profile text cannot be empty")
    if role not in ROLE_COMPETENCY_FRAMEWORK:
        raise HTTPException(status_code=404, detail=f"Role '{role}' not found.")
    try:
        return calculate_skill_similarity(profile_text, role)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")