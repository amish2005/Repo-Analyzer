"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { User, Server, Database, KeyRound, ShieldCheck, Lock, Activity, Shield } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";
import { API_BASE } from "@/utils/api";

const IconMap: any = {
  user: User,
  server: Server,
  database: Database,
  key: KeyRound,
  shield: Shield,
  lock: Lock,
  activity: Activity,
};

const STEP_COLORS = [
  { border: "border-blue-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]", icon: "text-blue-400" },
  { border: "border-indigo-500", shadow: "shadow-[0_0_15px_rgba(99,102,241,0.3)]", icon: "text-indigo-400" },
  { border: "border-amber-500", shadow: "shadow-[0_0_15px_rgba(245,158,11,0.3)]", icon: "text-amber-400" },
  { border: "border-emerald-500", shadow: "shadow-[0_0_15px_rgba(16,185,129,0.3)]", icon: "text-emerald-400" },
  { border: "border-purple-500", shadow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]", icon: "text-purple-400" },
  { border: "border-rose-500", shadow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]", icon: "text-rose-400" }
];

// Helper to format inline code in markdown-style points
function formatPoint(text: string) {
  const parts = text.split(/`([^`]+)`/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <code key={i} className="bg-[#141414] px-1 py-0.5 rounded text-indigo-300">{part}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AuthFlowPage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id");
  const { addContext, openChat } = useChatContext();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    const fetchProject = async () => {
      try {
        const response = await fetch(`${API_BASE}/project/${projectId}`);
        if (!response.ok) throw new Error(`HTTP error!`);
        const data = await response.json();
        
        if (isMounted) {
          setProject(data);
          if (data?.final_documentation?.auth) {
             setLoading(false);
          } else if (data.status === "completed" || data.status === "error") {
             setLoading(false);
          } else {
             setTimeout(fetchProject, 5000);
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        if (isMounted) setTimeout(fetchProject, 3000);
      }
    };
    
    fetchProject();
    return () => { isMounted = false; };
  }, [projectId]);

  if (loading || (!project?.final_documentation?.auth && project?.status === 'processing')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-12">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Auth Flow...</h2>
        <p className="text-zinc-400">Tracing middleware, token generation, and encryption mechanisms.</p>
      </div>
    );
  }

  let docs: any = { steps: [], insights: [] };
  try {
    const authData = project?.final_documentation?.auth;
    if (authData) docs = typeof authData === 'string' ? JSON.parse(authData) : authData;
  } catch (e) {
    console.error("Failed to parse auth json", e);
  }

  if (!docs || (!docs.steps && !docs.insights)) {
    return <div className="text-zinc-400 p-8">No authentication data available.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Authentication Flow</h1>
        <p className="text-zinc-400">Deep dive into the sequence of cryptographic operations and network routing for this project's authentication.</p>
      </div>

      {docs.steps?.length > 0 && (
        <div className="sharp-panel p-8 rounded-md bg-[#050505] relative group">
          <button 
            onClick={() => {
              const stepsStr = docs.steps.map((s: any, i: number) => `${i+1}. ${s.title}: ${s.description}`).join('\n');
              addContext({ id: `auth-all-steps`, title: `Authentication Flow Steps`, content: stepsStr });
              openChat();
            }}
            className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm z-10"
            title="Ask AI about all steps"
          >
            <span className="text-xs font-medium">@</span>
          </button>
          <div className="max-w-2xl mx-auto relative pl-8 border-l-2 border-[#27272a] space-y-8 mt-4">
            
            {docs.steps.map((step: any, index: number) => {
              const Icon = IconMap[step.icon] || User;
              const colorTheme = STEP_COLORS[index % STEP_COLORS.length];
              
              return (
                <div key={index} className="relative">
                  <div className={`absolute -left-[41px] top-1 w-8 h-8 rounded-full bg-[#141414] border-2 ${colorTheme.border} flex items-center justify-center ${colorTheme.shadow}`}>
                    <Icon className={`w-4 h-4 ${colorTheme.icon}`} />
                  </div>
                  <div className="bg-[#0a0a0a] border border-[#27272a] rounded-lg p-5 hover:border-[#3f3f46] transition-colors relative group">
                    <button 
                      onClick={() => {
                        const pointsString = step.points?.join("\n- ") || "";
                        addContext({ id: `auth-step-${index}`, title: `Auth Step: ${step.title}`, content: `${step.description}\n- ${pointsString}` });
                        openChat();
                      }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
                      title="Ask AI about this"
                    >
                      <span className="text-xs font-medium">@</span>
                    </button>
                    <h3 className="font-bold text-white mb-2 text-lg pr-8">{step.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <ul className="list-disc pl-5 text-sm text-zinc-400 space-y-1">
                      {step.points?.map((point: string, pIdx: number) => (
                        <li key={pIdx}>{formatPoint(point)}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
            
          </div>
        </div>
      )}

      {docs.insights?.length > 0 && (
        <div className="sharp-panel p-8 rounded-md bg-[#050505] relative group">
          <button 
            onClick={() => {
              const insightsStr = docs.insights.map((i: any) => `${i.title}: ${i.description}`).join('\n');
              addContext({ id: `auth-all-insights`, title: `Security Architecture Insights`, content: insightsStr });
              openChat();
            }}
            className="absolute top-8 right-8 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm z-10"
            title="Ask AI about all insights"
          >
            <span className="text-xs font-medium">@</span>
          </button>
          <div className="flex items-center gap-3 mb-6 pr-10">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            <h2 className="text-2xl font-bold text-white">Security Architecture Insights</h2>
          </div>
          <p className="text-zinc-300 leading-relaxed text-sm mb-6 max-w-3xl">
            The AI Codebase Analyzer has audited the authentication flow and verified the presence of the following security controls.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docs.insights.map((insight: any, index: number) => {
              const InsightIcon = IconMap[insight.icon] || Lock;
              return (
                <div key={index} className="bg-[#0a0a0a] border border-[#27272a] p-5 rounded-lg flex gap-4 items-start relative group">
                  <InsightIcon className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white mb-1 pr-6">{insight.title}</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">{insight.description}</p>
                  </div>
                  <button 
                    onClick={() => {
                      addContext({ id: `auth-insight-${index}`, title: `Security Insight: ${insight.title}`, content: insight.description });
                      openChat();
                    }}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
                    title="Ask AI about this"
                  >
                    <span className="text-xs font-medium">@</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
