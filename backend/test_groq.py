import sys
import os
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__)))
load_dotenv()

from ai_engine import _call_groq

try:
    print("Testing Groq...")
    raw = _call_groq("Hello, please return a JSON object with a key 'message' and value 'success'.", temperature=0.1)
    print("Raw output:")
    print(raw)
except Exception as e:
    print(f"Error: {e}")
