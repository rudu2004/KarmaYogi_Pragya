import sys
import os
import requests
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__)))
load_dotenv()

api_key = os.environ.get("GROQ_API_KEY")

url = "https://api.groq.com/openai/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
payload = {
    "model": "openai/gpt-oss-20b",
    "messages": [{"role": "user", "content": "Return a JSON object with key 'success' and value true."}],
    "temperature": 0.1,
    "response_format": {"type": "json_object"}
}
print("Making request...")
resp = requests.post(url, headers=headers, json=payload, timeout=10)
print(resp.status_code)
print(resp.text)
