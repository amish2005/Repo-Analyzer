# RepoScope AI

RepoScope AI is an advanced agentic coding tool that ingests your codebase, chunks and embeds it using a high-performance vector store, and provides an interactive AI assistant that can answer complex architectural and implementation questions with complete context.

## 🚀 Features

- **Automated Repository Ingestion:** Seamlessly clone and analyze repositories directly from GitHub.
- **Intelligent Vector Search:** Code is intelligently chunked and embedded to provide a robust retrieval-augmented generation (RAG) pipeline.
- **Context-Aware AI Assistant:** Chat with your codebase in real-time. The AI instantly fetches the relevant files and streams the answers token-by-token.
- **Dynamic File Tree & UI:** Beautiful, dark-mode, responsive dashboard built with Next.js and Tailwind CSS.
- **Full Context Memory:** The AI permanently remembers file attachments across your entire chat session.

## 🛠️ Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS, Lucide React
- **Backend:** FastAPI, Python, LangChain, HuggingFace Embeddings
- **Database:** Supabase (PostgreSQL with `pgvector` for embeddings)
- **AI Model:** Google Gemini (via `langchain-google-genai`)

## 💻 Running Locally

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com/).
2. Enable the `vector` extension in your database.
3. Run the SQL schema to create the `projects` and `code_embeddings` tables.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (or `venv\Scripts\activate` on Windows)
pip install -r requirements.txt
```
Create a `.env` file in the root based on `.env.example`:
```env
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
Start the backend server:
```bash
python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```
Create a `.env.local` file in the `frontend` directory based on `frontend/.env.example`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```
Start the frontend server:
```bash
npm run dev
```

## 🌍 Deployment

### Deploying the Backend (Railway / Render)
1. Create a new web service on Railway or Render.
2. Connect it to your GitHub repository and point the root directory to `backend/`.
3. Add your `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` to the environment variables.
4. Set the start command to: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Deploying the Frontend (Vercel)
1. Import your GitHub repository into [Vercel](https://vercel.com/).
2. Set the Root Directory to `frontend`.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to your Vercel Environment Variables.
4. Add a new variable `NEXT_PUBLIC_API_URL` pointing to your deployed backend URL.
5. Click **Deploy**.
