import requests, os
from dotenv import load_dotenv
load_dotenv()
url = 'https://api.groq.com/openai/v1/chat/completions'
headers = {'Authorization': f"Bearer {os.getenv('GROQ_API_KEY')}", 'Content-Type': 'application/json'}
payload = {
    'model': 'openai/gpt-oss-20b',
    'messages': [{'role': 'user', 'content': 'You MUST respond ONLY with a raw JSON object containing a "questions" key with an array of exactly 10 objects:\n{\n  "questions": [\n    {\n      "id": 1,\n      "question": "Sample question text specific to test?",\n      "options": ["Option A", "Option B", "Option C", "Option D", "I don\'t know / Need guidance"],\n      "correct_option": "Option A",\n      "difficulty": "Easy",\n      "competency_tag": "Specific Tag"\n    }\n  ]\n}'}],
    'response_format': {'type': 'json_object'}
}
r = requests.post(url, headers=headers, json=payload)
print(r.status_code)
print(r.text)
