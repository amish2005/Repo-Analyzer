"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ExternalLink, GitBranch, MapPin, Users, Star, GitFork, Terminal, Copy, HelpCircle, Layers, Lightbulb, Check, Blocks, CreditCard, Mail, User, Database, History } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useChatContext } from "@/context/ChatContext";
import { API_BASE } from "@/utils/api";

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy}
      className="absolute top-4 right-4 text-zinc-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
    >
      {copied ? (
        <>
          <span className="text-xs font-medium text-emerald-400">Copied</span>
          <Check className="w-4 h-4 text-emerald-400" />
        </>
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </button>
  );
}

const HighlightedCommand = ({ text }: { text: string }) => {
  const lines = text.split('\n');
  return (
    <div className="leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-5"></div>;
        
        // Comment
        if (trimmed.startsWith('#')) {
          return <div key={i} className="text-zinc-500 italic">{line}</div>;
        }
        
        // Env variable (e.g. PORT=5000)
        if (line.includes('=') && line.split('=')[0].trim().match(/^[A-Z_0-9]+$/i) && !line.split('=')[0].includes(' ')) {
          const parts = line.split('=');
          const key = parts[0];
          const value = parts.slice(1).join('=');
          return (
            <div key={i}>
              <span className="text-[#c678dd]">{key}</span>
              <span className="text-zinc-400">=</span>
              <span className="text-[#98c379]">{value}</span>
            </div>
          );
        }
        
        // Bash command highlighting
        const cmdMatch = line.match(/^(\s*)(cd|npm|git|cp|python|pip|source|npx|yarn|uvicorn|node|docker|docker-compose|make|go)\s+(.*)$/);
        if (cmdMatch) {
          return (
            <div key={i}>
              <span>{cmdMatch[1]}</span>
              <span className="text-[#61afef] font-semibold">{cmdMatch[2]}</span>
              <span className="text-[#98c379]"> {cmdMatch[3]}</span>
            </div>
          );
        }

        // Default
        return <div key={i} className="text-[#98c379]">{line}</div>;
      })}
    </div>
  );
};

export default function DashboardOverview() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id");
  const { addContext, openChat } = useChatContext();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [githubData, setGithubData] = useState<{ commits: string, forks: number, homepage: string | null, avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!project?.repo_url) return;
    
    const fetchGithubStats = async () => {
      try {
        const urlParts = project.repo_url.replace("https://github.com/", "").split("/");
        if (urlParts.length >= 2) {
          const owner = urlParts[0];
          const repo = urlParts[1].replace(".git", "");
          
          // Fetch repo info for forks
          const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
          if (!repoRes.ok) return;
          const repoData = await repoRes.json();
          
          // Fetch commits to get count
          const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
          let commitsCount = "0";
          if (commitsRes.ok) {
            const linkHeader = commitsRes.headers.get("Link");
            if (linkHeader) {
              const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
              if (match) commitsCount = match[1];
            } else {
              const commitsData = await commitsRes.json();
              commitsCount = commitsData.length.toString();
            }
          }
          
          setGithubData({
            forks: repoData.forks_count,
            commits: commitsCount,
            homepage: repoData.homepage || null,
            avatar_url: repoData.owner?.avatar_url || null
          });
        }
      } catch (e) {
        console.error("Failed to fetch GitHub stats:", e);
      }
    };
    
    fetchGithubStats();
  }, [project?.repo_url]);

  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();
    
    const fetchProject = async () => {
      try {
        const response = await fetch(`${API_BASE}/project/${projectId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        
        if (data) {
          setProject(data);
          if (data.status === "completed" || data.status === "error") {
            setLoading(false);
          } else {
            setTimeout(fetchProject, 5000);
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        setTimeout(fetchProject, 3000);
      }
    };
    
    fetchProject();
  }, [projectId]);

  if (loading || (!project?.final_documentation?.overview && project?.status === 'processing')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-12">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Repository...</h2>
        <p className="text-zinc-400">Our AI agents are reading the code, identifying architecture, and mapping dependencies.</p>
        <p className="text-zinc-500 text-sm mt-4">This usually takes about 1-2 minutes depending on repository size.</p>
      </div>
    );
  }

  if (project?.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-12">
        <h2 className="text-2xl font-bold text-red-500 mb-2">Analysis Failed</h2>
        <p className="text-zinc-400">There was an error analyzing the repository. Please make sure the URL is valid and public.</p>
      </div>
    );
  }

  const repoName = project?.repo_url.replace("https://github.com/", "") || "example/repo";
  const docs = project?.final_documentation || {};

  // Helper to safely extract string from LangChain AIMessage content formats
  const extractText = (content: any): string => {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((block: any) => block?.text || "").join("\n\n");
    }
    if (typeof content === "object") {
      return content.text || JSON.stringify(content);
    }
    return String(content);
  };

  const renderOverview = () => {
    if (!docs.overview) return <p>No overview generated.</p>;
    
    if (typeof docs.overview === "string" || Array.isArray(docs.overview)) {
      return (
        <div className="sharp-panel p-6 rounded-md">
          <h2 className="text-xl font-bold text-white border-b border-[#27272a] pb-4 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-zinc-400" />
            Overview
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed">
            <ReactMarkdown>{extractText(docs.overview)}</ReactMarkdown>
          </div>
        </div>
      );
    }
    const validTechStack = (docs.overview.tech_stack_tags || []).filter((t: string) => {
      const lower = t.toLowerCase();
      return lower !== "none" && lower !== "n/a" && lower !== "null" && lower !== "undefined" && lower !== "";
    });

    const validIntegrations = (docs.overview.integrations || []).filter((integration: any) => {
      const name = integration.name.toLowerCase();
      return name !== "none" && name !== "n/a" && name !== "null" && !name.includes("no external");
    });

    const validQuickStart = (docs.overview.quick_start || []).filter((step: any) => {
      const title = step.title.toLowerCase();
      const cmds = step.commands.toLowerCase();
      return title !== "none" && cmds !== "none" && title !== "n/a" && !title.includes("no quick start");
    });

    const hasWhatItDoes = docs.overview.what_it_does && docs.overview.what_it_does.toLowerCase() !== "none";
    const hasHowItDoesThat = docs.overview.how_it_does_that && docs.overview.how_it_does_that.toLowerCase() !== "none";

    // Structured format
    return (
      <>
        {hasWhatItDoes && (
          <div className="sharp-panel p-6 rounded-md relative group">
            <button 
              onClick={() => {
                addContext({ id: `overview-what`, title: "What it does?", content: docs.overview.what_it_does });
                openChat();
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
              title="Ask AI about this"
            >
              <span className="text-xs font-medium">@</span>
            </button>
            <h2 className="text-xl font-bold text-white border-b border-[#27272a] pb-4 mb-4 flex items-center gap-2 pr-8">
              <HelpCircle className="w-5 h-5 text-zinc-400" />
              What it does?
            </h2>
            <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed">
              <ReactMarkdown>{docs.overview.what_it_does}</ReactMarkdown>
            </div>
          </div>
        )}
        
        {hasHowItDoesThat && (
          <div className="sharp-panel p-6 rounded-md relative group">
            <button 
              onClick={() => {
                addContext({ id: `overview-how`, title: "How it does that?", content: docs.overview.how_it_does_that });
                openChat();
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
              title="Ask AI about this"
            >
              <span className="text-xs font-medium">@</span>
            </button>
            <h2 className="text-xl font-bold text-white border-b border-[#27272a] pb-4 mb-4 flex items-center gap-2 pr-8">
              <Lightbulb className="w-5 h-5 text-zinc-400" />
              How it does that?
            </h2>
            <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 leading-relaxed">
              <ReactMarkdown>{docs.overview.how_it_does_that}</ReactMarkdown>
            </div>
          </div>
        )}

        {validTechStack.length > 0 && (
          <div className="sharp-panel p-6 rounded-md relative group">
            <button 
              onClick={() => {
                addContext({ id: `overview-tech`, title: "Core Tech Stack", content: `Tech stack used: ${validTechStack.join(", ")}` });
                openChat();
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
              title="Ask AI about this"
            >
              <span className="text-xs font-medium">@</span>
            </button>
            <h2 className="text-xl font-bold text-white border-b border-[#27272a] pb-4 mb-4 flex items-center gap-2 pr-8">
              <Layers className="w-5 h-5 text-zinc-400" />
              Core Tech Stack
            </h2>
            <div className="flex flex-wrap gap-2">
              {validTechStack.map((tag: string, i: number) => (
                <span key={i} className="px-3 py-1.5 bg-[#141414] border border-[#27272a] text-zinc-300 rounded-full text-sm font-medium hover:bg-[#27272a] hover:text-white transition-colors">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {validIntegrations.length > 0 && (
          <div className="sharp-panel p-6 rounded-md relative group">
            <button 
              onClick={() => {
                const integrationList = validIntegrations.map((i: any) => `${i.name}: ${i.description}`).join("\n");
                addContext({ id: `overview-integrations`, title: "External Integrations", content: `External Integrations:\n${integrationList}` });
                openChat();
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
              title="Ask AI about this"
            >
              <span className="text-xs font-medium">@</span>
            </button>
            <h2 className="text-xl font-bold text-white border-b border-[#27272a] pb-4 mb-4 flex items-center gap-2 pr-8">
              <Blocks className="w-5 h-5 text-zinc-400" />
              External Integrations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validIntegrations.map((integration: any, i: number) => (
                <div key={i} className="p-4 rounded-md border border-[#27272a] bg-[#0a0a0a] flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-[#141414] border border-[#27272a] flex items-center justify-center shrink-0">
                    <Blocks className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">{integration.name}</div>
                    <div className="text-xs text-zinc-400">{integration.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {validQuickStart.length > 0 && (
          <div className="sharp-panel p-6 rounded-md relative group">
            <button 
              onClick={() => {
                const commandList = validQuickStart.map((i: any) => `${i.title}:\n${i.commands}`).join("\n\n");
                addContext({ id: `overview-quickstart`, title: "Quick Start Commands", content: `Quick Start Commands:\n${commandList}` });
                openChat();
              }}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
              title="Ask AI about this"
            >
              <span className="text-xs font-medium">@</span>
            </button>
            <h2 className="text-xl font-bold text-white border-b border-[#27272a] pb-4 mb-4 flex items-center gap-2 pr-8">
              <Terminal className="w-5 h-5 text-zinc-400" />
              Quick Start Commands
            </h2>
            <div className="space-y-4">
              {validQuickStart.map((step: any, i: number) => (
                <div key={i} className="rounded-md border border-[#27272a] overflow-hidden">
                  <div className="bg-[#141414] px-4 py-2 border-b border-[#27272a] flex items-center gap-2">
                    <span className="text-zinc-500 font-mono text-xs">{">_"}</span>
                    <span className="text-zinc-300 text-xs font-mono tracking-wider uppercase">{step.title}</span>
                  </div>
                  <div className="bg-[#050505] p-4 relative group font-mono text-sm whitespace-pre-wrap">
                    <CopyButton textToCopy={step.commands} />
                    <HighlightedCommand text={step.commands} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="pb-12">
      {/* Sticky Header Profile Section */}
      <div className="sticky top-[-32px] pt-8 pb-6 z-20 bg-black">
        <div className="max-w-4xl mx-auto">
          <div className="sharp-panel p-4 rounded-md flex flex-col md:flex-row md:items-center gap-4 shadow-xl shadow-black/50">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-[#27272a] bg-[#141414]">
              {githubData?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={githubData.avatar_url} alt="Repository Owner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">🚀</div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2 leading-none mb-1.5">
                    {repoName}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                    <span>Analyzed by AI</span>
                    {githubData ? (
                      <>
                        <span className="flex items-center gap-1 text-white font-medium"><History className="w-3.5 h-3.5" /> {githubData.commits} Commits</span>
                        <span className="flex items-center gap-1 text-white font-medium"><GitFork className="w-3.5 h-3.5" /> {githubData.forks} forks</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><History className="w-3.5 h-3.5" /> Loading commits...</span>
                        <span className="flex items-center gap-1"><GitFork className="w-3.5 h-3.5" /> Loading forks...</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  {docs.overview?.live_link && docs.overview.live_link.trim() !== "" && docs.overview.live_link.toLowerCase() !== "none" && (
                    <a href={!docs.overview.live_link.startsWith('http') ? `https://${docs.overview.live_link}` : docs.overview.live_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 border border-indigo-400 text-white px-3 py-1.5 rounded-md text-xs transition-colors font-medium">
                      <ExternalLink className="w-3 h-3" />
                      Live Demo
                    </a>
                  )}
                  <a href={project?.repo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-[#141414] hover:bg-[#27272a] border border-[#27272a] text-white px-3 py-1.5 rounded-md text-xs transition-colors font-medium">
                    <GitBranch className="w-3 h-3" />
                    GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Summary */}
      <div className="max-w-4xl mx-auto space-y-6">
        {renderOverview()}
      </div>
    </div>
  );
}
