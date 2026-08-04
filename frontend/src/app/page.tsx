"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { GitBranch, Upload, Code2, ArrowRight, Search, Settings, LogOut, Box, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { analyzeRepo } from "@/utils/api";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [userProjects, setUserProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSignupPopup, setShowSignupPopup] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const router = useRouter();

  const [leftWidth, setLeftWidth] = useState(320);
  const isDraggingLeft = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft.current) {
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200; // Min width
        if (newWidth > 500) newWidth = 500; // Max width
        setLeftWidth(newWidth);
        document.body.style.cursor = 'col-resize';
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLeft.current) {
        isDraggingLeft.current = false;
        document.body.style.cursor = 'default';
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

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        fetch(`http://localhost:8000/api/user/${data.user.id}/projects`)
          .then(res => res.json())
          .then(json => {
            if (json.projects) {
              setUserProjects(json.projects);
            }
          })
          .catch(err => console.error("Error fetching projects:", err));
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAnalyze = async () => {
    if (!user) {
      setShowSignupPopup(true);
      return;
    }
    if (!repoUrl) return;
    
    setIsAnalyzing(true);
    try {
      const res = await analyzeRepo(repoUrl, user.id);
      router.push(`/dashboard?project_id=${res.project_id}`);
    } catch (error: any) {
      alert(`Analysis failed: ${error.message}`);
      setIsAnalyzing(false);
    }
  };

  const handleLogin = async (provider: 'github' | 'google') => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        alert(`Login failed: ${error.message}`);
      }
    } catch (e: any) {
      alert(`Unexpected error: ${e.message}`);
    }
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      const res = await fetch(`http://localhost:8000/api/project/${projectToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        setUserProjects(prev => prev.filter(p => p.id !== projectToDelete));
      } else {
        alert("Failed to delete project");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete project");
    } finally {
      setProjectToDelete(null);
    }
  };

  const filteredProjects = userProjects.filter(p => p.repo_url.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-screen w-full bg-black flex overflow-hidden">
      
      {/* Sidebar for logged-in users */}
      {user && (
        <>
          <div 
            className={`flex flex-col z-10 shrink-0 transition-all duration-300 ${isSidebarOpen ? 'bg-[#050505] border-r border-[#27272a]' : 'bg-black border-transparent'}`}
            style={{ 
              width: isSidebarOpen ? `${leftWidth}px` : '64px',
              overflow: 'hidden'
            }}
          >
            <div className={`flex flex-col ${isSidebarOpen ? 'border-b border-[#27272a] p-4' : 'p-4 items-center justify-center'}`}>
              {isSidebarOpen ? (
                <div className="flex items-center justify-between mb-4">
                  <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Code2 className="w-6 h-6 text-white shrink-0" />
                    <span className="font-bold tracking-tight text-white whitespace-nowrap">Repo Analyser</span>
                  </Link>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <PanelLeftClose className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="group relative flex items-center justify-center w-full h-8 text-zinc-400 hover:text-white transition-colors mb-4"
                  title="Open Sidebar"
                >
                  <Code2 className="w-6 h-6 text-white absolute transition-opacity duration-200 group-hover:opacity-0" />
                  <PanelLeftOpen className="w-5 h-5 absolute opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                </button>
              )}
              
              {isSidebarOpen && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Search projects..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#141414] border border-[#27272a] rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>
            
            <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 w-full gemini-scrollbar">
              {isSidebarOpen && (
                <>
                  <div className="text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2 px-3 whitespace-nowrap">Recent Projects</div>
                  {filteredProjects.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-zinc-600">No projects found.</div>
                  ) : (
                    filteredProjects.map((proj) => (
                      <Link
                        key={proj.id}
                        href={`/dashboard?project_id=${proj.id}`}
                        className="flex items-center justify-between px-3 py-2.5 rounded-md font-medium transition-colors text-zinc-400 hover:text-white hover:bg-[#141414] group"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <Box className="w-5 h-5 shrink-0" />
                          <span className="truncate">{proj.repo_url.replace("https://github.com/", "").replace(/\/$/, "")}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border font-bold ${proj.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : proj.status === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {proj.status}
                          </span>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProjectToDelete(proj.id);
                            }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 transition-all"
                            title="Delete project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </Link>
                    ))
                  )}
                </>
              )}
            </nav>

            <div className={`w-full shrink-0 flex flex-col ${isSidebarOpen ? 'border-t border-[#27272a] p-4' : 'p-2 items-center'}`}>
              <button className={`flex items-center gap-3 rounded-md text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors ${isSidebarOpen ? 'w-full text-left px-3 py-2' : 'p-2 justify-center'}`} title="Settings">
                <Settings className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="truncate">Settings</span>}
              </button>
              <button onClick={handleLogout} className={`flex items-center gap-3 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mt-1 ${isSidebarOpen ? 'w-full text-left px-3 py-2' : 'p-2 justify-center'}`} title="Log out">
                <LogOut className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="truncate">Log out</span>}
              </button>
            </div>
          </div>
          
          {/* Left Drag Resizer */}
          {isSidebarOpen && (
            <div 
              className="w-1 bg-[#27272a] hover:bg-blue-500 cursor-col-resize z-20 shrink-0 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); isDraggingLeft.current = true; }}
            />
          )}
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto relative pt-4">
        
        {/* Top Right Actions */}
        <div className="absolute top-6 right-6 flex items-center gap-3 z-20">

          
          {/* Login Buttons for Logged-Out Users */}
          {!user && (
            <>
              <button 
                onClick={() => handleLogin('github')} 
                className="flex items-center gap-2 text-sm font-medium bg-[#141414] border border-[#27272a] hover:bg-[#27272a] text-white px-4 py-2 rounded-md transition-all font-semibold"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.53 6-6.76a5.2 5.2 0 0 0-1.5-3.78c.15-.38.65-1.8-.14-3.72 0 0-1.22-.39-4 1.5a13.8 13.8 0 0 0-7 0c-2.78-1.89-4-1.5-4-1.5-.79 1.92-.29 3.34-.14 3.72A5.2 5.2 0 0 0 3 8.24c0 5.23 3 6.42 6 6.76-.3.26-.6.71-.8 1.48-.68.31-2.42.84-3.5-1-1.12-1.85-3-2-3-2-1.3-.12-.13.85-.13.85.7.35 1.5 1.63 1.5 1.63 1 1.7 3.2 1.2 3.2 1.2v3.3"/></svg>
                GitHub
              </button>
              <button 
                onClick={() => handleLogin('google')} 
                className="flex items-center gap-2 text-sm font-medium bg-[#141414] border border-[#27272a] hover:bg-[#27272a] text-white px-4 py-2 rounded-md transition-all font-semibold"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
            </>
          )}
        </div>

        <div className="flex-grow flex flex-col items-center justify-center p-6 pt-4 z-10 max-w-4xl mx-auto w-full text-center">
          {!user && (
            <div className="flex items-center gap-3 mb-12">
              <Code2 className="w-10 h-10 text-white" />
              <span className="text-3xl font-bold tracking-tight text-white">Repo Analyser</span>
            </div>
          )}

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm sharp-panel mb-8 text-zinc-300 text-sm font-medium border-zinc-700">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next-Gen Code Intelligence
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white">
            Understand any codebase in <span className="text-gradient">seconds.</span>
          </h1>
          
          <p className="text-zinc-400 text-lg mb-10 max-w-2xl mx-auto font-serif">
            Instantly map, analyze, and understand any codebase with AI.
          </p>

          {/* Input Actions */}
          <div className="w-full max-w-2xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
                  <GitBranch className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="Paste GitHub Repository URL" 
                  className="w-full bg-[#0a0a0a] border border-[#27272a] text-white placeholder-zinc-600 rounded-md pl-12 pr-4 py-4 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all shadow-xl shadow-black"
                />
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-md font-bold transition-all group whitespace-nowrap disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  "Analyze Repo"
                )}
                {!isAnalyzing && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-grow h-px bg-[#27272a]"></div>
              <span className="text-zinc-600 text-sm font-bold uppercase tracking-widest">OR</span>
              <div className="flex-grow h-px bg-[#27272a]"></div>
            </div>

            <div className="w-full border-2 border-dashed border-[#27272a] rounded-md p-8 hover:border-[#3f3f46] hover:bg-[#0a0a0a] transition-all cursor-pointer group flex flex-col items-center justify-center gap-3">
              <div className="p-3 bg-[#141414] rounded-md border border-[#27272a] group-hover:border-[#3f3f46] transition-colors">
                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
              </div>
              <div>
                <span className="font-semibold text-zinc-200">Click to upload</span> or drag and drop
              </div>
              <p className="text-sm text-zinc-500">ZIP files containing source code (Max 50MB)</p>
            </div>
          </div>
        </div>
      </main>

      {/* Signup Popup Modal */}
      {showSignupPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#050505] border border-[#27272a] rounded-xl p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowSignupPopup(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="flex justify-center mb-6">
              <Code2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-center text-white mb-2">Sign in to continue</h2>
            <p className="text-center text-zinc-400 mb-8">You need an account to analyze repositories and save your projects.</p>
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => handleLogin('github')} 
                className="flex items-center justify-center gap-3 text-sm font-medium bg-[#141414] border border-[#27272a] hover:bg-[#27272a] text-white px-4 py-3 rounded-md transition-all w-full font-semibold"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.34 6-1.53 6-6.76a5.2 5.2 0 0 0-1.5-3.78c.15-.38.65-1.8-.14-3.72 0 0-1.22-.39-4 1.5a13.8 13.8 0 0 0-7 0c-2.78-1.89-4-1.5-4-1.5-.79 1.92-.29 3.34-.14 3.72A5.2 5.2 0 0 0 3 8.24c0 5.23 3 6.42 6 6.76-.3.26-.6.71-.8 1.48-.68.31-2.42.84-3.5-1-1.12-1.85-3-2-3-2-1.3-.12-.13.85-.13.85.7.35 1.5 1.63 1.5 1.63 1 1.7 3.2 1.2 3.2 1.2v3.3"/></svg>
                Continue with GitHub
              </button>
              <button 
                onClick={() => handleLogin('google')} 
                className="flex items-center justify-center gap-3 text-sm font-medium bg-[#141414] border border-[#27272a] hover:bg-[#27272a] text-white px-4 py-3 rounded-md transition-all w-full font-semibold"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Project Delete Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border border-[#27272a] rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-semibold text-white mb-2">Delete Project</h3>
            <p className="text-zinc-400 text-sm mb-6">Are you sure you want to delete this project? This action cannot be undone and will permanently erase all associated code embeddings.</p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-[#141414] hover:bg-[#27272a] border border-[#27272a] rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-md transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
