"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useChatContext } from "@/context/ChatContext";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, Handle, Position, MarkerType, useReactFlow, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Server, Database, Globe, Lock, CreditCard, Folder, ChevronRight, Sparkles, Cpu, Shield, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { API_BASE } from "@/utils/api";

const IconMap: any = {
  globe: Globe,
  server: Server,
  database: Database,
  lock: Lock,
  'credit-card': CreditCard,
  cpu: Cpu,
  shield: Shield
};

function TopRightControls({ isFullscreen, setIsFullscreen }: { isFullscreen: boolean, setIsFullscreen: (val: boolean) => void }) {
  const { zoomIn, zoomOut } = useReactFlow();
  
  return (
    <Panel position="top-right" className="flex items-center gap-2 m-4 z-50">
      {isFullscreen && (
        <button 
          onClick={() => setIsFullscreen(false)}
          className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded shadow-lg hover:bg-red-500/20 transition-colors font-medium text-sm mr-2"
        >
          <Minimize className="w-4 h-4" />
          Exit Full Screen
        </button>
      )}

      <div className="flex items-center bg-[#141414] border border-[#27272a] rounded shadow-lg overflow-hidden">
        <button onClick={() => zoomOut({ duration: 300 })} className="p-2 text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors border-r border-[#27272a]" title="Zoom Out">
          <ZoomOut className="w-5 h-5" />
        </button>
        <button onClick={() => zoomIn({ duration: 300 })} className="p-2 text-zinc-400 hover:text-white hover:bg-[#27272a] transition-colors" title="Zoom In">
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>
      
      {!isFullscreen && (
        <button 
          onClick={() => setIsFullscreen(true)}
          className="p-2 bg-[#141414] border border-[#27272a] rounded shadow-lg hover:bg-[#27272a] transition-colors text-zinc-400 hover:text-white"
          title="Enter Full Screen"
        >
          <Maximize className="w-5 h-5" />
        </button>
      )}
    </Panel>
  );
}

// Custom Node for Architecture Node
function ArchNode({ data }: any) {
  const Icon = IconMap[data.icon] || Server;
  return (
    <div className="w-56 bg-[#0a0a0a] border border-[#27272a] rounded-lg shadow-lg font-sans flex flex-col items-center justify-center p-5 hover:border-indigo-500/50 transition-colors">
      <div className="w-12 h-12 bg-[#141414] border border-[#27272a] rounded-full flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-indigo-400" />
      </div>
      <span className="font-bold text-sm text-white text-center">{data.label}</span>
      <span className="text-xs text-zinc-500 text-center mt-1">{data.description}</span>
      
      <Handle type="target" position={Position.Top} style={{ background: '#6366f1', border: 'none', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: '#6366f1', border: 'none', width: 8, height: 8 }} />
    </div>
  );
}


export default function ArchitecturePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id");
  const { addContext, openChat } = useChatContext();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({ archNode: ArchNode }), []);

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
          if (data?.final_documentation?.architecture) {
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

  useEffect(() => {
    try {
      const arch = project?.final_documentation?.architecture;
      if (arch) {
        const parsedDocs = typeof arch === 'string' ? JSON.parse(arch) : arch;
        if (parsedDocs?.folder_tree_analysis?.length > 0 && !activeFolder) {
          setActiveFolder(parsedDocs.folder_tree_analysis[0].folder_path);
        }
        
        // Parse React Flow nodes
        if (parsedDocs?.nodes && parsedDocs?.edges) {
           const newNodes = parsedDocs.nodes.map((node: any, index: number) => ({
             id: node.id,
             type: 'archNode',
             position: { x: (index % 3) * 300, y: Math.floor(index / 3) * 250 },
             data: {
               label: node.name,
               description: node.description,
               icon: node.icon
             }
           }));
           
           const newEdges = parsedDocs.edges.map((edge: any, index: number) => ({
             id: `edge-${index}`,
             source: edge.source,
             target: edge.target,
             animated: edge.animated,
             style: { stroke: '#6366f1', strokeWidth: 2 },
             label: edge.label,
             labelStyle: { fill: '#a1a1aa', fontSize: 11, fontWeight: 500 },
             labelBgStyle: { fill: '#0a0a0a', fillOpacity: 0.9 },
             markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
           }));
           
           setNodes(newNodes);
           setEdges(newEdges);
        }
      }
    } catch (e) {}
  }, [project?.final_documentation?.architecture, activeFolder, setNodes, setEdges]);

  if (loading || (!project?.final_documentation?.architecture && project?.status === 'processing')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-12">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Architecture...</h2>
        <p className="text-zinc-400">Mapping services, dependencies, and file structures.</p>
      </div>
    );
  }

  let docs: any = { nodes: [], edges: [], details: [], folder_tree_analysis: [] };
  try {
    const arch = project?.final_documentation?.architecture;
    docs = typeof arch === 'string' ? JSON.parse(arch) : arch;
  } catch (e) {
    console.error("Failed to parse architecture json", e);
  }

  if (!docs || (!docs.nodes && !docs.details)) {
    return <div className="text-zinc-400 p-8">No architecture data available.</div>;
  }

  const detailsList = Array.isArray(docs.details) 
    ? docs.details 
    : Object.values(docs.details || {}).filter(Boolean);

  const activeData = activeFolder ? docs.folder_tree_analysis?.find((f: any) => f.folder_path === activeFolder) : null;

  return (
    <div className="w-full space-y-8 pb-12 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">System Architecture</h1>
        <p className="text-zinc-400">High-level interactive overview of the application's microservices and their data flow.</p>
      </div>

      <div className={isFullscreen ? "absolute inset-0 z-[100] bg-[#050505] w-full h-full" : "sharp-panel rounded-md overflow-hidden bg-[#050505] w-full border border-[#27272a] relative"} style={{ height: isFullscreen ? '100%' : '600px' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-black"
          minZoom={0.2}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
        >
          <Background color="#27272a" gap={16} size={1} />
          <TopRightControls isFullscreen={isFullscreen} setIsFullscreen={setIsFullscreen} />
        </ReactFlow>
      </div>

      <div className="sharp-panel p-8 rounded-md mt-6">
        <div className="relative group">
          <button 
            onClick={() => {
              const archStr = detailsList.map((d: any) => `${d.title}: ${d.description}`).join('\n\n');
              addContext({ id: `arch-details-all`, title: `All Architecture Details`, content: archStr });
              openChat();
            }}
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm z-10"
            title="Ask AI about all architecture details"
          >
            <span className="text-xs font-medium">@</span>
          </button>
          <h2 className="text-xl font-bold text-white mb-4 pr-10">Architecture Details</h2>
          <div className="flex flex-col gap-4 mt-2">
            {detailsList.map((detail: any, i: number) => (
              <div key={i} className="bg-[#0a0a0a] border border-[#27272a] rounded-md p-5 flex flex-col justify-between hover:border-[#3f3f46] transition-colors relative group">
                <button 
                  onClick={() => {
                    addContext({ id: `arch-${detail.title}`, title: detail.title, content: detail.description });
                    openChat();
                  }}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
                  title="Ask AI about this"
                >
                  <span className="text-xs font-medium">@</span>
                </button>
                <div>
                  <h3 className="font-semibold text-white mb-2 pr-8">{detail.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                    {detail.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {detail.technologies?.map((tech: string, tIdx: number) => (
                    <span key={tIdx} className="text-xs bg-[#141414] border border-[#27272a] px-2 py-1 rounded text-zinc-300">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {docs.folder_tree_analysis?.length > 0 && (
        <div className="sharp-panel p-6 rounded-md">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-400" />
            Interactive Directory & Folder Tree
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            A visual, collapsible folder structure of the repository. Click on a folder to view an AI-generated explanation of what that specific module does.
          </p>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/3 bg-[#0a0a0a] border border-[#27272a] rounded-md p-4 max-h-[500px] overflow-y-auto">
              <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-4">Repository Tree</div>
              <div className="flex flex-col gap-1">
                {docs.folder_tree_analysis.map((folder: any, i: number) => (
                  <div key={i}>
                    <button
                      onClick={() => setActiveFolder(folder.folder_path)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                        activeFolder === folder.folder_path 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                          : 'text-zinc-400 hover:bg-[#141414] hover:text-white border border-transparent'
                      }`}
                    >
                      <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${activeFolder === folder.folder_path ? 'rotate-90' : ''}`} />
                      <Folder className={`w-4 h-4 shrink-0 ${activeFolder === folder.folder_path ? 'fill-blue-500/20' : ''}`} />
                      <span className="truncate">{folder.folder_path}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full md:w-2/3 bg-[#0a0a0a] border border-[#27272a] rounded-md p-6 relative max-h-[500px] overflow-y-auto">
              {activeFolder && activeData ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#27272a]">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-lg font-bold text-white">AI Analysis: <span className="text-blue-400 font-mono text-sm px-2 py-1 bg-blue-500/10 rounded">{activeData.folder_path}</span></h3>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-sm">
                    {activeData.description}
                  </p>
                  <div className="mt-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                     <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Why it's useful</div>
                     <p className="text-xs text-indigo-200/70 leading-relaxed">
                       {activeData.why_it_is_useful}
                     </p>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-3 min-h-[200px]">
                  <Folder className="w-8 h-8 opacity-20" />
                  <p className="text-sm">Select a directory to view its AI breakdown.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
