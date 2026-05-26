import React from 'react';

export const WaveChart = () => (
  <>
    <style>{`
      @keyframes flow {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      .animate-flow {
        animation: flow 3s linear infinite;
      }
    `}</style>
    <div className="absolute inset-0 w-[200%] h-full flex animate-flow opacity-60">
      {[1, 2].map((i) => (
        <svg key={i} className="w-1/2 h-full transition-all duration-700" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="gradient-red" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(248,113,113,0.2)" />
              <stop offset="100%" stopColor="rgba(248,113,113,0)" />
            </linearGradient>
            <linearGradient id="gradient-blue" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(59,130,246,0.2)" />
              <stop offset="100%" stopColor="rgba(59,130,246,0)" />
            </linearGradient>
          </defs>
          <path d="M0,100 L0,60 Q25,30 50,60 T100,60 L100,100 Z" fill="url(#gradient-red)" />
          <path d="M0,60 Q25,30 50,60 T100,60" fill="none" stroke="#f87171" strokeWidth="1.5" />
          <path d="M0,100 L0,40 Q25,80 50,40 T100,40 L100,100 Z" fill="url(#gradient-blue)" />
          <path d="M0,40 Q25,80 50,40 T100,40" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      ))}
    </div>
  </>
);

export const BarChart = () => (
  <div className="absolute inset-0 flex items-end justify-between px-2 opacity-80 pt-8 pb-2">
    {[40, 70, 45, 90, 65, 80, 30, 55, 85, 50, 75, 40, 95, 60].map((h, i) => (
      <div key={i} className="w-3 bg-emerald-500/10 rounded-t-sm relative group overflow-hidden" style={{ height: `${h}%` }}>
        <div className="absolute bottom-0 left-0 w-full bg-emerald-400/40 rounded-t-sm animate-pulse" style={{ height: `${h * 0.7}%`, animationDelay: `${i * 0.1}s` }} />
      </div>
    ))}
  </div>
);

export const SecurityLineChart = () => (
  <div className="absolute inset-0 w-full h-full opacity-70">
    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
      <defs>
        <linearGradient id="gradient-orange" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(249,115,22,0.3)" />
          <stop offset="100%" stopColor="rgba(249,115,22,0)" />
        </linearGradient>
      </defs>
      <path d="M0,100 L0,80 L10,60 L20,90 L30,40 L40,70 L50,20 L60,50 L70,30 L80,60 L90,10 L100,40 L100,100 Z" fill="url(#gradient-orange)" />
      <path d="M0,80 L10,60 L20,90 L30,40 L40,70 L50,20 L60,50 L70,30 L80,60 L90,10 L100,40" fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="50" cy="20" r="2" fill="#f97316" className="animate-pulse" />
      <circle cx="90" cy="10" r="2" fill="#f97316" className="animate-pulse" />
    </svg>
  </div>
);

export const ActivityGrid = () => (
  <div className="absolute inset-0 flex flex-col gap-2 p-2 opacity-60">
    {[...Array(4)].map((_, row) => (
      <div key={row} className="flex gap-2 justify-between flex-1">
        {[...Array(14)].map((_, col) => {
          const isActive = (row * 14 + col) % 3 === 0 || (row * 14 + col) % 7 === 0;
          return (
            <div 
              key={col} 
              className={`flex-1 rounded-sm ${isActive ? 'bg-purple-500/40 shadow-[0_0_8px_rgba(168,85,247,0.5)] animate-pulse' : 'bg-white/5'}`} 
              style={isActive ? { animationDelay: `${(row * col) % 5 * 0.2}s` } : {}}
            />
          );
        })}
      </div>
    ))}
  </div>
);
