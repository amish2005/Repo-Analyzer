import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from .state import CodebaseState

import os
from dotenv import load_dotenv
load_dotenv()

import time

# Note: Ensure GEMINI_API_KEY is set in your environment
llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0, google_api_key=os.environ.get("GEMINI_API_KEY"))

def invoke_llm_with_retry(prompt_text):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            return llm.invoke(prompt_text)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"⚠️ Rate limit hit. Sleeping for 65 seconds before retrying (Attempt {attempt + 1}/{max_retries})...")
                time.sleep(65)
            else:
                raise e
    return llm.invoke(prompt_text)

def purpose_worker(state: CodebaseState):
    prompt = PromptTemplate.from_template(
        "You are an expert systems analyst. Analyze ONLY the core purpose, target audience, and primary business logic domain of this repository. "
        "CRITICAL: Do NOT mention architecture, database schemas, auth flows, or dependencies. Stick STRICTLY to the 'What' and 'Why'.\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(tree=str(state.get("file_tree", {}))[:2000]))
    return {"agent_outputs": {"purpose": res.content}}

def tech_stack_worker(state: CodebaseState):
    prompt = PromptTemplate.from_template(
        "You are a tech stack analyzer. Extract ONLY the programming languages, frameworks, and core libraries used in this project. "
        "CRITICAL: Do NOT describe the project purpose, architecture, database schema, or authentication flow.\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(tree=str(state.get("file_tree", {}))[:2000]))
    return {"agent_outputs": {"tech_stack": res.content}}

def integration_worker(state: CodebaseState):
    prompt = PromptTemplate.from_template(
        "You are an integrations analyst. Identify ONLY external SDKs, APIs, and cloud services (e.g., Stripe, AWS, Supabase, SendGrid). "
        "CRITICAL: Do NOT describe the core architecture, database schema, or project purpose.\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(tree=str(state.get("file_tree", {}))[:2000]))
    return {"agent_outputs": {"integrations": res.content}}

def architecture_worker(state: CodebaseState):
    code_chunks = state.get("code_chunks", [])
    readme_content = ""
    for chunk in code_chunks:
        if "README" in chunk.get("file_path", "").upper():
            readme_content = chunk.get("content", "")[:10000]
            break
            
    prompt = PromptTemplate.from_template(
        "You are a software architect. Analyze the directory tree and README to detect the true architectural patterns of this specific project. "
        "Focus ONLY on the system's structural architecture and module boundaries. Do NOT invent components that do not exist in the code. "
        "CRITICAL: Do NOT include general project overview, database schemas, or specific authentication mechanisms.\n\n"
        "README:\n{readme}\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(readme=readme_content, tree=str(state.get("file_tree", {}))[:5000]))
    return {"agent_outputs": {"architecture": res.content}}

def database_schema_worker(state: CodebaseState):
    code_chunks = state.get("code_chunks", [])
    db_code = ""
    
    # Path keywords for identifying DB folders/files
    path_keywords = ["schema", "prisma", "model", "entity", "db", "sql", "migration", "collection", "database", "supabase", "type", "interface"]
    
    # Content keywords for identifying DB logic inside files that don't match path keywords
    content_keywords = ["mongoose", "Sequelize", "TypeORM", "CREATE TABLE", "PrismaClient", "@Entity", "pg.Client", "MongoClient", "pymongo", "SQLAlchemy", "create_engine", "Column", "ForeignKey"]
    
    for chunk in code_chunks:
        filepath = chunk.get("file_path", "").lower()
        content = chunk.get("content", "")
        
        # Check if the path indicates it's a database file
        has_path_keyword = any(kw in filepath for kw in path_keywords)
        # Check if the content has database library keywords
        has_content_keyword = any(kw in content for kw in content_keywords)
        
        if has_path_keyword or has_content_keyword:
            db_code += f"File: {filepath}\n" + content + "\n\n"
            
    prompt = PromptTemplate.from_template(
        "You are a database engineer. Inspect the provided database schema files and models to identify entities, fields, ORM models, and foreign key relationships. "
        "Focus ONLY on the database schema based on the provided code. Do NOT hallucinate tables that do not exist in the code snippets. "
        "CRITICAL: Do NOT describe the general architecture, purpose, or authentication flow.\n\n"
        "Database/Schema Code Snippets:\n{db_code}\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(
        db_code=db_code[:60000],
        tree=str(state.get("file_tree", {}))[:1000]
    ))
    return {"agent_outputs": {"database_schema": res.content}}

def auth_flow_worker(state: CodebaseState):
    code_chunks = state.get("code_chunks", [])
    readme_content = ""
    auth_code = ""
    
    for chunk in code_chunks:
        filepath = chunk.get("file_path", "").lower()
        if "readme" in filepath:
            readme_content = chunk.get("content", "")[:5000]
        elif any(keyword in filepath for keyword in ["auth", "login", "security", "jwt", "middleware", "token", "session"]):
            auth_code += chunk.get("content", "")[:2000] + "\n\n"
            
    prompt = PromptTemplate.from_template(
        "You are a security engineer. Trace security middleware, token generation, and encryption mechanisms. "
        "Focus ONLY on authentication, authorization, and security flows based on the provided README and code snippets. "
        "Do NOT invent generic JWT flows if they are not in the code. Describe the EXACT flow implemented in this repository.\n\n"
        "README:\n{readme}\n\nAuth Code Snippets:\n{auth_code}\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(
        readme=readme_content, 
        auth_code=auth_code[:10000], 
        tree=str(state.get("file_tree", {}))[:1000]
    ))
    return {"agent_outputs": {"auth_flow": res.content}}

def dependency_audit_worker(state: CodebaseState):
    code_chunks = state.get("code_chunks", [])
    dep_code = ""
    
    valid_files = ["package.json", "requirements.txt", "poetry.lock", "gemfile", "pom.xml", "build.gradle", "go.mod"]
    
    for chunk in code_chunks:
        filepath = chunk.get("file_path", "").lower()
        if any(filepath.endswith(f) for f in valid_files):
            dep_code += f"File: {filepath}\n" + chunk.get("content", "") + "\n\n"
            
    prompt = PromptTemplate.from_template(
        "You are a DevSecOps auditor. Audit the packages and dependencies to flag outdated versions or security vulnerabilities. "
        "Focus ONLY on dependencies based on the actual dependency files provided. Be highly deterministic and consistent in your evaluations. "
        "CRITICAL: Do NOT describe the project purpose, architecture, or database schemas.\n\n"
        "Dependency Files:\n{dep_code}\n\nFile Tree:\n{tree}"
    )
    res = invoke_llm_with_retry(prompt.format(
        dep_code=dep_code[:60000],
        tree=str(state.get("file_tree", {}))[:1000]
    ))
    return {"agent_outputs": {"dependency_audit": res.content}}
