import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { apiRequest } from '../api';

// Brand gradient helper
const BRAND_GRAD = 'linear-gradient(135deg,#38BDF8,#2563EB)';
const BRAND_GLOW = '0 0 24px rgba(37,99,235,0.35), 0 0 48px rgba(56,189,248,0.15)';

export default function AICopilot({ pipelineData, analysisResult, accessToken }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      isStructured: false,
      text: "Hi! I'm your DevPulse AI Copilot. Ask me about your pipeline score, vulnerabilities, or repository health!",
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  async function handleSend(e, overrideText = null) {
    if (e) e.preventDefault();
    const textToSend = overrideText || input;
    if (!textToSend.trim() || isTyping) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend.trim(),
      isStructured: false,
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!overrideText) setInput('');
    setIsTyping(true);

    try {
      // Create a lightweight context object so we don't blow up the payload size.
      // Large repos can have hundreds of CVEs, so we only send the top 15.
      const slimContext = {
        analysisResult,
        pipelineData: pipelineData ? {
          devpulseScore: pipelineData.devpulseScore,
          stages: {
            ...pipelineData.stages,
            security: {
              ...pipelineData.stages?.security,
              vulnerabilities: pipelineData.stages?.security?.vulnerabilities?.slice(0, 15) || []
            }
          }
        } : null
      };

      const response = await apiRequest('/api/ai/chat', {
        method: 'POST',
        accessToken,
        body: JSON.stringify({
          query: userMessage.text,
          context: slimContext,
          history: messages,
        }),
      });

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', isStructured: true, data: response },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          isStructured: false,
          text: 'Oops, I encountered an error connecting to the Copilot service. Please try again.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // Format bold text dynamically (naïve markdown parser)
  const formatText = (text) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*|\`.*?\`)/).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            style={{ color: '#4F46E5' }}
            className="bg-[#4F46E5]/10 px-1 py-0.5 rounded font-mono text-xs"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  function getConfidenceTooltip(confidence) {
    if (confidence === 'HIGH') return 'High confidence (full pipeline data)';
    if (confidence === 'MEDIUM') return 'Moderate confidence (partial data)';
    return 'Limited confidence (quick analysis)';
  }

  function renderStructuredMessage(data) {
    if (!data) return null;
    return (
      <div className="space-y-4 w-full">
        {data.summary && (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {formatText(data.summary)}
          </p>
        )}

        {/* Risk Level Badge */}
        {data.risk && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Risk Level:
            </span>
            <span
              className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ring-1 ${
                data.risk === 'HIGH'
                  ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                  : data.risk === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
              }`}
            >
              {data.risk}
            </span>
          </div>
        )}

        {data.issue && (
          <div className="bg-red-500/10 ring-1 ring-red-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1 text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Issue</span>
            </div>
            <p className="text-xs text-red-200 leading-relaxed">{formatText(data.issue)}</p>
          </div>
        )}

        {data.fix && data.fix !== 'No action required.' && (
          <div className="bg-emerald-500/10 ring-1 ring-emerald-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fix</span>
            </div>
            <p className="text-xs text-emerald-200 leading-relaxed whitespace-pre-wrap">
              {formatText(data.fix)}
            </p>
          </div>
        )}

        {data.explanation && (
          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(37,99,235,0.06)',
              boxShadow: 'inset 0 0 0 1px rgba(37,99,235,0.18)',
            }}
          >
            <div className="flex items-center gap-1.5 mb-1" style={{ color: '#4F46E5' }}>
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Why it matters
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(37,99,235,0.85)' }}>
              {formatText(data.explanation)}
            </p>
          </div>
        )}

        {data.limitations && data.limitations !== 'None (Full context provided)' && (
          <div className="bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Limitations</span>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-relaxed italic">
              {data.limitations}
            </p>
          </div>
        )}

        {/* Confidence Badge */}
        {data.confidence && (
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span
              className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ring-1 cursor-help ${
                data.confidence === 'HIGH'
                  ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                  : data.confidence === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
                    : 'bg-slate-500/10 text-slate-400 ring-slate-500/20'
              }`}
              title={getConfidenceTooltip(data.confidence)}
            >
              {data.confidence} Confidence
            </span>
          </div>
        )}

        {/* Interactive Action Buttons — brand gradient chips */}
        {data.suggestedActions && data.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {data.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(null, action)}
                disabled={isTyping}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-full premium-transition disabled:opacity-50 text-white"
                style={{
                  background: BRAND_GRAD,
                  opacity: isTyping ? 0.5 : 1,
                  boxShadow: '0 0 10px rgba(37,99,235,0.2)',
                }}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return createPortal(
    <>
      {/* Floating Action Button — Elegant breathable trigger */}
      <div className="fixed bottom-8 right-8 z-50 animate-slow-breathe">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-14 h-14 text-white rounded-full flex items-center justify-center ring-4 ring-[#080b14] copilot-btn"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      </div>

      {/* Floating Chat Panel */}
      <div
        className={`fixed bottom-28 right-8 flex flex-col rounded-[24px] premium-transition origin-bottom-right z-50 overflow-hidden ${
          isOpen
            ? 'scale-100 opacity-100 pointer-events-auto'
            : 'scale-95 opacity-0 pointer-events-none'
        }`}
        style={{
          width: '380px',
          height: '620px',
          maxHeight: '80vh',
          background: 'linear-gradient(180deg, rgba(15,23,42,.88), rgba(2,6,23,.96))',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid rgba(148,163,184,.08)',
          boxShadow: isOpen
            ? '0 20px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03), 0 0 40px rgba(37,99,235,0.15)'
            : '0 20px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.03)',
        }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-white/[0.04] flex items-center justify-between shrink-0"
          style={{ background: 'rgba(15,23,42,0.4)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: BRAND_GRAD, boxShadow: '0 0 12px rgba(37,99,235,0.3)' }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Copilot</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                <span className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase font-semibold">
                  AI Active
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-400 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'rgba(37,99,235,0.12)',
                        boxShadow: 'inset 0 0 0 1px rgba(37,99,235,0.25)',
                      }
                    : { background: BRAND_GRAD, boxShadow: '0 0 12px rgba(37,99,235,0.25)' }
                }
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4" style={{ color: '#4F46E5' }} />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] rounded-[18px] px-4 py-3.5 text-[13px] leading-[1.75] relative overflow-hidden ${
                  msg.role === 'user'
                    ? 'rounded-tr-md text-white/95'
                    : 'bg-white/[0.02] border border-white/[0.04] text-secondary max-w-[65ch] rounded-tl-md w-full'
                }`}
                style={
                  msg.role === 'user'
                    ? {
                        background:
                          'linear-gradient(180deg, rgba(37,99,235,0.18), rgba(37,99,235,0.08))',
                        border: '1px solid rgba(37,99,235,0.25)',
                        boxShadow:
                          'inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.1)',
                      }
                    : {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }
                }
              >
                {msg.role === 'ai' && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full animate-[shimmer_4s_infinite]" />
                )}
                <div className="relative z-10">
                  {msg.isStructured ? renderStructuredMessage(msg.data) : formatText(msg.text)}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 animate-subtle-pulse">
              <div
                className="w-8 h-8 rounded-full text-white flex items-center justify-center shrink-0 mt-1 shadow-[0_0_15px_rgba(37,99,235,0.2)]"
                style={{ background: BRAND_GRAD }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[18px] rounded-tl-md px-4 py-3 flex items-center gap-3 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent animate-sweep pointer-events-none" />
                <div className="flex items-center gap-1">
                  <span
                    className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-1 h-1 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest relative z-10">
                  Synthesizing telemetry...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div
          className="p-4 border-t border-white/[0.04] shrink-0"
          style={{ background: 'rgba(2,6,23,0.4)' }}
        >
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder="Ask Copilot..."
              className="w-full bg-white/5 ring-1 ring-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-500 outline-none premium-transition disabled:opacity-50"
              style={{ '--tw-ring-color': 'rgba(37,99,235,0.3)' }}
              onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.3)')}
              onBlur={(e) => (e.target.style.boxShadow = '')}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 text-white rounded-lg premium-transition disabled:opacity-50 active:scale-90"
              style={{
                background: BRAND_GRAD,
                boxShadow: input.trim() && !isTyping ? '0 0 10px rgba(37,99,235,0.3)' : 'none',
              }}
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
