import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, Activity } from "lucide-react";
import { apiRequest } from "../api";

export default function AICopilot({ pipelineData, analysisResult, accessToken }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "ai",
      isStructured: false,
      text: "Hi! I'm your DevPulse AI Copilot. Ask me about your pipeline score, vulnerabilities, or repository health!"
    }
  ]);
  const [input, setInput] = useState("");
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

    const userMessage = { id: Date.now().toString(), role: "user", text: textToSend.trim(), isStructured: false };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideText) setInput("");
    setIsTyping(true);

    try {
      const response = await apiRequest("/api/ai/chat", {
        method: "POST",
        accessToken,
        body: JSON.stringify({
          query: userMessage.text,
          context: { pipelineData, analysisResult },
          history: messages
        })
      });

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", isStructured: true, data: response }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", isStructured: false, text: "Oops, I encountered an error connecting to the Copilot service. Please try again." }
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  // Format bold text dynamically (naïve markdown parser)
  const formatText = (text) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*|\`.*?\`)/).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={i} className="text-blue-300 bg-blue-500/10 px-1 py-0.5 rounded font-mono text-xs">{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  function getConfidenceTooltip(confidence) {
    if (confidence === "HIGH") return "High confidence (full pipeline data)";
    if (confidence === "MEDIUM") return "Moderate confidence (partial data)";
    return "Limited confidence (quick analysis)";
  }

  function renderStructuredMessage(data) {
    if (!data) return null;
    return (
      <div className="space-y-4 w-full">
        {/* We no longer use 'summary' as a main text block, if it's there randomly, we can render it, but we rely on issue/fix/explanation */}
        {data.summary && (
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {formatText(data.summary)}
          </p>
        )}

        {/* Risk Level Badge */}
        {data.risk && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Risk Level:</span>
            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ring-1 ${
              data.risk === "HIGH" ? "bg-red-500/10 text-red-400 ring-red-500/20" :
              data.risk === "MEDIUM" ? "bg-amber-500/10 text-amber-400 ring-amber-500/20" :
              "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
            }`}>
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

        {data.fix && data.fix !== "No action required." && (
          <div className="bg-emerald-500/10 ring-1 ring-emerald-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Fix</span>
            </div>
            <p className="text-xs text-emerald-200 leading-relaxed whitespace-pre-wrap">{formatText(data.fix)}</p>
          </div>
        )}

        {data.explanation && (
          <div className="bg-blue-500/10 ring-1 ring-blue-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1 text-blue-400">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Why it matters</span>
            </div>
            <p className="text-xs text-blue-200 leading-relaxed">{formatText(data.explanation)}</p>
          </div>
        )}

        {data.limitations && data.limitations !== "None (Full context provided)" && (
          <div className="bg-amber-500/10 ring-1 ring-amber-500/20 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Limitations</span>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-relaxed italic">{data.limitations}</p>
          </div>
        )}

        {/* Confidence Badge */}
        {data.confidence && (
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <span 
              className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ring-1 cursor-help ${
                data.confidence === "HIGH" ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" :
                data.confidence === "MEDIUM" ? "bg-amber-500/10 text-amber-400 ring-amber-500/20" :
                "bg-slate-500/10 text-slate-400 ring-slate-500/20"
              }`}
              title={getConfidenceTooltip(data.confidence)}
            >
              {data.confidence} Confidence
            </span>
          </div>
        )}

        {/* Interactive Action Buttons */}
        {data.suggestedActions && data.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {data.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(null, action)}
                disabled={isTyping}
                className="text-[10px] font-medium px-3 py-1.5 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30 transition-colors disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 z-50 ring-4 ring-[#080b14]"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Floating Chat Panel */}
      <div className={`fixed bottom-28 right-8 w-[400px] h-[600px] max-h-[80vh] bg-[#0c101d] ring-1 ring-white/10 rounded-2xl flex flex-col shadow-2xl transition-all origin-bottom-right z-50 ${
        isOpen ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"
      }`}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 ring-1 ring-blue-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI Copilot</h3>
              <p className="text-[10px] text-slate-500 font-medium">Production Architecture Enabled</p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                msg.role === "user" ? "bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-500/10 ring-1 ring-indigo-500/20 text-indigo-100 rounded-tr-sm"
                  : "bg-white/5 ring-1 ring-white/10 text-slate-300 rounded-tl-sm w-full"
              }`}>
                {msg.isStructured ? renderStructuredMessage(msg.data) : formatText(msg.text)}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white/5 ring-1 ring-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 h-10">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-white/[0.06] bg-black/20 shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isTyping}
              placeholder="Ask Copilot..."
              className="w-full bg-white/5 ring-1 ring-white/10 focus:ring-blue-500/40 rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
