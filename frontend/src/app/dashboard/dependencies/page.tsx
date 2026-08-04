"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Package, CheckCircle2, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";
import { API_BASE } from "@/utils/api";

function DependenciesPageContent() {
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
          if (data?.final_documentation?.dependencies) {
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

  if (loading || (!project?.final_documentation?.dependencies && project?.status === 'processing')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-12">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Auditing Dependencies...</h2>
        <p className="text-zinc-400">Scanning package.json, lockfiles, and requirements for vulnerabilities.</p>
      </div>
    );
  }

  let docs: any = { dependencies: [], agentic_analysis_message: "" };
  try {
    const depData = project?.final_documentation?.dependencies;
    if (depData) docs = typeof depData === 'string' ? JSON.parse(depData) : depData;
  } catch (e) {
    console.error("Failed to parse dependencies json", e);
  }

  if (!docs || (!docs.dependencies)) {
    return <div className="text-zinc-400 p-8">No dependency data available.</div>;
  }

  // Calculate metrics
  const totalPackages = docs.dependencies?.length || 0;
  const outdatedCount = docs.dependencies?.filter((d: any) => d.status.toLowerCase() === 'outdated').length || 0;
  const vulnerabilityCount = docs.dependencies?.filter((d: any) => d.status.toLowerCase() === 'vulnerable').length || 0;

  // Helper to parse markdown-style inline code blocks in the message
  const formatMessage = (text: string) => {
    if (!text) return null;
    const parts = text.split(/`([^`]+)`/);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <code key={i} className="bg-[#141414] px-1 py-0.5 rounded text-indigo-300 font-mono text-sm">{part}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Dependencies</h1>
        <p className="text-zinc-400">Parsed package dependencies across frontend and backend environments.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="sharp-panel p-4 rounded-md">
          <div className="text-zinc-500 text-sm mb-1">Total Packages</div>
          <div className="text-2xl font-bold text-white">{totalPackages}</div>
        </div>
        <div className={`sharp-panel p-4 rounded-md ${outdatedCount > 0 ? 'border-amber-500/30' : ''}`}>
          <div className="text-zinc-500 text-sm mb-1">Outdated</div>
          <div className={`text-2xl font-bold ${outdatedCount > 0 ? 'text-amber-500' : 'text-zinc-400'}`}>{outdatedCount}</div>
        </div>
        <div className={`sharp-panel p-4 rounded-md ${vulnerabilityCount > 0 ? 'border-red-500/30' : ''}`}>
          <div className="text-zinc-500 text-sm mb-1">Vulnerabilities</div>
          <div className={`text-2xl font-bold ${vulnerabilityCount > 0 ? 'text-red-500' : 'text-zinc-400'}`}>{vulnerabilityCount}</div>
        </div>
      </div>

      <div className="sharp-panel rounded-md overflow-hidden relative group">
        <button 
          onClick={() => {
            const depsList = docs.dependencies?.map((d: any) => `${d.name} (${d.version}) - ${d.status}`).join("\n");
            addContext({ id: `deps-list`, title: `Dependencies List`, content: `Project Dependencies:\n${depsList}` });
            openChat();
          }}
          className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
          title="Ask AI about this"
        >
          <span className="text-xs font-medium">@</span>
        </button>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#141414] border-b border-[#27272a]">
              <th className="px-6 py-4 font-semibold text-zinc-300 text-sm">Package Name</th>
              <th className="px-6 py-4 font-semibold text-zinc-300 text-sm">Version</th>
              <th className="px-6 py-4 font-semibold text-zinc-300 text-sm">Category</th>
              <th className="px-6 py-4 font-semibold text-zinc-300 text-sm">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {docs.dependencies?.map((dep: any, i: number) => (
              <tr key={i} className="hover:bg-[#0a0a0a] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-zinc-500" />
                    <span className="font-medium text-white">{dep.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400 font-mono">{dep.version}</td>
                <td className="px-6 py-4">
                  <span className="bg-[#141414] border border-[#27272a] text-zinc-300 px-2 py-1 rounded text-xs">
                    {dep.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {dep.status.toLowerCase() === "up-to-date" ? (
                    <div className="flex items-center gap-1.5 text-emerald-500 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Up to date
                    </div>
                  ) : dep.status.toLowerCase() === "vulnerable" ? (
                    <div className="flex items-center gap-1.5 text-red-500 text-sm">
                      <ShieldAlert className="w-4 h-4" /> Vulnerable
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-amber-500 text-sm capitalize">
                      <AlertTriangle className="w-4 h-4" /> {dep.status.toLowerCase()}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {docs.agentic_analysis_message && (
        <div className="sharp-panel p-4 rounded-md bg-blue-500/10 border-blue-500/30 flex items-start gap-3 relative group">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-200 pr-8">
            <strong>Agentic Analysis:</strong> {formatMessage(docs.agentic_analysis_message)}
          </p>
          <button 
            onClick={() => {
              addContext({ id: `deps-analysis`, title: `Dependencies Analysis`, content: docs.agentic_analysis_message });
              openChat();
            }}
            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 hover:text-blue-200 transition-all shadow-sm"
            title="Ask AI about this"
          >
            <span className="text-xs font-medium">@</span>
          </button>
        </div>
      )}
    </div>
  );
}


import { Suspense } from "react";

export default function DependenciesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black text-zinc-500">Loading...</div>}>
      <DependenciesPageContent />
    </Suspense>
  );
}
