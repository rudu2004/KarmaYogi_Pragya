import os
import pandas as pd
from typing import Dict, List

def load_competency_framework(excel_path: str = "competency_framework.xlsx") -> Dict[str, Dict[str, List[str]]]:
    """
    Loads competency framework from Excel file.
    Expected columns: Role, Domain, Skill, Required_Level
    """
    base_dir = os.path.dirname(__file__)
    full_path = os.path.join(base_dir, excel_path)
    try:
        df = pd.read_excel(full_path)
        
        framework = {}
        for _, row in df.iterrows():
            role = str(row['Role'])
            domain = str(row['Domain'])
            skill = str(row['Skill'])
            
            if role not in framework:
                framework[role] = {}
            if domain not in framework[role]:
                framework[role][domain] = []
            
            framework[role][domain].append(skill)
        
        print(f"Loaded {len(framework)} roles from competency framework")
        return framework
    
    except FileNotFoundError:
        print(f"Warning: {excel_path} not found. Using empty framework.")
        return {}
    except Exception as e:
        print(f"Error loading competency framework: {e}")
        return {}

def load_course_catalog(excel_path: str = "igot_courses.xlsx") -> List[Dict]:
    """
    Loads iGOT course catalog from Excel file.
    Expected columns: Course_ID, Title, Description, Domain, Target_Skills
    """
    base_dir = os.path.dirname(__file__)
    full_path = os.path.join(base_dir, excel_path)
    try:
        df = pd.read_excel(full_path)
        
        courses = []
        for _, row in df.iterrows():
            # Handle Target_Skills - could be comma-separated string or list
            target_skills = row['Target_Skills']
            if isinstance(target_skills, str):
                skills_list = [s.strip() for s in target_skills.split(',')]
            else:
                skills_list = [str(target_skills)]
            
            courses.append({
                "course_id": str(row['Course_ID']),
                "title": str(row['Title']),
                "description": str(row['Description']),
                "domain": str(row['Domain']),
                "target_skills": skills_list
            })
        
        print(f"Loaded {len(courses)} courses from catalog")
        return courses
    
    except FileNotFoundError:
        print(f"Warning: {excel_path} not found. Using empty catalog.")
        return []
    except Exception as e:
        print(f"Error loading course catalog: {e}")
        return []

# Test the loader
if __name__ == "__main__":
    print("Testing data loader...")
    framework = load_competency_framework()
    print("\nRoles loaded:", list(framework.keys()))
    
    courses = load_course_catalog()
    print(f"\nFirst course: {courses[0]['title'] if courses else 'None'}")