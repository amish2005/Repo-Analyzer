const API_BASE = "http://localhost:8000/api";

export async function analyzeRepo(githubUrl: string, userId: string) {
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      github_url: githubUrl,
      user_id: userId,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Analyze API error: ${response.statusText}`);
  }
  
  return response.json();
}

export async function chatWithAI(sessionId: string, message: string) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      message,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }
  
  return response.json();
}
