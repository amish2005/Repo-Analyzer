from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.graph import repo_macro_agent_app
from agents.state import CodebaseState
from db.vector_store import store_code_chunks, append_chat_message, get_chat_history, supabase
from utils.github_parser import clone_and_parse_repo

app = FastAPI(title="RepoScope AI Backend")

# Allow CORS so Next.js frontend can communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    github_url: str
    user_id: str

class ChatRequest(BaseModel):
    session_id: str
    message: str

def run_analysis_pipeline(project_id: str, github_url: str):
    # 1. Clone and Parse Repo
    try:
        repo_data = clone_and_parse_repo(github_url)
    except Exception as e:
        print(f"Failed to clone repository: {e}")
        supabase.table("projects").update({"status": "error"}).eq("id", project_id).execute()
        return

    # 2. Store vectors in Supabase
    store_code_chunks(project_id, repo_data["code_chunks"])
    
    # 3. Run LangGraph Multi-Agent pipeline
    initial_state = CodebaseState(
        repo_url=github_url,
        repo_path=repo_data["local_path"],
        file_tree=repo_data["file_tree"],
        code_chunks=repo_data["code_chunks"],
        agent_outputs={},
        tab_reports={},
        final_markdown=""
    )
    
    try:
        # Stream the compiled graph
        current_state = dict(initial_state)

        for event in repo_macro_agent_app.stream(current_state):
            for key, value in event.items():
                print(f"Node '{key}' completed.")
                # Merge state
                if "agent_outputs" in value:
                    current_state["agent_outputs"].update(value["agent_outputs"])
                if "tab_reports" in value:
                    current_state["tab_reports"].update(value["tab_reports"])
                if "final_markdown" in value:
                    current_state["final_markdown"] = value["final_markdown"]
                
                # Partial Save Logic for streaming to frontend
                if "supervisor" in key:
                    partial_docs = {
                        "overview": current_state.get("tab_reports", {}).get("overview", ""),
                        "architecture": current_state.get("tab_reports", {}).get("architecture", ""),
                        "database": current_state.get("tab_reports", {}).get("database", ""),
                        "auth": current_state.get("tab_reports", {}).get("auth", ""),
                        "dependencies": current_state.get("tab_reports", {}).get("dependencies", ""),
                        "raw_markdown": current_state.get("final_markdown", "")
                    }
                    supabase.table("projects").update({
                        "final_documentation": partial_docs
                    }).eq("id", project_id).execute()
                    print(f"Pushed partial documentation after {key} to Supabase for {project_id}")
        
        # Construct final documentation object
        final_docs = {
            "overview": current_state.get("tab_reports", {}).get("overview", ""),
            "architecture": current_state.get("tab_reports", {}).get("architecture", ""),
            "database": current_state.get("tab_reports", {}).get("database", ""),
            "auth": current_state.get("tab_reports", {}).get("auth", ""),
            "dependencies": current_state.get("tab_reports", {}).get("dependencies", ""),
            "raw_markdown": current_state.get("final_markdown", "")
        }
        
        # Update Supabase projects table with final status and results
        supabase.table("projects").update({
            "status": "completed",
            "final_documentation": final_docs
        }).eq("id", project_id).execute()
        
        print(f"Completed analysis for project {project_id}")
    except Exception as e:
        print(f"Pipeline crashed during execution: {e}")
        supabase.table("projects").update({"status": "error"}).eq("id", project_id).execute()

@app.post("/api/analyze")
async def analyze_repo(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured on backend")
        
    # Insert new project into DB
    res = supabase.table("projects").insert({
        "user_id": req.user_id,
        "repo_url": req.github_url,
        "status": "processing"
    }).execute()
    
    project_id = res.data[0]["id"]

    # Start background task
    background_tasks.add_task(run_analysis_pipeline, project_id, req.github_url)
    
    return {"status": "processing", "project_id": project_id}

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    # Save user message to persistent history
    append_chat_message(req.session_id, "user", req.message)
    
    clean_msg = req.message
    context_str = ""
    if "===END_CONTEXT===\n" in req.message:
        parts = req.message.split("===END_CONTEXT===\n", 1)
        if len(parts) > 1:
            context_str = parts[0]
            clean_msg = parts[1]
            
    from agents.workers import llm
    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    from db.vector_store import search_code_chunks
    
    # Automatically retrieve relevant code context using RAG
    rag_context = search_code_chunks(clean_msg, req.session_id)
    if rag_context and "No relevant code snippets found" not in rag_context:
        context_str += f"\n\n[Automatic Codebase Search Results:]\n{rag_context}"
    
    # Fetch project details to give the AI context about what project it is analyzing
    repo_name = "the repository"
    try:
        project_res = supabase.table("projects").select("repo_url").eq("id", req.session_id).execute()
        if project_res.data and project_res.data[0].get("repo_url"):
            repo_url = project_res.data[0]["repo_url"]
            repo_name = repo_url.rstrip('/').split('/')[-2] + '/' + repo_url.rstrip('/').split('/')[-1]
    except Exception as e:
        pass

    system_prompt = (
        f"You are an expert AI software architect and developer assistant analyzing the codebase for the project '{repo_name}'. "
        "The user will ask questions about the project. "
        "Answer them accurately, technically, and concisely. "
        "CRITICAL: You are a READ-ONLY assistant. You cannot update, edit, or modify any code. Never offer to update, rewrite, or change files for the user. "
        "CRITICAL: If the user asks for specific information (like a URL, name, credential, or link) and it is NOT present in the codebase context provided, DO NOT guess or hallucinate it. Explicitly state that you cannot find it in the provided context."
    )
    if context_str:
        system_prompt += f"\n\nHere is the exact code context the user provided:\n{context_str}"
        
    messages = [SystemMessage(content=system_prompt)]
    
    history = get_chat_history(req.session_id)
    # Include up to the last 6 messages for context (excluding the one we just saved)
    for msg in history[-7:-1]:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
            
    messages.append(HumanMessage(content=clean_msg))
    
    from fastapi.responses import StreamingResponse
    
    async def generate():
        full_response = ""
        try:
            async for chunk in llm.astream(messages):
                text = chunk.content
                if isinstance(text, list):
                    text = "".join(b.get("text", "") if isinstance(b, dict) else str(b) for b in text)
                else:
                    text = str(text)
                
                full_response += text
                yield text
        except Exception as e:
            print(f"Chat error: {e}")
            yield f"\n[Error: {str(e)}]"
        finally:
            # Save assistant message
            append_chat_message(req.session_id, "assistant", full_response)
            
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/api/chat/{session_id}")
async def get_chat(session_id: str):
    history = get_chat_history(session_id)
    return {"messages": history}

@app.get("/api/project/{project_id}")
async def get_project(project_id: str):
    res = supabase.table("projects").select("*").eq("id", project_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return res.data[0]

@app.get("/api/chat/{session_id}")
async def get_history(session_id: str):
    history = get_chat_history(session_id)
    return {"history": history}

@app.get("/api/project/{project_id}/filetree")
async def get_filetree(project_id: str):
    if not supabase:
        return {"files": []}
    res = supabase.table("code_embeddings").select("file_path").eq("project_id", project_id).execute()
    paths = [item["file_path"] for item in res.data] if res.data else []
    return {"files": paths}

@app.get("/api/project/{project_id}/file")
async def get_file_content(project_id: str, path: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
        
    # Try exact match with is_full_file=true first
    res = supabase.table("code_embeddings").select("content").eq("project_id", project_id).eq("file_path", path).eq("metadata->>is_full_file", "true").execute()
    
    if not res.data:
        res = supabase.table("code_embeddings").select("content").eq("project_id", project_id).eq("file_path", path.replace('/', '\\')).eq("metadata->>is_full_file", "true").execute()
    
    if not res.data:
        res = supabase.table("code_embeddings").select("content").eq("project_id", project_id).eq("file_path", path.replace('\\', '/')).eq("metadata->>is_full_file", "true").execute()
        
    # Fallback to legacy chunks for old projects
    if not res.data:
        res = supabase.table("code_embeddings").select("content").eq("project_id", project_id).eq("file_path", path).execute()
    if not res.data:
        res = supabase.table("code_embeddings").select("content").eq("project_id", project_id).eq("file_path", path.replace('/', '\\')).execute()
    if not res.data:
        res = supabase.table("code_embeddings").select("content").eq("project_id", project_id).eq("file_path", path.replace('\\', '/')).execute()
        
    if not res.data:
        raise HTTPException(status_code=404, detail="File not found")
        
    return {"content": res.data[0]["content"]}

@app.get("/api/user/{user_id}/projects")
async def get_user_projects(user_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    res = supabase.table("projects").select("id, repo_url, status, created_at").eq("user_id", user_id).order("created_at", desc=True).execute()
    return {"projects": res.data if res.data else []}

@app.delete("/api/project/{project_id}")
async def delete_project(project_id: str):
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase not configured")
    
    # Delete associated code embeddings to free up space
    supabase.table("code_embeddings").delete().eq("project_id", project_id).execute()
    
    # Delete the project
    res = supabase.table("projects").delete().eq("id", project_id).execute()
    return {"status": "success"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
