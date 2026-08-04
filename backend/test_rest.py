import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_rest():
    api_key = os.environ.get("GEMINI_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={api_key}"
    payload = {
        "requests": [
            {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": "Hello"}]}
            },
            {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": "World"}]}
            }
        ]
    }
    
    resp = requests.post(url, json=payload)
    print(resp.status_code)
    print(resp.text[:500])

if __name__ == "__main__":
    test_rest()
