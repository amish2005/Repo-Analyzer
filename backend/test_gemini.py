from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv
import os

load_dotenv()

models_to_test = [
    "models/text-embedding-004",
    "text-embedding-004",
    "models/embedding-001",
    "embedding-001"
]

for model_name in models_to_test:
    try:
        embeddings = GoogleGenerativeAIEmbeddings(model=model_name)
        result = embeddings.embed_documents(["Hello world"])
        print(f"SUCCESS: {model_name} works! Vector length: {len(result[0])}")
    except Exception as e:
        print(f"FAILED: {model_name} - {type(e).__name__}: {str(e)}")
