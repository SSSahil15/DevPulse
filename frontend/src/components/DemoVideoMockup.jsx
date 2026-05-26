import React, { useState, useEffect } from 'react';
import { Play, Pause, Maximize, Volume2, Settings, ShieldAlert, CheckCircle2, Terminal, Code2, Cpu } from 'lucide-react';

export default function DemoVideoMockup() {
  const [time, setTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  
  const DURATION = 12; // 12 seconds loop
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setTime(prev => {
        if (prev >= DURATION) return 0;
        return prev + 0.1;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = (e) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  // Format time (e.g., 0:04)
  const formatTime = (t) => {
    const sec = Math.floor(t);
    return `0:${sec.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = (time / DURATION) * 100;

  return (
    <div className="w-full h-full bg-[#080b14] relative overflow-hidden group select-none flex flex-col font-mono text-sm">
      
      {/* Video Content Engine */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6">
        
        {/* SCENE 1: Pipeline Scan (0 - 4s) */}
        <div className={`absolute inset-0 transition-opacity duration-500 flex flex-col p-8 ${time < 4 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <div className="flex items-center gap-3 mb-6 text-blue-400 font-bold tracking-widest uppercase text-xs">
            <Terminal className="w-4 h-4" /> Pipeline Security Scan Initiated
          </div>
          <div className="flex-1 bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-xs text-slate-400 flex flex-col gap-2 overflow-hidden relative">
            <div className="text-slate-500">Initializing DevPulse engines...</div>
            {time > 0.5 && <div>[00:00:01] Fetching dependencies...</div>}
            {time > 1.0 && <div>[00:00:02] Analyzing package-lock.json...</div>}
            {time > 1.5 && <div>[00:00:03] Scanning source code with static analysis...</div>}
            {time > 2.0 && <div className="text-emerald-400">[00:00:04] 12,408 files scanned successfully.</div>}
            {time > 2.5 && <div>[00:00:05] Cross-referencing CVE database...</div>}
            {time > 3.0 && <div className="text-red-400 mt-2 font-bold animate-pulse">[!] CRITICAL THREAT DETECTED IN ROUTER MODULE</div>}
            {time > 3.5 && <div className="text-red-400 bg-red-500/20 px-2 py-1 inline-block border border-red-500/50 mt-1">CVE-2024-9182: Remote Code Execution</div>}
          </div>
        </div>

        {/* SCENE 2: Vulnerability Alert (4s - 8s) */}
        <div className={`absolute inset-0 transition-opacity duration-500 flex items-center justify-center p-8 bg-red-950/20 ${time >= 4 && time < 8 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
           <div className="bg-[#0d1117] border border-red-500/30 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_100px_rgba(239,68,68,0.15)] transform transition-transform">
              <div className="flex items-start gap-4">
                 <div className="p-3 bg-red-500/20 rounded-full text-red-500">
                    <ShieldAlert className="w-8 h-8" />
                 </div>
                 <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">Critical Vulnerability Blocked</h3>
                    <p className="text-slate-400 text-xs mb-4">DevPulse intercepted a deployment containing a known RCE vector in your authentication middleware.</p>
                    <div className="bg-black/50 p-3 rounded text-xs font-mono text-red-300 border border-red-500/20 mb-4">
                      Dependency: express-auth-core v1.2.0<br/>
                      Path: /src/middleware/auth.js
                    </div>
                    {time > 5.5 && (
                      <div className="flex gap-3">
                         <div className="bg-red-500 text-white px-4 py-2 rounded text-xs font-bold shadow-lg shadow-red-500/20">Halt Deployment</div>
                         {time > 6.5 && (
                           <div className="bg-blue-500 text-white px-4 py-2 rounded text-xs font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 animate-pulse-glow">
                             <Cpu className="w-3 h-3" /> Auto-Fix with AI
                           </div>
                         )}
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>

        {/* SCENE 3: Auto-Remediation (8s - 12s) */}
        <div className={`absolute inset-0 transition-opacity duration-500 flex flex-col p-8 ${time >= 8 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <div className="flex items-center gap-3 mb-6 text-emerald-400 font-bold tracking-widest uppercase text-xs">
            <CheckCircle2 className="w-4 h-4" /> Remediation Complete
          </div>
          
          <div className="flex-1 flex gap-4">
            <div className="flex-1 bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-xs overflow-hidden relative">
               <div className="text-slate-500 mb-2">// ORIGINAL CODE</div>
               <div className="text-red-400 bg-red-500/10 px-2 py-1 rounded line-through">const token = req.query.token || eval(req.body.token);</div>
               <div className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded mt-2">const token = sanitize(req.query.token);</div>
            </div>
            
            <div className="w-64 bg-blue-950/20 border border-blue-500/20 rounded-lg p-4 flex flex-col justify-center items-center text-center">
               <div className="w-16 h-16 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center mb-4">
                 <Cpu className="w-8 h-8 text-blue-400" />
               </div>
               <div className="text-white font-bold text-sm mb-1">Fix Applied</div>
               <div className="text-slate-400 text-xs">AI Copilot generated and merged PR #142 automatically.</div>
               {time > 10.5 && (
                 <div className="mt-6 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                   <CheckCircle2 className="w-3 h-3" /> Deployment Resumed
                 </div>
               )}
            </div>
          </div>
        </div>
        
      </div>

      {/* Video Overlay Play Button (when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-40" onClick={togglePlay}>
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.6)] hover:scale-110 transition-transform cursor-pointer">
            <Play className="w-8 h-8 text-white fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Custom Video Controls */}
      <div className="h-12 bg-gradient-to-t from-black/80 to-transparent flex items-center px-4 gap-4 z-30 absolute bottom-0 left-0 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button onClick={togglePlay} className="text-white hover:text-blue-400 transition-colors">
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
        <div className="flex-1 relative flex items-center group/progress cursor-pointer">
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="absolute w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity pointer-events-none" style={{ left: `calc(${progress}% - 6px)` }} />
        </div>
        <div className="text-white text-xs font-medium font-sans">
          {formatTime(time)} / {formatTime(DURATION)}
        </div>
        <Volume2 className="w-4 h-4 text-white hover:text-blue-400 cursor-pointer transition-colors" />
        <Settings className="w-4 h-4 text-white hover:text-blue-400 cursor-pointer transition-colors" />
        <Maximize className="w-4 h-4 text-white hover:text-blue-400 cursor-pointer transition-colors" />
      </div>
    </div>
  );
}
