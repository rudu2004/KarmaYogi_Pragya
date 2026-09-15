import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Any
from pydantic import BaseModel
try:
    from ml.data_loader import load_course_catalog
except ModuleNotFoundError:
    from data_loader import load_course_catalog

# --- 1. Basic Configuration ---
app = FastAPI(
    title="SIH 2026 - Lightweight Course Recommendation Engine",
    description="TF-IDF semantic matching engine to recommend iGOT Karmayogi courses with zero startup RAM overhead.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Load iGOT Course Catalog from Excel ---
IGOT_COURSE_CATALOG = load_course_catalog("igot_courses.xlsx")
if not IGOT_COURSE_CATALOG:
    IGOT_COURSE_CATALOG = []

# --- 3. Pre-compute Course Texts & Lightweight TF-IDF Index ---
course_texts = [f"{c.get('title', '')} {c.get('description', '')} {' '.join(c.get('target_skills', []))}" for c in IGOT_COURSE_CATALOG]

if course_texts:
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
    course_vectors = vectorizer.fit_transform(course_texts)
else:
    vectorizer = None
    course_vectors = None

# --- 4. Pydantic Models for Structured Output ---
class RecommendedCourse(BaseModel):
    course_id: str
    title: str
    description: str
    domain: str
    relevance_score: float

class GapRecommendation(BaseModel):
    skill_gap: str
    recommended_courses: List[RecommendedCourse]

class LearningPathway(BaseModel):
    total_gaps_addressed: int
    personalized_pathway: List[GapRecommendation]
    summary: str

# --- 5. Core Recommendation Logic ---
def recommend_courses_for_gaps(skill_gaps: List[str], top_n: int = 2) -> Dict[str, Any]:
    """
    Takes a list of skill gaps and uses TF-IDF cosine similarity to find the best matching courses.
    """
    if not skill_gaps or not IGOT_COURSE_CATALOG:
        return {"total_gaps_addressed": 0, "personalized_pathway": [], "summary": "No skill gaps identified or catalog empty."}

    pathway = []

    for gap in skill_gaps:
        recommended_courses = []

        if vectorizer is not None and course_vectors is not None:
            try:
                gap_vec = vectorizer.transform([gap])
                sims = cosine_similarity(gap_vec, course_vectors)[0]
                top_indices = np.argsort(sims)[::-1][:top_n]
                for idx in top_indices:
                    course = IGOT_COURSE_CATALOG[idx]
                    score = round(float(sims[idx]), 4)
                    if score > 0.05 or len(recommended_courses) == 0:
                        recommended_courses.append(RecommendedCourse(
                            course_id=str(course.get("course_id", "")),
                            title=course.get("title", ""),
                            description=course.get("description", ""),
                            domain=course.get("domain", ""),
                            relevance_score=max(score, 0.45)
                        ))
            except Exception:
                pass

        # Fallback: keyword matching if TF-IDF scores are empty
        if not recommended_courses:
            gap_words = set(gap.lower().split())
            scores = []
            for idx, c in enumerate(IGOT_COURSE_CATALOG):
                ctext = f"{c.get('title', '')} {c.get('description', '')}".lower()
                matches = sum(1 for w in gap_words if w in ctext)
                scores.append((matches, idx))
            scores.sort(reverse=True, key=lambda x: x[0])
            for matches, idx in scores[:top_n]:
                course = IGOT_COURSE_CATALOG[idx]
                recommended_courses.append(RecommendedCourse(
                    course_id=str(course.get("course_id", "")),
                    title=course.get("title", ""),
                    description=course.get("description", ""),
                    domain=course.get("domain", ""),
                    relevance_score=0.75 if matches > 0 else 0.50
                ))

        pathway.append(GapRecommendation(
            skill_gap=gap,
            recommended_courses=recommended_courses
        ))

    summary = f"Generated a personalized learning pathway addressing {len(skill_gaps)} skill gaps with top course recommendations."

    return LearningPathway(
        total_gaps_addressed=len(skill_gaps),
        personalized_pathway=pathway,
        summary=summary
    ).model_dump()

# --- 6. FastAPI Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Lightweight Recommendation Engine"}

@app.post("/get-recommendations", response_model=LearningPathway)
def get_course_recommendations(skill_gaps: List[str], top_courses_per_gap: int = 2):
    if not skill_gaps:
        raise HTTPException(status_code=400, detail="skill_gaps list cannot be empty.")
    try:
        return recommend_courses_for_gaps(skill_gaps, top_courses_per_gap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.get("/get-catalog")
def get_catalog():
    return {"total_courses": len(IGOT_COURSE_CATALOG), "courses": IGOT_COURSE_CATALOG}