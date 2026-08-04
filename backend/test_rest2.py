import os
import requests
from dotenv import load_dotenv

load_dotenv()

def test_rest():
    api_key = os.environ.get("GEMINI_API_KEY")
    
    urls = [
        f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key={api_key}",
        f"https://generativelanguage.googleapis.com/v1beta/models/embedding-001:batchEmbedContents?key={api_key}",
        f"https://generativelanguage.googleapis.com/v1/models/text-embedding-004:batchEmbedContents?key={api_key}",
        f"https://generativelanguage.googleapis.com/v1/models/embedding-001:batchEmbedContents?key={api_key}"
    ]
    
    for url in urls:
        print(f"\nTesting URL: {url.split('?')[0]}")
        model_name = "models/text-embedding-004" if "text-embedding-004" in url else "models/embedding-001"
        payload = {
            "requests": [
                {
                    "model": model_name,
                    "content": {"parts": [{"text": "Hello"}]}
                }
            ]
        }
        
        resp = requests.post(url, json=payload)
        print("Status:", resp.status_code)
        if resp.status_code != 200:
            print("Response:", resp.text)
        else:
            print("Success!")

if __name__ == "__main__":
    test_rest()
