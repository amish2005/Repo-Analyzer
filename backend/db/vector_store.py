import os
from supabase import create_client, Client
from langchain_community.vectorstores import SupabaseVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_core.documents import Document
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
else:
    supabase = None

# Using Google's incredibly fast Embedding API to offload CPU work globally
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004", 
    google_api_key=os.environ.get("GEMINI_API_KEY")
)

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    chunks = []
    lines = text.split('\n')
    current_chunk = []
    current_len = 0
    for line in lines:
        if current_len + len(line) > chunk_size and current_chunk:
            chunks.append('\n'.join(current_chunk))
            overlap_len = 0
            overlap_chunk = []
            for l in reversed(current_chunk):
                if overlap_len + len(l) > overlap:
                    break
                overlap_chunk.insert(0, l)
                overlap_len += len(l) + 1
            current_chunk = overlap_chunk
            current_len = overlap_len
            
        current_chunk.append(line)
        current_len += len(line) + 1
        
    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    return chunks

import gc

def store_code_chunks(project_id: str, chunks: list[dict]):
    """
    Stores code chunks into Supabase pgvector by generating embeddings remotely.
    """
    if not supabase:
        print("Supabase client not initialized")
        return
        
    # Clear existing embeddings for this project to prevent duplicates during re-analysis
    supabase.table("code_embeddings").delete().eq("project_id", project_id).execute()
        
    split_docs = []
    for chunk in chunks:
        # First, add the full file
        split_docs.append({
            "file_path": chunk["file_path"],
            "content": chunk["content"],
            "is_full_file": True
        })
        
        # Then add chunks
        splits = chunk_text(chunk["content"])
        for split in splits:
            split_docs.append({
                "file_path": chunk["file_path"],
                "content": split,
                "is_full_file": False
            })
            
    texts = [d["content"] for d in split_docs]
    print(f"Prepared {len(texts)} semantic segments (including full files) for embedding.")
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    import os
    from tenacity import retry, stop_after_attempt, wait_exponential
    
    # Use Google's incredibly fast Embedding API to offload CPU work
    # Updated to text-embedding-005
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004", 
        google_api_key=os.environ.get("GEMINI_API_KEY")
    )
    
    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=60))
    def embed_with_retry(texts_batch):
        return embeddings.embed_documents(texts_batch)
    
    # Generate embeddings remotely in large batches
    vectors = []
    batch_size = 100 # Google API can handle much larger batches easily
    total_batches = (len(texts) + batch_size - 1) // batch_size
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i + batch_size]
        print(f"Embedding batch {i // batch_size + 1} of {total_batches}...", flush=True)
        batch_vectors = embed_with_retry(batch_texts)
        # text-embedding-005 uses Matryoshka Representation, meaning we can simply slice the first 384 dimensions
        # to remain perfectly compatible with our existing pgvector(384) Supabase schema!
        vectors.extend([v[:384] for v in batch_vectors])
    
    records = []
    for i, doc in enumerate(split_docs):
        records.append({
            "project_id": project_id,
            "file_path": doc["file_path"],
            "content": doc["content"],
            "embedding": vectors[i],
            "metadata": {"file_path": doc["file_path"], "is_full_file": doc["is_full_file"]}
        })
        
    # Bulk insert into Supabase
    supabase.table("code_embeddings").insert(records).execute()
    
    print("Successfully stored all embeddings in Supabase!")
    return None

def search_code_chunks(query: str, project_id: str, limit: int = 5) -> str:
    """
    Embeds the query and searches Supabase for relevant code snippets using the match_code_chunks RPC.
    """
    if not supabase:
        return "Database connection unavailable."
        
    try:
        from tenacity import retry, stop_after_attempt, wait_exponential
        @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=2, max=10))
        def embed_query_with_retry(q):
            return embeddings.embed_query(q)
            
        # Generate embedding for the query and slice to 384d
        query_vector = embed_query_with_retry(query)[:384]
        
        # Call the RPC function defined in supabase_alter_vector.sql
        res = supabase.rpc("match_code_chunks", {
            "query_embedding": query_vector,
            "match_threshold": 0.0,
            "match_count": limit,
            "p_project_id": project_id
        }).execute()
        
        if not res.data:
            return "No relevant code snippets found."
            
        results = []
        for item in res.data:
            results.append(f"File: {item.get('file_path')}\nContent:\n{item.get('content')}\n---")
            
        return "\n\n".join(results)
    except Exception as e:
        print(f"Error searching code chunks: {e}")
        return f"Error occurred while searching the codebase: {e}"

def append_chat_message(session_id: str, role: str, content: str):
    """
    Appends a message to the chat_sessions table jsonb array.
    """
    if not supabase:
        return None
        
    # Fetch existing
    res = supabase.table("chat_sessions").select("messages").eq("id", session_id).execute()
    if not res.data:
        # Create a new session
        messages = [{"role": role, "content": content}]
        try:
            insert_res = supabase.table("chat_sessions").insert({"id": session_id, "messages": messages}).execute()
            return insert_res.data
        except Exception as e:
            print(f"Error creating chat session: {e}")
            return None
        
    messages = res.data[0].get("messages", [])
    messages.append({"role": role, "content": content})
    
    # Update
    update_res = supabase.table("chat_sessions").update({"messages": messages}).eq("id", session_id).execute()
    return update_res.data

def get_chat_history(session_id: str):
    if not supabase:
        return []
    res = supabase.table("chat_sessions").select("messages").eq("id", session_id).execute()
    if res.data:
        return res.data[0].get("messages", [])
    return []
