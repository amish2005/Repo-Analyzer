from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

try:
    embeddings = FastEmbedEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2", threads=1)
    print("SUCCESS: FastEmbedEmbeddings accepts threads=1")
except Exception as e:
    print(f"FAILED: {e}")
