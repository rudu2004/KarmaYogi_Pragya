import requests
import json

# --- CONFIGURATION ---
SKILL_GAP_API = "http://localhost:8000/analyze-skill-gap"
RECOMMENDATION_API = "http://localhost:8001/get-recommendations"

# --- 1. SIMULATE USER INPUT ---
print("👤 SIMULATING USER LOGIN...")

# IMPROVED PROFILE: We simply state what we know. We omit the skills we don't know.
# This prevents the AI from getting confused by negative sentences like "I never used X".
user_profile = """
I am a junior data analyst with 3 years of experience. 
I am highly proficient in Python, SQL, and Data Visualization using Tableau. 
I have good knowledge of machine learning algorithms and data cleaning. 
I am familiar with R programming at a basic level. 
I am good at report writing and analytical thinking.
"""
target_role = "Statistical Officer"

print(f"Role: {target_role}")
print(f"Profile: {user_profile[:50]}...\n")

# --- 2. CALL ENGINE 1: SKILL GAP ANALYSIS ---
print("🔍 STEP 1: Analyzing Skill Gaps...")
try:
    response_gap = requests.post(SKILL_GAP_API, params={
        "profile_text": user_profile,
        "role": target_role
    })
    
    if response_gap.status_code == 200:
        gap_data = response_gap.json()
        print("\n📋 FULL RESPONSE:", json.dumps(gap_data, indent=2))  # ADD THIS LINE
        identified_gaps = gap_data["identified_gaps"]
        strengths = gap_data["strengths"]
        
        # DEBUG: Print detailed assessment
        print("\n📊 DETAILED SKILL SCORES:")
        for assessment in gap_data["detailed_assessment"]:
            score = assessment["similarity_score"]
            status = assessment["status"]
            print(f"  {assessment['skill_name']:30} | Score: {score:.4f} | {status}")
        
        print(f"\n✅ Analysis Complete!")
        print(f"💪 Strengths found: {strengths}")
        print(f"⚠️  Skill Gaps identified: {identified_gaps}\n")
        
except Exception as e:
    print(f"❌ Could not connect to Skill Gap API. Is it running on port 8000? Error: {e}")
    exit()

# --- 3. CALL ENGINE 2: COURSE RECOMMENDATIONS ---
if not identified_gaps:
    print("🎉 No skill gaps found! You are fully competent for this role.")
    exit()

print("📚 STEP 2: Generating Course Recommendations...")
try:
    # FIX: Use 'json=' instead of 'params=' to send the list correctly in the body
    response_rec = requests.post(
    f"{RECOMMENDATION_API}?top_courses_per_gap=1",
    json=identified_gaps
)
    
    
    if response_rec.status_code == 200:
        rec_data = response_rec.json()
        
        print("✅ Recommendations Generated!\n")
        print("="*50)
        print("🎯 YOUR PERSONALIZED LEARNING PATHWAY:")
        print("="*50)
        
        for item in rec_data["personalized_pathway"]:
            print(f"\n⚠️  GAP: {item['skill_gap']}")
            if item['recommended_courses']:
                course = item['recommended_courses'][0]
                print(f"    RECOMMENDED COURSE: {course['title']}")
                print(f"   📖 DESCRIPTION: {course['description']}")
                print(f"   📊 RELEVANCE SCORE: {course['relevance_score']}")
            else:
                print("    No specific course found in catalog.")
                
        print("\n" + "="*50)
        print("🏁 END OF SIMULATION")
        
    else:
        print(f"❌ Error in Recommendation API: {response_rec.text}")

except Exception as e:
    print(f"❌ Could not connect to Recommendation API. Is it running on port 8001? Error: {e}")