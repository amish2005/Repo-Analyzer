"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileCode2, Code, Copy, Check, MessageSquarePlus } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useChatContext } from "@/context/ChatContext";
import { API_BASE } from "@/utils/api";

function CodebasePageContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project_id");
  const file = searchParams.get("file");
  
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const { addContext, openChat } = useChatContext();

  const handleAttach = () => {
    if (content && file) {
      addContext({ id: file, title: file.split('/').pop() || file, content: content });
      openChat();
    }
  };

  useEffect(() => {
    if (!projectId || !file) return;
    
    let isMounted = true;
    const fetchFileContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/project/${projectId}/file?path=${encodeURIComponent(file)}`);
        if (!res.ok) {
          throw new Error("Failed to fetch file content");
        }
        const data = await res.json();
        if (isMounted) setContent(data.content);
      } catch (err: any) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchFileContent();
    return () => { isMounted = false; };
  }, [projectId, file]);

  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050505] rounded-md border border-[#27272a] text-zinc-500">
        <Code className="w-12 h-12 mb-4 opacity-20" />
        <p>Select a file from the explorer to view its contents.</p>
      </div>
    );
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      case 'py': return 'python';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'md': return 'markdown';
      case 'sh': case 'bash': return 'bash';
      case 'sql': return 'sql';
      default: return 'text';
    }
  };

  const language = file ? getLanguage(file) : 'text';

  return (
    <div className="h-full flex flex-col bg-[#050505] rounded-md border border-[#27272a] overflow-hidden">
      <div className="h-10 bg-[#0a0a0a] border-b border-[#27272a] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileCode2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-sm text-zinc-300 font-mono truncate">{file}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAttach}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-400 hover:text-white hover:bg-blue-500/20 transition-colors border border-transparent hover:border-blue-500/30 bg-blue-500/10"
            title="Attach this file to AI Chat"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Attach to Chat
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors border border-transparent hover:border-[#27272a]"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-[#000000] relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={{
              margin: 0,
              padding: '1rem',
              background: 'transparent',
              fontSize: '13px',
            }}
            showLineNumbers={true}
            wrapLines={true}
            lineNumberStyle={{
              minWidth: '2.5rem',
              paddingRight: '1rem',
              textAlign: 'right',
              color: '#52525b',
              borderRight: '1px solid #27272a',
              marginRight: '1rem',
            }}
          >
            {content || ' '}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}


import { Suspense } from "react";

export default function CodebasePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black text-zinc-500">Loading...</div>}>
      <CodebasePageContent />
    </Suspense>
  );
}
