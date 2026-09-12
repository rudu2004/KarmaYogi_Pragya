topic = "Python Data Structures"
try:
    prompt = f"""
    You MUST respond ONLY with a raw JSON object containing a "questions" key with an array of exactly 10 objects:
    {{
      "questions": [
        {{
          "id": 1,
          "question": "Sample question text specific to {topic}?",
          "options": ["Option A", "Option B", "Option C", "Option D", "I don't know / Need guidance"],
          "correct_option": "Option A",
          "difficulty": "Easy",
          "competency_tag": "Specific Tag"
        }}
      ]
    }}
    """
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
