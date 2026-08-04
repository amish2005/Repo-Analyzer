from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from .state import CodebaseState

import os
import json
from dotenv import load_dotenv
load_dotenv()

import time
from typing import List, Optional
from pydantic import BaseModel, Field

llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", temperature=0, google_api_key=os.environ.get("GEMINI_API_KEY"))

class QuickStartItem(BaseModel):
    title: str = Field(description="Title of the step (e.g. '1. INITIAL SETUP' or 'TERMINAL 1 (BACKEND APIS)')")
    commands: str = Field(description="The terminal commands for this step (multi-line string)")

class IntegrationItem(BaseModel):
    name: str = Field(description="Name of the integration (e.g. 'Stripe API')")
    description: str = Field(description="Short description (e.g. 'Payments & Billing')")

class OverviewOutput(BaseModel):
    what_it_does: str = Field(description="Detailed explanation of what the project does")
    how_it_does_that: str = Field(description="Detailed explanation of how the project achieves its goals")
    tech_stack_tags: List[str] = Field(description="List of core tech stack technologies")
    integrations: List[IntegrationItem] = Field(description="List of external integrations and services")
    quick_start: List[QuickStartItem] = Field(description="List of quick start setup steps")
    live_link: str = Field(description="The live deployed URL of the project if found in the README or codebase, else an empty string")

class ArchitectureNode(BaseModel):
    id: str = Field(description="Unique ID for the node, e.g. 'react-frontend'")
    name: str = Field(description="Display name of the component, e.g. 'Next.js Frontend'")
    description: str = Field(description="Brief sub-label, e.g. 'Client UI / SSR'")
    icon: str = Field(description="Icon slug (choose one: 'globe', 'server', 'database', 'lock', 'credit-card', 'cpu', 'shield')")

class ArchitectureEdge(BaseModel):
    source: str = Field(description="The ID of the source node")
    target: str = Field(description="The ID of the target node")
    label: str = Field(description="Brief label describing the connection, e.g. 'REST API Calls' or 'Reads/Writes'")
    animated: bool = Field(description="True if the connection represents active data flow, false otherwise")

class ArchitectureDetail(BaseModel):
    title: str = Field(description="Title of the architecture component")
    description: str = Field(description="Detailed explanation of the component")
    technologies: List[str] = Field(description="List of technologies used (e.g. Next.js, React, TailwindCSS)")

class ArchitectureDetails(BaseModel):
    frontend: Optional[ArchitectureDetail] = Field(None, description="Frontend architecture details (Client-side, UI, etc.)")
    backend: Optional[ArchitectureDetail] = Field(None, description="Backend architecture details (API, Server-side logic, etc.)")
    database: Optional[ArchitectureDetail] = Field(None, description="Database and caching layer details")
    infrastructure: Optional[ArchitectureDetail] = Field(None, description="Infrastructure, Deployment, or DevOps details")

class FolderAnalysis(BaseModel):
    folder_path: str = Field(description="The path of the folder, e.g. /src/services")
    description: str = Field(description="Detailed explanation of what this folder is responsible for")
    why_it_is_useful: str = Field(description="Why this specific folder structure/pattern is useful for developers")

class ArchitectureOutput(BaseModel):
    nodes: List[ArchitectureNode]
    edges: List[ArchitectureEdge]
    details: ArchitectureDetails
    folder_tree_analysis: List[FolderAnalysis]

class DatabaseField(BaseModel):
    name: str = Field(description="Name of the field (e.g. 'id', 'email')")
    type: str = Field(description="Data type (e.g. 'UUID', 'VARCHAR', 'TIMESTAMP')")
    isPrimaryKey: bool = Field(description="True if this field is a primary key")
    isForeignKey: bool = Field(description="True if this field is a foreign key")

class DatabaseTable(BaseModel):
    id: str = Field(description="Unique string ID for the table (e.g. 'users_table')")
    label: str = Field(description="Display name for the table (e.g. 'users')")
    description: str = Field(description="Detailed explanation of what this table stores")
    fields: List[DatabaseField]

class DatabaseInstance(BaseModel):
    id: str = Field(description="Unique string ID for the database (e.g. 'db-primary')")
    name: str = Field(description="Name of the database (e.g. 'Primary DB: PostgreSQL')")
    description: str = Field(description="Description of this database's purpose")
    tables: List[DatabaseTable]

class DatabaseRelation(BaseModel):
    source_table_id: str = Field(description="The ID of the table containing the foreign key")
    target_table_id: str = Field(description="The ID of the table being referenced")
    relation_type: str = Field(description="Type of relation, e.g. 'foreign_key' or 'cross_db'")

class DatabaseOutput(BaseModel):
    databases: List[DatabaseInstance]
    relations: List[DatabaseRelation]

class AuthStep(BaseModel):
    title: str = Field(description="Professional authorization-related heading (e.g. '1. Client Payload & Encryption')")
    description: str = Field(description="Detailed explanation paragraph for this step")
    points: List[str] = Field(description="List of highly detailed points for this step")
    icon: str = Field(description="Icon slug (choose from: 'user', 'server', 'database', 'key', 'shield', 'lock', 'activity')")

class SecurityInsight(BaseModel):
    title: str = Field(description="Insight title (e.g. 'Defense against XSS')")
    description: str = Field(description="Detailed explanation of the security measure")
    icon: str = Field(description="Icon slug (choose from: 'lock', 'activity', 'shield')")

class AuthOutput(BaseModel):
    steps: List[AuthStep]
    insights: List[SecurityInsight]

class DependencyItem(BaseModel):
    name: str
    version: str
    category: str = Field(description="Category of the dependency, e.g., Core, Styling, Backend, Database, AI, Utility")
    status: str = Field(description="One of: 'up-to-date', 'outdated', 'vulnerable'")

class DependencyOutput(BaseModel):
    dependencies: List[DependencyItem]
    agentic_analysis_message: str = Field(description="A brief security or performance insight about one of the dependencies.")



def invoke_llm_with_retry(prompt_text):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            return llm.invoke(prompt_text)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"⚠️ Supervisor rate limit hit. Sleeping for 65 seconds before retrying (Attempt {attempt + 1}/{max_retries})...")
                time.sleep(65)
            else:
                raise e
    return llm.invoke(prompt_text)

def invoke_structured_llm_with_retry(prompt_text, structured_llm):
    max_retries = 5
    for attempt in range(max_retries):
        try:
            return structured_llm.invoke(prompt_text)
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print(f"⚠️ Supervisor rate limit hit. Sleeping for 65 seconds before retrying (Attempt {attempt + 1}/{max_retries})...")
                time.sleep(65)
            else:
                raise e
    return structured_llm.invoke(prompt_text)

def overview_supervisor(state: CodebaseState):
    agent_outputs = state.get("agent_outputs", {})
    repo_url = state.get("repo_url", "https://github.com/example/repo")
    purpose = agent_outputs.get("purpose", "")
    tech_stack = agent_outputs.get("tech_stack", "")
    integrations = agent_outputs.get("integrations", "")
    
    code_chunks = state.get("code_chunks", [])
    readme_content = ""
    env_files_content = ""
    for chunk in code_chunks:
        filepath = chunk.get("file_path", "").lower()
        if "readme.md" in filepath:
            readme_content = chunk.get("content", "")
        if ".env" in filepath:
            env_files_content += f"--- {filepath} ---\n{chunk.get('content', '')}\n\n"
            
    prompt = PromptTemplate.from_template(
        "You are the Overview Supervisor. Aggregate the following analysis into a strict JSON format.\n"
        "1. For 'what_it_does' and 'how_it_does_that', write highly detailed, professional paragraphs (3-4 sentences minimum) explaining the core features, value proposition, and underlying mechanics of the website.\n"
        "2. For 'tech_stack_tags', be accurate and relevant.\n"
        "3. For 'quick_start', provide complete, copy-pasteable terminal commands. INCLUDE the git clone command using this exact URL: {repo_url}. Ensure you format the steps properly (e.g. '1. INITIAL SETUP'). IMPORTANT: If the startup requires running multiple servers simultaneously (like a backend and frontend), explicitly create multiple steps titled like 'TERMINAL 1 (BACKEND)' and 'TERMINAL 2 (FRONTEND)'. Also, if you see .env files in the 'Detected Environment Files' section below, CREATE a separate dedicated step for configuring EACH .env file (e.g. '2. ENVIRONMENT CONFIGURATION (.ENV BLUEPRINT)'). In the 'commands' field for this step, output `cp .env.example .env` and then PASTE the actual contents of the .env file with helpful comments next to each variable, as shown in the template. Include `npm install` and `npm run dev` if it's a frontend repo, or `pip install -r requirements.txt` for backend.\n"
        "4. For 'live_link', search the provided context (like the README Extract) for any live deployed production URL (e.g. Vercel, Netlify, custom domain). If found, provide the URL. If not found, return an empty string.\n\n"
        "Purpose:\n{purpose}\n\nTech Stack:\n{tech_stack}\n\nIntegrations:\n{integrations}\n\nDetected Environment Files:\n{env_files_content}\n\nREADME Extract:\n{readme}"
    )
    structured_llm = llm.with_structured_output(OverviewOutput)
    res = invoke_structured_llm_with_retry(prompt.format(repo_url=repo_url, purpose=purpose, tech_stack=tech_stack, integrations=integrations, env_files_content=env_files_content, readme=readme_content[:10000]), structured_llm)
    
    return {"tab_reports": {"overview": res.dict()}}

def architecture_supervisor(state: CodebaseState):
    agent_outputs = state.get("agent_outputs", {})
    architecture = agent_outputs.get("architecture", "")
    file_tree = state.get("file_tree", {})
    
    prompt = PromptTemplate.from_template(
        "You are the Architecture Supervisor. Compile the structural findings and file tree into a strict JSON format.\n\n"
        "1. For 'nodes', define the core system components (e.g., React SPA, Express API, MongoDB). Do NOT invent components that do not exist. Even for simple monolithic projects, dissect the architecture into distinct conceptual components (like UI layer, Routing/Logic layer, Data/Storage layer).\n"
        "2. For 'edges', map the connections between these nodes based on how data flows. Ensure source and target exactly match the node IDs.\n"
        "3. For 'details', provide detailed descriptions and technology stacks for the fixed categories (frontend, backend, database, infrastructure). If a category does not exist in this project (e.g. no database), leave it null.\n"
        "4. For 'folder_tree_analysis', analyze the key directories in the file tree (e.g. pick 3-6 important folders) and explain their purpose and why the pattern is useful.\n\n"
        "Architecture Findings:\n{architecture}\n\nFile Tree:\n{file_tree}"
    )
    structured_llm = llm.with_structured_output(ArchitectureOutput)
    res = invoke_structured_llm_with_retry(prompt.format(architecture=architecture, file_tree=str(file_tree)[:15000]), structured_llm)
    
    return {"tab_reports": {"architecture": res.dict()}}

def database_supervisor(state: CodebaseState):
    agent_outputs = state.get("agent_outputs", {})
    database_schema = agent_outputs.get("database_schema", "")
    
    prompt = PromptTemplate.from_template(
        "You are the Database Supervisor. Convert the raw database analysis into a strict JSON format.\n\n"
        "1. For 'databases', group tables logically. Even if it's a single database, wrap it in a single DatabaseInstance. Provide detailed descriptions for tables.\n"
        "2. For 'relations', carefully map the foreign keys. Ensure 'source_table_id' and 'target_table_id' exactly match the 'id' fields of the tables you defined.\n\n"
        "Database Findings:\n{database_schema}"
    )
    structured_llm = llm.with_structured_output(DatabaseOutput)
    res = invoke_structured_llm_with_retry(prompt.format(database_schema=database_schema), structured_llm)
    
    return {"tab_reports": {"database": res.dict()}}

def auth_supervisor(state: CodebaseState):
    agent_outputs = state.get("agent_outputs", {})
    auth_flow = agent_outputs.get("auth_flow", "")
    
    prompt = PromptTemplate.from_template(
        "You are the Auth & Security Supervisor. Convert the raw authentication analysis into a strict JSON format.\n\n"
        "1. For 'steps', extract the EXACT chronological steps of the authentication flow based on the findings. Do NOT force a specific number of steps; document what actually exists. Write professional headings, a detailed explanatory paragraph, and 2-3 specific bullet points for each step.\n"
        "2. For 'insights', extract exactly 2 critical Security Architecture Insights (like XSS mitigation, timing attack prevention, token security, etc.).\n\n"
        "Auth Findings:\n{auth_flow}"
    )
    structured_llm = llm.with_structured_output(AuthOutput)
    res = invoke_structured_llm_with_retry(prompt.format(auth_flow=auth_flow), structured_llm)
    
    return {"tab_reports": {"auth": res.dict()}}

def dependency_supervisor(state: CodebaseState):
    agent_outputs = state.get("agent_outputs", {})
    dependency_audit = agent_outputs.get("dependency_audit", "")
    
    prompt = PromptTemplate.from_template(
        "You are the Dependency & DevSecOps Supervisor. Convert the raw dependency analysis into a strict JSON format.\n\n"
        "1. Identify the top 15 most important dependencies (e.g. Next.js, React, FastAPI, SQLAlchemy, Mongoose). If there are fewer than 15, list all of them.\n"
        "2. Categorize them and evaluate if they are up-to-date, outdated, or vulnerable. Use your knowledge cutoff to be highly deterministic (do not guess randomly). If a version was released near your knowledge cutoff, mark it 'up-to-date'.\n"
        "3. Provide a single, impactful `agentic_analysis_message` summarizing the most critical update or vulnerability.\n\n"
        "Dependency Findings:\n{dependency_audit}"
    )
    structured_llm = llm.with_structured_output(DependencyOutput)
    res = invoke_structured_llm_with_retry(prompt.format(dependency_audit=dependency_audit), structured_llm)
    
    return {"tab_reports": {"dependencies": res.dict()}}

def master_supervisor(state: CodebaseState):
    tab_reports = state.get("tab_reports", {})
    agent_outputs = state.get("agent_outputs", {})
    
    overview = tab_reports.get("overview", "")
    if isinstance(overview, dict):
        overview = json.dumps(overview, indent=2)
        
    architecture = tab_reports.get("architecture", "")
    database = tab_reports.get("database", "")
    auth = tab_reports.get("auth", "")
    dependencies = tab_reports.get("dependencies", "")
    
    prompt = PromptTemplate.from_template(
        "Finalize all reports, reconcile cross-references, and compile the final unified markdown documentation report.\n\nOverview:\n{overview}\n\nArchitecture:\n{architecture}\n\nDatabase Schema:\n{database}\n\nAuth Flow:\n{auth}\n\nDependencies:\n{dependencies}"
    )
    res = invoke_llm_with_retry(prompt.format(
        overview=overview,
        architecture=architecture,
        database=database,
        auth=auth,
        dependencies=dependencies
    ))
    
    return {"final_markdown": res.content}
