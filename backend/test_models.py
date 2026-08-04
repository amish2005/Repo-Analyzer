import os
from google import genai

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

try:
    models = client.models.list()
    for model in models:
        if "embedContent" in model.supported_generation_methods:
            print(f"Embedding model found: {model.name}")
            print(f"Supported methods: {model.supported_generation_methods}")
except Exception as e:
    print(f"Error listing models: {e}")
