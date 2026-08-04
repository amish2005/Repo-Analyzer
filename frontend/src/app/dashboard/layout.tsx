"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { chatWithAI } from "@/utils/api";
import { ChatContext, ChatContextItem } from "@/context/ChatContext";
import ReactMarkdown from 'react-markdown';
import { API_BASE } from "@/utils/api";
import { 
  Code2, 
  LayoutDashboard, 
  Network, 
  Database, 
  KeySquare, 
  PackageSearch,
  Settings,
  LogOut,
  X,
  Send,
  Bot,
  MessageSquare,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Folder,
  FileCode2,
  FileJson,
  ChevronDown,
  ChevronRight
} from "lucide-react";

const buildTree = (paths: string[]) => {
  const root: any = {};
  for (const path of paths) {
    const parts = path.split(/[/\\]/).filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      if (i === parts.length - 1) {
        current[parts[i]] = null;
      } else {
        current[parts[i]] = current[parts[i]] || {};
        current = current[parts[i]];
      }
    }
  }
  return root;
};

const TreeNode = ({ name, node, path, currentFile, projectId, onAddContext }: any) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const isFile = node === null;
  const fullPath = path ? `${path}/${name}` : name;
  
  const handleAddContext = async (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddContext || isLoading) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/project/${projectId}/file?path=${encodeURIComponent(fullPath)}`);
      if (res.ok) {
        const data = await res.json();
        onAddContext({ id: fullPath, title: name, content: data.content });
      }
    } catch (err) {
      console.error("Failed to fetch file content", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFile) {
    const isSelected = currentFile === fullPath;
    return (
      <div className={`flex items-center group py-1 px-2 rounded-sm cursor-pointer transition-colors ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-[#141414] text-zinc-400 hover:text-zinc-300'}`}>
        <Link href={`/dashboard/codebase?project_id=${projectId}&file=${encodeURIComponent(fullPath)}`} className="flex items-center gap-2 flex-1 min-w-0">
          <FileCode2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-zinc-500'}`} />
          <span className="truncate text-[13px]">{name}</span>
        </Link>
        <button 
          onClick={handleAddContext}
          disabled={isLoading}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded bg-[#141414] border border-[#27272a] text-zinc-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 transition-all shadow-sm ml-2 disabled:opacity-50"
          title="Add to chat context"
        >
          {isLoading ? (
             <div className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
          ) : (
             <span className="text-xs font-medium">@</span>
          )}
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col">
      <div onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-1 py-1 px-1 hover:bg-[#141414] rounded-sm cursor-pointer text-zinc-300 transition-colors">
        {isOpen ? <ChevronDown className="w-3 h-3 shrink-0 opacity-70" /> : <ChevronRight className="w-3 h-3 shrink-0 opacity-70" />}
        <Folder className={`w-3.5 h-3.5 shrink-0 ${isOpen ? 'text-blue-400 fill-blue-400/20' : 'text-zinc-400 fill-zinc-400/20'}`} /> 
        <span className="truncate ml-1 text-[13px]">{name}</span>
      </div>
      {isOpen && (
        <div className="flex flex-col pl-2 border-l border-[#27272a] ml-[9px] mt-0.5 gap-0.5">
          {Object.entries(node).map(([childName, childNode]) => (
            <TreeNode key={childName} name={childName} node={childNode} path={fullPath} currentFile={currentFile} projectId={projectId} onAddContext={onAddContext} />
          ))}
        </div>
      )}
    </div>
  );
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project_id');
  
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  
  const [messages, setMessages] = useState([{role: "assistant", content: "Hello! I'm ready to answer any questions about this codebase. Ask me about the architecture, tech stack, or where specific logic resides."}]);
  const [chatInput, setChatInput] = useState("");
  const [activeContexts, setActiveContexts] = useState<ChatContextItem[]>([]);
  const [showAllContexts, setShowAllContexts] = useState(false);
  const openChat = () => setIsRightCollapsed(false);
  const addContext = (item: ChatContextItem) => {
    setActiveContexts(prev => {
      if (prev.find(c => c.id === item.id)) return prev;
      return [...prev, item];
    });
  };
  const removeContext = (id: string) => setActiveContexts(prev => prev.filter(c => c.id !== id));
  const clearContexts = () => {
    setActiveContexts([]);
    setShowAllContexts(false);
  };
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [filePaths, setFilePaths] = useState<string[]>([]);
  
  const currentFile = searchParams.get('file');
  
  const router = useRouter();

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    const fetchFileTree = async () => {
      try {
        const response = await fetch(`${API_BASE}/project/${projectId}/filetree`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) setFilePaths(data.files || []);
        }
      } catch (error) {
        console.error("Error fetching file tree:", error);
      }
    };

    const fetchProject = async () => {
      try {
        const response = await fetch(`${API_BASE}/project/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) setProject(data);
          
          if (data && data.status === 'processing' && isMounted) {
            setTimeout(fetchProject, 5000);
          } else if (data && data.status === 'completed' && isMounted) {
            fetchFileTree();
          }
        }
      } catch (error) {
        console.error("Error fetching project in layout:", error);
        if (isMounted) setTimeout(fetchProject, 5000);
      }
    };

    const fetchChatHistory = async () => {
      try {
        const response = await fetch(`${API_BASE}/chat/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.messages && data.messages.length > 0) {
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
    
    fetchProject();
    fetchChatHistory();
    return () => { isMounted = false; };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      router.push("/");
    }
  }, [projectId, router]);

  if (!projectId) {
    return null;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !projectId || isChatLoading) return;
    
    const contextPrefix = activeContexts.length > 0 
      ? `[Context Sources:\n${activeContexts.map(c => `- ${c.title}:\n${c.content}`).join('\n\n')}]\n===END_CONTEXT===\n` 
      : "";
    const userMsg = contextPrefix + chatInput;
    
    // Display what the user sees vs what we send
    setMessages(prev => [...prev, { 
      role: "user", 
      content: chatInput 
    }]);
    setChatInput("");
    clearContexts();
    setIsChatLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: projectId, message: userMsg }),
      });

      if (!response.ok) throw new Error("Network response was not ok");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (!reader) throw new Error("No reader");

      setIsChatLoading(false);
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const textChunk = decoder.decode(value, { stream: true });
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = { ...newMessages[newMessages.length - 1] };
          lastMsg.content += textChunk;
          newMessages[newMessages.length - 1] = lastMsg;
          return newMessages;
        });
      }
    } catch (error) {
      setIsChatLoading(false);
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error answering that." }]);
    }
  };

  // Custom panel resizing state
  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(450);
  const isDraggingLeft = useRef(false);
  const isDraggingRight = useRef(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft.current) {
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200; // Min width
        if (newWidth > 500) newWidth = 500; // Max width
        setLeftWidth(newWidth);
        document.body.style.cursor = 'col-resize';
      } else if (isDraggingRight.current) {
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 280) newWidth = 280; // Min width
        if (newWidth > 600) newWidth = 600; // Max width
        setRightWidth(newWidth);
        document.body.style.cursor = 'col-resize';
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLeft.current || isDraggingRight.current) {
        isDraggingLeft.current = false;
        isDraggingRight.current = false;
        document.body.style.cursor = 'default';
        
        // Prevent text selection issues by clearing selection after drag
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="h-screen w-full bg-black flex flex-col overflow-hidden text-white">
      {/* Top Header */}
      <header className="h-14 border-b border-[#27272a] bg-[#0a0a0a] flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {isLeftCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Code2 className="w-6 h-6 text-white" />
            <span className="font-bold tracking-tight text-white">Repo Analyser</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 hidden md:flex">
            <span className="text-zinc-500 text-sm">
              {project?.status === 'completed' ? 'Analyzed:' : 'Analyzing:'}
            </span>
            <span className="text-zinc-300 font-mono text-sm bg-[#141414] px-2 py-1 rounded border border-[#27272a]">
              {project?.repo_url ? project.repo_url.replace("https://github.com/", "") : "loading..."}
            </span>
          </div>
          
          <Link 
            href={pathname === '/dashboard/codebase' 
              ? (projectId ? `/dashboard?project_id=${projectId}` : '/dashboard') 
              : (projectId ? `/dashboard/codebase?project_id=${projectId}` : '/dashboard/codebase')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-[#141414] border border-[#27272a] text-zinc-300 hover:text-white"
          >
            {pathname === '/dashboard/codebase' ? (
               <><LayoutDashboard className="w-4 h-4" /> Dashboard</>
            ) : (
               <><Code2 className="w-4 h-4" /> Codebase</>
            )}
          </Link>
          
          <button 
            onClick={() => setIsRightCollapsed(!isRightCollapsed)}
            className={`flex items-center justify-center p-2 rounded-full transition-colors border shadow-sm ${isRightCollapsed ? 'bg-[#141414] border-[#27272a] text-zinc-300 hover:text-white' : 'bg-white text-black border-white shadow-white/20'}`}
            title="Toggle AI Chat"
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-row">
        {/* Left Sidebar */}
        {!isLeftCollapsed && (
          <>
            <div 
              className="bg-[#050505] flex flex-col z-10 shrink-0" 
              style={{ width: `${leftWidth}px` }}
            >
              {pathname === '/dashboard/codebase' ? (
                // Codebase File Tree Sidebar
                <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 w-full text-sm gemini-scrollbar">
                  <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 px-3">File Explorer</div>
                  
                  <div className="flex flex-col text-zinc-400 font-mono text-xs">
                    {filePaths.length === 0 ? (
                      <div className="p-4 text-center text-zinc-500">Loading files...</div>
                    ) : (
                      Object.entries(buildTree(filePaths)).map(([name, node]) => (
                        <TreeNode key={name} name={name} node={node} path="" currentFile={currentFile} projectId={projectId} onAddContext={(item: ChatContextItem) => { addContext(item); openChat(); }} />
                      ))
                    )}
                  </div>
                </div>
              ) : (
                // Dashboard Insights Sidebar
                <>
                  <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 w-full gemini-scrollbar">
                    <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 px-3">Insights</div>
                    
                    {[
                      { name: "Overview", icon: LayoutDashboard, path: "/dashboard", key: "overview" },
                      { name: "Architecture", icon: Network, path: "/dashboard/architecture", key: "architecture" },
                      { name: "Database Schema", icon: Database, path: "/dashboard/database", key: "database" },
                      { name: "Auth Flow", icon: KeySquare, path: "/dashboard/auth", key: "auth" },
                      { name: "Dependencies", icon: PackageSearch, path: "/dashboard/dependencies", key: "dependencies" },
                    ].map((item) => {
                      const isProcessing = project?.status === 'processing' && !project?.final_documentation?.[item.key];
                      return (
                      <Link 
                        key={item.path} 
                        href={projectId ? `${item.path}?project_id=${projectId}` : item.path} 
                        className={`flex items-center justify-between px-3 py-2.5 rounded-md font-medium transition-colors ${
                          pathname === item.path 
                            ? 'bg-white text-black' 
                            : 'text-zinc-400 hover:text-white hover:bg-[#141414]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 shrink-0" />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {isProcessing && (
                          <div className="w-3.5 h-3.5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin shrink-0"></div>
                        )}
                      </Link>
                    )})}
                  </nav>

                  <div className="p-4 border-t border-[#27272a] w-full shrink-0">
                    <Link href="#" className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors">
                      <Settings className="w-5 h-5 shrink-0" />
                      <span className="truncate">Settings</span>
                    </Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1 text-left">
                      <LogOut className="w-5 h-5 shrink-0" />
                      <span className="truncate">Log out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Left Drag Resizer */}
            <div 
              className="w-1 bg-[#27272a] hover:bg-blue-500 cursor-col-resize z-20 shrink-0 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); isDraggingLeft.current = true; }}
            />
          </>
        )}

        {/* Middle Main Content */}
        <ChatContext.Provider value={{ activeContexts, addContext, removeContext, clearContexts, openChat }}>
          <div className="flex-1 bg-black overflow-y-auto relative z-0 flex flex-col p-8 min-w-[300px]">
            {children}
          </div>
        </ChatContext.Provider>

        {/* Right AI Chat */}
        {!isRightCollapsed && (
          <>
            {/* Right Drag Resizer */}
            <div 
              className="w-1 bg-[#27272a] hover:bg-blue-500 cursor-col-resize z-20 shrink-0 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); isDraggingRight.current = true; }}
            />
            
            <div 
              className="bg-[#050505] flex flex-col z-10 shrink-0"
              style={{ width: `${rightWidth}px` }}
            >
              <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-zinc-300" />
                  <span className="font-semibold truncate">AI Assistant</span>
                </div>
                <button onClick={() => setIsRightCollapsed(true)} className="text-zinc-500 hover:text-white shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-md bg-[#141414] border border-[#27272a] flex items-center justify-center shrink-0">
                      {msg.role === 'user' ? <div className="w-4 h-4 rounded-full bg-blue-500" /> : <Bot className="w-4 h-4 text-zinc-300" />}
                    </div>
                    <div className={`border border-[#27272a] p-3 rounded-md text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600/20 text-white rounded-tr-none' : 'bg-[#141414] text-zinc-300 rounded-tl-none prose prose-invert max-w-none'}`}>
                      {msg.role === 'user' ? (
                        msg.content.replace(/^\[Context Sources:[\s\S]*?===END_CONTEXT===\s*/g, '').replace(/^\[Context Sources:[\s\S]*?\]\s*\n/g, '')
                      ) : (
                        <div className="[&>p]:mb-2 [&>p:last-child]:mb-0 [&>pre]:my-2 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-2 [&>ol]:list-decimal [&>ol]:ml-4 [&>ol]:mb-2">
                          <ReactMarkdown>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-md bg-[#141414] border border-[#27272a] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-zinc-300" />
                    </div>
                    <div className="bg-[#141414] border border-[#27272a] text-zinc-400 p-3 rounded-md rounded-tl-none text-sm italic">
                      Thinking...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-[#27272a] bg-[#0a0a0a]">
                {activeContexts.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {(showAllContexts ? activeContexts : activeContexts.slice(0, 3)).map(ctx => (
                      <div key={ctx.id} className="flex items-center gap-2 bg-[#141414] border border-[#27272a] rounded px-3 py-1.5 text-xs max-w-full">
                        <div className="flex items-center gap-2 truncate text-zinc-300">
                          <Sparkles className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                          <span className="truncate font-medium">{ctx.title}</span>
                        </div>
                        <button onClick={() => removeContext(ctx.id)} className="text-zinc-500 hover:text-white shrink-0 ml-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {!showAllContexts && activeContexts.length > 3 && (
                      <button 
                        onClick={() => setShowAllContexts(true)}
                        className="flex items-center gap-2 bg-[#141414] border border-[#27272a] rounded px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#27272a] hover:text-white transition-colors"
                      >
                        <span className="font-medium">+{activeContexts.length - 3}</span>
                      </button>
                    )}
                    {showAllContexts && activeContexts.length > 3 && (
                      <button 
                        onClick={() => setShowAllContexts(false)}
                        className="flex items-center gap-2 bg-[#141414] border border-[#27272a] rounded px-3 py-1.5 text-xs text-zinc-400 hover:bg-[#27272a] hover:text-white transition-colors"
                      >
                        <span className="font-medium">Show less</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={projectId ? "Ask about the codebase..." : "Analyze a repo first"} 
                    disabled={!projectId || isChatLoading}
                    className="w-full bg-black border border-[#27272a] text-white placeholder-zinc-500 rounded-md pl-4 pr-10 py-3 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all text-sm disabled:opacity-50"
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={!projectId || isChatLoading}
                    className="absolute inset-y-0 right-2 flex items-center text-zinc-400 hover:text-white disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
