import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict, Any
from pydantic import BaseModel
from data_loader import load_course_catalog

# --- 1. Basic Configuration ---
app = FastAPI(
    title="SIH 2026 - AI Course Recommendation Engine",
    description="Semantic search engine to recommend iGOT Karmayogi courses based on skill gaps.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. Load the Local ML Model (Reusing the same one for consistency) ---
print("Loading local ML model for recommendations...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("ML Model loaded successfully!")

# --- 3. Load iGOT Course Catalog from Excel ---
print("Loading iGOT course catalog from Excel...")
IGOT_COURSE_CATALOG = load_course_catalog("igot_courses.xlsx")

if not IGOT_COURSE_CATALOG:
    print("⚠️  WARNING: No courses loaded! Please check your Excel file.")


# --- 4. Pre-compute Course Vectors (Optimization) ---
# We convert all course descriptions into vectors ONCE when the server starts.
# This makes the recommendation process lightning-fast.
print("Vectorizing course catalog...")
course_texts = [f"{c['title']} {c['description']} {' '.join(c['target_skills'])}" for c in IGOT_COURSE_CATALOG]
course_embeddings = model.encode(course_texts)
print(f"Vectorized {len(IGOT_COURSE_CATALOG)} courses.")

# --- 5. Pydantic Models for Structured Output ---
class RecommendedCourse(BaseModel):
    course_id: str
    title: str
    description: str
    domain: str
    relevance_score: float  # How closely it matches the skill gap (0.0 to 1.0)

class GapRecommendation(BaseModel):
    skill_gap: str
    recommended_courses: List[RecommendedCourse]

class LearningPathway(BaseModel):
    total_gaps_addressed: int
    personalized_pathway: List[GapRecommendation]
    summary: str

# --- 6. Core ML Logic: Semantic Search ---
def recommend_courses_for_gaps(skill_gaps: List[str], top_n: int = 2) -> Dict[str, Any]:
    """
    Takes a list of skill gaps and uses Semantic Search to find the best matching courses.
    """
    if not skill_gaps:
        return {"total_gaps_addressed": 0, "personalized_pathway": [], "summary": "No skill gaps identified. No recommendations needed."}

    # Convert the list of skill gaps into vectors
    gap_embeddings = model.encode(skill_gaps)
    
    pathway = []
    
    for i, gap in enumerate(skill_gaps):
        # Calculate similarity between THIS gap and ALL courses
        similarities = cosine_similarity([gap_embeddings[i]], course_embeddings)[0]
        
        # Get the indices of the top N most similar courses
        top_indices = np.argsort(similarities)[::-1][:top_n]
        
        recommended_courses = []
        for idx in top_indices:
            course = IGOT_COURSE_CATALOG[idx]
            # Only recommend if the similarity is reasonably high (> 0.2)
            if similarities[idx] > 0.2:
                recommended_courses.append(RecommendedCourse(
                    course_id=course["course_id"],
                    title=course["title"],
                    description=course["description"],
                    domain=course["domain"],
                    relevance_score=round(float(similarities[idx]), 4)
                ))
        
        pathway.append(GapRecommendation(
            skill_gap=gap,
            recommended_courses=recommended_courses
        ))
        
    summary = f"Generated a personalized learning pathway addressing {len(skill_gaps)} skill gaps with {len(pathway[0].recommended_courses) if pathway else 0} top course recommendations per gap."
    
    return LearningPathway(
        total_gaps_addressed=len(skill_gaps),
        personalized_pathway=pathway,
        summary=summary
    ).model_dump()

# --- 7. FastAPI Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "Recommendation Engine"}

@app.post("/get-recommendations", response_model=LearningPathway)
def get_course_recommendations(skill_gaps: List[str], top_courses_per_gap: int = 2):
    """
    MAIN ENDPOINT: Takes a list of identified skill gaps and recommends iGOT courses.
    """
    if not skill_gaps:
        raise HTTPException(status_code=400, detail="skill_gaps list cannot be empty.")
    
    try:
        return recommend_courses_for_gaps(skill_gaps, top_courses_per_gap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")

@app.get("/get-catalog")
def get_catalog():
    """View the mock iGOT course catalog."""
    return {"total_courses": len(IGOT_COURSE_CATALOG), "courses": IGOT_COURSE_CATALOG}

# To run the server:
# uvicorn recommendation_engine:app --reload
#http://127.0.0.1:8000/docs