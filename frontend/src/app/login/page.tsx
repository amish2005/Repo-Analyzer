import Link from "next/link";
import { Code2, GitBranch, Mail, Lock } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 group z-10">
        <Code2 className="w-6 h-6 text-white" />
        <span className="text-lg font-bold tracking-tight text-white transition-colors">Repo Analyser</span>
      </Link>

      <div className="w-full max-w-md sharp-panel p-8 relative rounded-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-zinc-400 text-sm">Sign in to orchestrate your AI agents.</p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <button type="button" className="w-full bg-[#141414] hover:bg-[#27272a] text-white py-3 rounded-md font-medium transition-all flex items-center justify-center gap-2 border border-[#27272a]">
            <GitBranch className="w-5 h-5" />
            Continue with GitHub
          </button>
          
          <button type="button" className="w-full bg-[#141414] hover:bg-[#27272a] text-white py-3 rounded-md font-medium transition-all flex items-center justify-center gap-2 border border-[#27272a]">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-grow h-px bg-[#27272a]"></div>
          <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">OR</span>
          <div className="flex-grow h-px bg-[#27272a]"></div>
        </div>

        <form className="flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
              <Mail className="w-5 h-5" />
            </div>
            <input 
              type="email" 
              placeholder="Email address" 
              className="w-full bg-[#141414] border border-[#27272a] text-white placeholder-zinc-500 rounded-md pl-10 pr-4 py-3 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
            />
          </div>
          
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-white transition-colors">
              <Lock className="w-5 h-5" />
            </div>
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full bg-[#141414] border border-[#27272a] text-white placeholder-zinc-500 rounded-md pl-10 pr-4 py-3 outline-none focus:border-white focus:ring-1 focus:ring-white transition-all"
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-[#27272a] bg-[#141414] text-white focus:ring-white focus:ring-offset-black" />
              <span className="text-sm text-zinc-400">Remember me</span>
            </label>
            <a href="#" className="text-sm text-zinc-400 hover:text-white transition-colors underline">Forgot password?</a>
          </div>

          <Link href="/dashboard" className="w-full bg-white hover:bg-zinc-200 text-black py-3 rounded-md font-bold transition-all mt-4 text-center block">
            Sign in
          </Link>
        </form>

        <div className="text-center mt-8 text-sm text-zinc-400">
          Don't have an account?{' '}
          <Link href="/signup" className="text-white hover:underline transition-colors font-semibold">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
