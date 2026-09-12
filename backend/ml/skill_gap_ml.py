import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
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
    title="SIH 2026 - Local ML Skill Gap Engine",
    description="Custom ML Engine for competency mapping without external APIs.",
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
print("Loading competency framework from Excel...")
ROLE_COMPETENCY_FRAMEWORK = load_competency_framework("competency_framework.xlsx")

if not ROLE_COMPETENCY_FRAMEWORK:
    print("  WARNING: No competency framework loaded! Please check your Excel file.")

# --- 3. Load the Local ML Model ---
print("Loading local ML model... (This takes a few seconds on first run)")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("ML Model loaded successfully!")

# --- 4. Pydantic Models for Structured Output ---
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

# --- 5. Helper: Split text into sentences ---
def split_into_sentences(text: str) -> List[str]:
    """Splits a paragraph into individual sentences for better matching."""
    # Split by period, exclamation, or question mark followed by a space
    sentences = re.split(r'(?<=[.!?]) +', text)
    # Filter out very short fragments
    return [s.strip() for s in sentences if len(s.strip()) > 5]

# --- 6. Core ML Logic: Sentence-Level Max Similarity ---
def calculate_skill_similarity(user_profile: str, target_role: str) -> Dict[str, Any]:
    """
    CORE ML FUNCTION: Uses Sentence-Level Max Similarity to find skill gaps.
    """
    
    # Step 1: Split user profile into sentences
    sentences = split_into_sentences(user_profile)
    if not sentences:
        sentences = [user_profile] # Fallback if no punctuation found
        
    # Encode all user sentences into vectors at once
    sentence_embeddings = model.encode(sentences)
    
    # Step 2: Get all skills for the target role
    framework = ROLE_COMPETENCY_FRAMEWORK.get(target_role)
    if not framework:
        # Fallback: if role not found, use a generic one based on the first available role or an empty dict
        framework = list(ROLE_COMPETENCY_FRAMEWORK.values())[0] if ROLE_COMPETENCY_FRAMEWORK else {"General": ["Basic Knowledge", "Advanced Application"]}
    
    all_assessments = []
    strengths = []
    gaps = []

# THRESHOLDS: Adjusted for better detection
    PROFICIENCY_THRESHOLD = 0.30  # If max similarity > 0.30, they have the skill

    for domain, skills in framework.items():
        # Convert all skills in this domain to vectors
        skill_embeddings = model.encode(skills)
        
        for i, skill in enumerate(skills):
            # Calculate cosine similarity between THIS specific skill and ALL user sentences
            similarities = cosine_similarity([skill_embeddings[i]], sentence_embeddings)[0]
            
            # Find the MAXIMUM similarity score (if ANY sentence mentions it well)
            max_similarity = float(max(similarities))
            
            # Determine proficiency level - BINARY: either you have it or you don't
            if max_similarity >= PROFICIENCY_THRESHOLD:
                proficiency = "Proficient"
                status = "Has Skill"
                strengths.append(skill)
            else:
                # Everything below threshold is a GAP
                proficiency = "Gap"
                status = "Skill Gap Identified"
                gaps.append(skill)
            
            assessment = SkillAssessment(
                skill_name=skill,
                domain=domain,
                similarity_score=round(max_similarity, 4),
                proficiency_level=proficiency,
                status=status
            )
            all_assessments.append(assessment)
    
    # Calculate overall metrics
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

# --- 7. FastAPI Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Local ML Skill Gap Engine"}

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
        report = calculate_skill_similarity(profile_text, role)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ML analysis failed: {str(e)}")

# To run the server:
# uvicorn skill_gap_ml:app --reload