"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, Handle, Position, MarkerType, useReactFlow, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Database, Key, Hash, TableProperties, Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";
import { API_BASE } from "@/utils/api";

function TopRightControls({ isFullscreen, setIsFullscreen }: { isFullscreen: boolean, setIsFullscreen: (val: boolean) => void }) {
  const { zoomIn, zoomOut } = useReactFlow();
  
  return (
    <Panel position="top-right" className="flex items-center gap-2 m-4">
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

// Custom Node for Database Tables
function DatabaseTableNode({ data }: any) {
  return (
    <div className="w-64 bg-[#0a0a0a] border border-[#27272a] rounded-lg shadow-lg overflow-hidden font-sans">
      <div className="bg-[#141414] border-b border-[#27272a] p-3 flex items-center gap-2">
        <Database className={`w-4 h-4 ${data.color || 'text-blue-500'}`} />
        <span className="font-bold text-sm text-white">{data.label}</span>
      </div>
      <div className="p-0">
        {data.fields?.map((field: any, idx: number) => (
          <div key={idx} className={`flex items-center justify-between px-3 py-2 border-b border-[#27272a]/50 ${field.isPrimaryKey ? 'bg-blue-500/5' : ''} ${field.isForeignKey ? 'bg-emerald-500/5' : ''}`}>
             <div className="flex items-center gap-2">
                {field.isPrimaryKey ? <Key className="w-3 h-3 text-amber-500" /> : (field.isForeignKey ? <Key className="w-3 h-3 text-zinc-400" /> : (field.name === 'created_at' || field.name === 'timestamp' ? <TableProperties className="w-3 h-3 text-zinc-500" /> : <Hash className="w-3 h-3 text-zinc-500" />))}
                <span className={`text-xs ${field.isPrimaryKey ? 'font-semibold text-zinc-200' : (field.isForeignKey ? 'text-blue-300 italic' : 'text-zinc-300')}`}>
                  {field.name}{field.isForeignKey && !field.name.includes('(FK)') ? ' (FK)' : ''}
                </span>
             </div>
             <span className="text-[10px] text-zinc-500 font-mono">{field.type}</span>
          </div>
        ))}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#3b82f6', border: 'none', width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: '#3b82f6', border: 'none', width: 8, height: 8 }} />
    </div>
  );
}

const TABLE_COLORS = [
  'text-blue-500', 'text-emerald-500', 'text-rose-500', 
  'text-amber-500', 'text-purple-500', 'text-cyan-500'
];

export default function DatabasePage() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id");
  const { addContext, openChat } = useChatContext();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes = useMemo(() => ({ table: DatabaseTableNode }), []);

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
          if (data?.final_documentation?.database) {
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
    if (!project?.final_documentation?.database) return;
    try {
      let dbData = project.final_documentation.database;
      if (typeof dbData === 'string') dbData = JSON.parse(dbData);
      
      const newNodes: any[] = [];
      const newEdges: any[] = [];

      let tableColorIdx = 0;

      dbData.databases?.forEach((db: any, dbIndex: number) => {
        // DB Label Node
        newNodes.push({
          id: db.id,
          type: 'default',
          data: { label: db.name },
          position: { x: 50, y: 50 + (dbIndex * 400) },
          style: { 
            backgroundColor: dbIndex % 2 === 0 ? '#1e3a8a' : '#78350f', 
            borderColor: dbIndex % 2 === 0 ? '#3b82f6' : '#f59e0b', 
            color: dbIndex % 2 === 0 ? '#60a5fa' : '#fbbf24', 
            fontWeight: 'bold', width: 'auto', padding: '10px 20px', borderRadius: '8px' 
          },
          draggable: false,
          selectable: false
        });

        // Table Nodes
        db.tables?.forEach((table: any, tblIndex: number) => {
          const colorClass = TABLE_COLORS[tableColorIdx % TABLE_COLORS.length];
          tableColorIdx++;
          newNodes.push({
            id: table.id,
            type: 'table',
            position: { x: 50 + (tblIndex * 350), y: 120 + (dbIndex * 400) },
            data: {
              label: table.label,
              color: colorClass,
              fields: table.fields || []
            }
          });
        });
      });

      dbData.relations?.forEach((rel: any, rIndex: number) => {
        const isCrossDB = rel.relation_type?.toLowerCase() === 'cross_db';
        newEdges.push({
          id: `edge-${rIndex}`,
          source: rel.source_table_id,
          target: rel.target_table_id,
          animated: true,
          style: { 
            stroke: isCrossDB ? '#f59e0b' : '#3b82f6', 
            strokeWidth: 2,
            strokeDasharray: isCrossDB ? '5,5' : undefined 
          },
          label: isCrossDB ? 'Cross-DB Sync' : '',
          labelStyle: { fill: '#a1a1aa', fontSize: 12, fontWeight: 600 },
          labelBgStyle: { fill: '#141414', fillOpacity: 0.8 },
          markerEnd: { type: MarkerType.ArrowClosed, color: isCrossDB ? '#f59e0b' : '#3b82f6' }
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (e) {
      console.error("Failed to parse database json", e);
    }
  }, [project?.final_documentation?.database, setNodes, setEdges]);

  if (loading || (!project?.final_documentation?.database && project?.status === 'processing')) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-12">
        <div className="w-16 h-16 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-6"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Database Schema...</h2>
        <p className="text-zinc-400">Extracting tables, fields, and relational constraints.</p>
      </div>
    );
  }

  let docs: any = { databases: [], relations: [] };
  try {
    const dbData = project?.final_documentation?.database;
    if (dbData) docs = typeof dbData === 'string' ? JSON.parse(dbData) : dbData;
  } catch (e) {}

  if (!docs || (!docs.databases && !docs.relations)) {
    return <div className="text-zinc-400 p-8">No database data available.</div>;
  }

  return (
    <div className="w-full space-y-8 pb-12 px-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Database Schema</h1>
        <p className="text-zinc-400">Interactive Entity-Relationship modeling across database instances. Drag to pan, scroll to zoom.</p>
      </div>

      <div className={isFullscreen ? "absolute inset-0 z-[100] bg-[#050505] w-full h-full" : "sharp-panel rounded-md overflow-hidden bg-[#050505] w-full border border-[#27272a] relative"} style={{ height: isFullscreen ? '100%' : '700px' }}>
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

      <div className="sharp-panel p-8 rounded-md">
        <h2 className="text-2xl font-bold text-white mb-8">Database & Table Documentation</h2>
        <div className="space-y-10">
          
          {docs.databases?.map((db: any, dbIndex: number) => (
            <div key={dbIndex} className={`relative group ${dbIndex > 0 ? "pt-8 border-t border-[#27272a]" : ""}`}>
              <button 
                onClick={() => {
                  const dbStr = `${db.name} - ${db.description}\nTables: ${db.tables?.map((t:any) => t.label).join(', ')}`;
                  addContext({ id: `db-${db.name}`, title: `Database: ${db.name}`, content: dbStr });
                  openChat();
                }}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm z-10"
                title="Ask AI about this DB"
              >
                <span className="text-xs font-medium">@</span>
              </button>
              <div className="flex items-center gap-3 mb-4 pr-10">
                <Database className={`w-6 h-6 ${dbIndex % 2 === 0 ? 'text-blue-500' : 'text-amber-500'}`} />
                <h3 className={`text-xl font-bold ${dbIndex % 2 === 0 ? 'text-blue-400' : 'text-amber-400'}`}>{db.name}</h3>
              </div>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed max-w-3xl">
                {db.description}
              </p>
              
              <div className="flex flex-col gap-4">
                {db.tables?.map((table: any, tIdx: number) => (
                  <div key={tIdx} className="bg-[#0a0a0a] border border-[#27272a] p-5 rounded-lg hover:border-[#3f3f46] transition-colors relative group">
                    <button 
                      onClick={() => {
                        addContext({ id: `db-table-${table.label}`, title: `Table: ${table.label}`, content: `Table ${table.label} fields: ${table.fields?.map((f: any) => f.name).join(', ')}. Description: ${table.description}` });
                        openChat();
                      }}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm"
                      title="Ask AI about this"
                    >
                      <span className="text-xs font-medium">@</span>
                    </button>
                    <h4 className="font-bold text-white mb-3 font-mono text-sm flex flex-wrap items-center gap-2 pr-8">
                      {table.label}
                      <span className="text-zinc-500 font-sans font-normal text-xs ml-1">
                        ({table.fields?.map((f: any) => f.name).join(', ')})
                      </span>
                    </h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {table.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
