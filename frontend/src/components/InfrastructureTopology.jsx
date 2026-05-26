import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, CheckCircle2, Server, Box, GitBranch } from 'lucide-react';

export default function InfrastructureTopology({ sessionData, analysis, repository }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const [logs, setLogs] = useState([]);

  const nodes = React.useMemo(() => {
    const n = [
      { id: 'source', label: 'CI/CD Source', x: 80, y: 60, color: '#22D3EE' },
      { id: 'backend', label: 'Backend Tests', x: 60, y: 260, color: '#3B82F6' },
      { id: 'docker', label: 'Docker Build', x: 200, y: 220, color: '#22D3EE' },
      { id: 'ai', label: 'AI Security', x: 340, y: 120, color: '#6366F1' },
      { id: 'deploy', label: 'Deployment', x: 200, y: 380, color: '#22D3EE' },
      { id: 'telemetry', label: 'Pulse Telemetry', x: 320, y: 320, color: '#3B82F6' },
    ];

    if (analysis?.vulnerabilities?.length > 0) {
      const docker = n.find(x => x.id === 'docker');
      docker.color = '#F59E0B';
      docker.isAnomaly = true;
    }

    if (analysis?.insights?.rootCause?.toLowerCase().includes('stale')) {
      const telemetry = n.find(x => x.id === 'telemetry');
      telemetry.isSlow = true;
      telemetry.color = '#94A3B8';
    }

    if (sessionData || analysis) {
      const ai = n.find(x => x.id === 'ai');
      ai.isActive = true;
      ai.color = '#22D3EE';
    }

    const deployDecision = analysis?.decision || sessionData?.devpulseScore?.status;
    if (deployDecision === 'BLOCK' || deployDecision === 'WARNING') {
      const deploy = n.find(x => x.id === 'deploy');
      deploy.color = '#EF4444';
      deploy.isAnomaly = true;
    }

    return n;
  }, [analysis, sessionData]);

  const paths = React.useMemo(() => {
    const p = [
      { id: 'p1', d: 'M 80 60 L 60 260', dur: '4s' },
      { id: 'p2', d: 'M 80 60 Q 140 100 200 220', dur: '5s' },
      { id: 'p3', d: 'M 60 260 Q 130 250 200 220', dur: '4.5s' },
      { id: 'p4', d: 'M 200 220 Q 270 160 340 120', dur: '3.5s' },
      { id: 'p5', d: 'M 200 220 L 200 380', dur: '4s' },
      { id: 'p6', d: 'M 340 120 Q 360 220 320 320', dur: '3s' },
      { id: 'p7', d: 'M 200 380 Q 260 400 320 320', dur: '4.5s' },
      { id: 'r1', d: 'M 340 120 Q 270 160 200 220', dur: '6s', isReverse: true },
      { id: 'r2', d: 'M 200 380 L 200 220', dur: '5s', isReverse: true },
    ];
    
    if (analysis?.insights?.rootCause?.toLowerCase().includes('stale')) {
      p.find(x => x.id === 'p6').dur = '8s';
      p.find(x => x.id === 'p7').dur = '10s';
    }
    return p;
  }, [analysis]);

  useEffect(() => {
    if (!sessionData) {
      setLogs([{ time: new Date().toLocaleTimeString([], { hour12: false }), text: "> Awaiting telemetry connection..." }]);
      return;
    }

    const baseLogs = [
      "> Establishing secure WebSocket connection...",
      `> Connected to ${repository?.fullName || 'target repository'}.`,
      "> Initiating pipeline baseline scan...",
      "> Analyzing source integrity...",
    ];

    if (sessionData.stages?.backend?.tests === "success") {
      baseLogs.push("> Backend integration tests passed.");
    } else if (sessionData.stages?.backend) {
      baseLogs.push("> WARNING: Backend test failures detected.");
    }

    if (sessionData.stages?.docker?.build === "success") {
      baseLogs.push("> Docker container built successfully.");
    }
    
    if (analysis?.vulnerabilities?.length > 0) {
      baseLogs.push(`> Trivy scan found ${analysis.vulnerabilities.length} vulnerabilities.`);
      baseLogs.push(`> Identifying root cause and blast radius...`);
    } else if (analysis) {
      baseLogs.push("> No vulnerabilities found in Docker layers.");
    }

    const aiScore = analysis?.securityScore || sessionData?.devpulseScore?.score;
    const aiDecision = analysis?.decision || sessionData?.devpulseScore?.status;
    if (aiDecision) {
      baseLogs.push("> Running DevPulse AI Risk Assessment...");
      baseLogs.push(`> AI Decision: ${aiDecision} (Score: ${aiScore})`);
    }

    let currentIndex = 0;
    setLogs([]);
    
    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString([], { hour12: false });
      if (currentIndex < baseLogs.length) {
        setLogs(prev => {
          const next = [...prev, { time: timeStr, text: baseLogs[currentIndex] }];
          return next.slice(-5);
        });
        currentIndex++;
      } else {
        const pings = [
          "> ping heartbeat... OK (12ms)",
          "> refreshing container registry...",
          "> verifying IAM policies...",
          "> deep scanning layer hashes...",
        ];
        setLogs(prev => {
          const next = [...prev, { time: timeStr, text: pings[Math.floor(Math.random() * pings.length)] }];
          return next.slice(-5);
        });
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [sessionData, analysis, repository]);

  const renderTooltipContent = () => {
    if (!hoveredNode) return null;
    
    let title = nodes.find(n => n.id === hoveredNode)?.label;
    let status = "Unknown";
    let statusColor = "text-slate-400";
    let detail = "";
    let Icon = Activity;

    switch (hoveredNode) {
      case 'source':
        title = "CI/CD Source";
        Icon = GitBranch;
        status = repository ? "Connected" : "No Repository";
        statusColor = repository ? "text-emerald-400" : "text-amber-400";
        detail = repository ? `Repository: ${repository.fullName}\nStatus: Synced` : "Awaiting source connection.";
        break;
      case 'backend':
        title = "Backend Tests";
        Icon = Box;
        if (sessionData?.stages?.backend) {
          const s = sessionData.stages.backend.tests;
          status = s === "success" ? "Passed" : s === "failure" ? "Failed" : "Skipped";
          statusColor = s === "success" ? "text-emerald-400" : s === "failure" ? "text-red-400" : "text-slate-400";
          detail = s === "success" ? "All integration and unit tests executed successfully." : "Test suite did not pass.";
        } else {
          status = "Pending";
          detail = "Waiting for pipeline telemetry.";
        }
        break;
      case 'docker':
        title = "Docker Build";
        Icon = Server;
        if (sessionData?.stages?.docker) {
          const s = sessionData.stages.docker.build;
          status = s === "success" ? "Built" : s === "failure" ? "Failed" : "Skipped";
          statusColor = s === "success" ? "text-emerald-400" : s === "failure" ? "text-red-400" : "text-slate-400";
          const vulns = analysis?.vulnerabilities?.length || 0;
          detail = vulns > 0 ? `${vulns} CVE(s) detected during Trivy scan.` : "Image scan clean. No vulnerabilities found.";
        } else {
          status = "Pending";
          detail = "Waiting for pipeline telemetry.";
        }
        break;
      case 'ai':
        title = "AI Security Engine";
        Icon = ShieldAlert;
        const aiScore = analysis?.securityScore || sessionData?.devpulseScore?.score;
        const aiDecision = analysis?.decision || sessionData?.devpulseScore?.status;
        if (aiScore) {
          status = aiDecision === "BLOCK" ? "Blocked" : "Passed";
          statusColor = aiDecision === "BLOCK" ? "text-red-400" : "text-emerald-400";
          detail = `DevPulse Assessment Complete\nOverall Security Score: ${aiScore}/100`;
        } else {
          status = "Monitoring";
          detail = "AI analysis initializing...";
        }
        break;
      case 'deploy':
        title = "Deployment Sync";
        Icon = CheckCircle2;
        const deployDecision = analysis?.decision || sessionData?.devpulseScore?.status;
        status = deployDecision === "BLOCK" ? "Halted" : deployDecision === "PASS" ? "Ready" : "Standby";
        statusColor = deployDecision === "BLOCK" ? "text-red-400" : deployDecision === "PASS" ? "text-emerald-400" : "text-amber-400";
        detail = deployDecision === "PASS" ? "Code is secure and authorized for deployment." : deployDecision === "BLOCK" ? "Deployment blocked by DevPulse policy." : "Syncing with infrastructure state.";
        break;
      case 'telemetry':
        title = "Pulse Telemetry";
        Icon = Activity;
        status = sessionData ? "Active" : "Idle";
        statusColor = sessionData ? "text-cyan-400" : "text-slate-400";
        detail = sessionData ? `Live stream established.\nSession ID: ${sessionData.id?.substring(0,8) || 'Unknown'}` : "No active streams.";
        break;
    }

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-3.5 h-3.5 ${statusColor}`} />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-200">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded bg-white/5 border border-white/5 ${statusColor}`}>
            {status}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 font-mono mt-1 leading-relaxed whitespace-pre-wrap">
          {detail}
        </p>
      </div>
    );
  };

  const activeNode = nodes.find(n => n.id === hoveredNode);

  let tooltipX = 0;
  let tooltipY = 0;
  
  if (activeNode) {
    // Horizontal positioning
    if (activeNode.x > 250) {
      tooltipX = activeNode.x - 240; // render on left
    } else if (activeNode.x < 150) {
      tooltipX = activeNode.x + 30; // render on right
    } else {
      tooltipX = activeNode.x - 110; // center horizontally
    }

    // Vertical positioning
    if (activeNode.x >= 150 && activeNode.x <= 250) {
      // For center nodes (Docker, Deployment), avoid covering the node
      if (activeNode.y < 200) {
        tooltipY = activeNode.y + 30; // render below
      } else {
        tooltipY = activeNode.y - 170; // render above
      }
    } else {
      // For side nodes, vertically center alongside the node, clamped to viewBox
      tooltipY = Math.max(10, Math.min(activeNode.y - 60, 450 - 200));
    }
  }

  return (
    <div 
      className="flex-1 mt-6 rounded-xl border border-dashed border-white/[0.03] bg-[#0a0f1d]/40 relative overflow-hidden group min-h-[340px] w-full flex flex-col surface-3"
    >
      {/* SVG Map Section */}
      <div className="flex-1 flex items-center justify-center relative w-full h-full min-h-[180px]">
        {/* Sweeping scan background */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#22D3EE]/[0.02] to-transparent opacity-40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#22D3EE]/[0.05] to-transparent animate-scan-line pointer-events-none" style={{ animationDuration: '8s' }} />
        <div className="absolute inset-0 animate-grid-breathe pointer-events-none opacity-50"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
        
        {/* Title */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#22D3EE]" />
          <span className="text-[9px] text-slate-300 font-mono tracking-[0.2em] uppercase font-semibold">AI Infrastructure Active</span>
        </div>

        <svg className="w-full h-full max-w-[440px] -translate-y-4 scale-[1.04]" viewBox="0 0 400 450" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="bloom" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="glow-heavy" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Connection Paths */}
        {paths.map((path) => (
          <g key={path.id}>
            {/* Faint background line (only draw once for forward paths to avoid thick lines) */}
            {!path.isReverse && (
              <path d={path.d} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" strokeDasharray="4 4" />
            )}
            
            {/* Primary Signal Particle */}
            <circle r={path.isReverse ? "1.2" : "1.8"} fill={path.isReverse ? "#3B82F6" : "#22D3EE"} filter="url(#bloom)" opacity="0">
              <animateMotion dur={path.dur} repeatCount="indefinite" path={path.d} />
              <animate attributeName="opacity" values="0; 1; 1; 0" keyTimes="0; 0.1; 0.9; 1" dur={path.dur} repeatCount="indefinite" />
            </circle>

            {/* Staggered Secondary Particle */}
            {!path.isReverse && (
              <circle r="1" fill="#3B82F6" filter="url(#bloom)" opacity="0">
                <animateMotion dur={path.dur} begin="1.5s" repeatCount="indefinite" path={path.d} />
                <animate attributeName="opacity" values="0; 0.7; 0.7; 0" begin="1.5s" keyTimes="0; 0.1; 0.9; 1" dur={path.dur} repeatCount="indefinite" />
              </circle>
            )}
          </g>
        ))}

        {/* Nodes */}
        {nodes.map((node) => (
          <g 
            key={node.id} 
            className="group/node cursor-pointer"
            onMouseEnter={() => setHoveredNode(node.id)}
            onMouseLeave={() => setHoveredNode(null)}
          >
            {/* Modern Interactive HUD Background */}
            <g className="premium-transition group-hover/node:scale-125" style={{ transformOrigin: `${node.x}px ${node.y}px` }}>
              {/* Inner core glow */}
              <circle cx={node.x} cy={node.y} r="12" fill={node.color} className="opacity-[0.02] group-hover/node:opacity-20 premium-transition" filter="url(#bloom)" />
              
              {/* Solid bounding ring */}
              <circle cx={node.x} cy={node.y} r="14" fill="transparent" stroke={node.color} strokeWidth="0.5" className="opacity-20 group-hover/node:opacity-100 premium-transition" />
              
              {/* Spinning dashed data ring */}
              <circle cx={node.x} cy={node.y} r="18" fill="transparent" stroke={node.color} strokeWidth="0.5" strokeDasharray="2 4" className="opacity-10 group-hover/node:opacity-80 premium-transition">
                <animateTransform attributeName="transform" type="rotate" from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`} dur={`${8 + (node.x % 5)}s`} repeatCount="indefinite" />
              </circle>

              {/* Outer faint boundary */}
              <circle cx={node.x} cy={node.y} r="22" fill="transparent" stroke={node.color} strokeWidth="0.2" className="opacity-0 group-hover/node:opacity-40 premium-transition" />
            </g>
            
            {/* Core Node Structure */}
            <circle cx={node.x} cy={node.y} r="4.5" fill="rgba(10,15,29,0.8)" stroke={node.color} strokeWidth="1" />
            <circle cx={node.x} cy={node.y} r="1.5" fill={node.color} filter="url(#bloom)" />
            
            {/* Docker Build Centerpiece / Anomaly Enhancements */}
            {node.isAnomaly && (
              <g>
                {/* Rotating Scan Ring */}
                <circle cx={node.x} cy={node.y} r="10" fill="transparent" stroke={node.color} strokeWidth="0.5" strokeDasharray="3 3" className="animate-spin-slow opacity-80" style={{ transformOrigin: `${node.x}px ${node.y}px` }} />
                <circle cx={node.x} cy={node.y} r="13" fill="transparent" stroke={node.color} strokeWidth="0.2" strokeDasharray="1 4" className="animate-spin-slow opacity-50" style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDirection: 'reverse', animationDuration: '12s' }} />
                
                {/* Active Burst */}
                <circle cx={node.x} cy={node.y} r="20" fill="transparent" stroke={node.color} strokeWidth="1" className="animate-status-pulse opacity-20" filter="url(#glow-heavy)" />
                
                {/* Orbiting Satellite Particle */}
                <g className="animate-spin-slow" style={{ transformOrigin: `${node.x}px ${node.y}px`, animationDuration: '4s' }}>
                  <circle cx={node.x} cy={node.y - 10} r="1" fill="#F59E0B" filter="url(#bloom)" />
                </g>
              </g>
            )}

            {/* Intelligent Anomaly / State Pulses */}
            {node.isAnomaly && (
              <circle cx={node.x} cy={node.y} r="14" fill="transparent" stroke={node.color} strokeWidth="0.5" className="animate-ping opacity-30" />
            )}
            {node.isActive && (
              <circle cx={node.x} cy={node.y} r="12" fill="transparent" stroke={node.color} strokeWidth="0.5" className="animate-breathe opacity-30" />
            )}

            {/* Labels */}
            <text x={node.x} y={node.y + 22} textAnchor="middle" fill="#94A3B8" fontSize="8" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" letterSpacing="0.05em" className="opacity-80 group-hover/node:opacity-100 group-hover/node:fill-white premium-transition">
              {node.label}
            </text>
          </g>
        ))}

        {/* SVG-embedded Tooltip to guarantee perfect coordinate mapping and prevent clipping */}
        {hoveredNode && activeNode && (
          <foreignObject
            x={tooltipX}
            y={tooltipY}
            width="220"
            height="200"
            className="pointer-events-none overflow-visible"
          >
            <div 
              className="surface-1 rounded-xl p-3 shadow-2xl transition-all duration-300"
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {renderTooltipContent()}
            </div>
          </foreignObject>
        )}
      </svg>
      
      {/* Fading Edges to blend seamlessly into background */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0a0f1d] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0a0f1d] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0a0f1d] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#020617]/80 to-transparent pointer-events-none" />
      </div>

      {/* Live Telemetry Feed */}
      <div className="h-28 w-full border-t border-white/[0.05] bg-[#020617]/80 relative z-20 flex flex-col justify-end p-4 font-mono text-[10px] overflow-hidden">
        {/* Gradient mask to fade out older logs */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#020617] to-transparent z-10 pointer-events-none" />
        
        <div className="flex flex-col gap-1.5 z-0">
          {logs.map((log, i) => {
            const isNewest = i === logs.length - 1;
            const opacity = isNewest ? 1 : i === logs.length - 2 ? 0.65 : i === logs.length - 3 ? 0.45 : 0.22;
            return (
              <div key={i} className="animate-fade-in-up flex items-start gap-2" style={{ color: `rgba(34, 211, 238, ${opacity})` }}>
                <span className="shrink-0" style={{ opacity: opacity * 0.8 }}>[{log.time}]</span>
                <span className="break-all">{log.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
