import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
response = requests.get(url)
models = response.json().get("models", [])

for m in models:
    if "embed" in m["name"].lower() or "embedding" in m["name"].lower():
        print(f"Model: {m['name']}, Supported Methods: {m.get('supportedGenerationMethods')}")
