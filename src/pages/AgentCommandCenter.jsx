import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Mic, ArrowUp, ChevronDown, Calendar, Code,
  Sparkles, Zap, FileText, TrendingUp
} from "lucide-react";

const SUGGESTIONS = [
  { icon: Calendar, label: "What's on the schedule today?", sub: "Review upcoming missions", to: "/mission-control" },
  { icon: Code, label: "Review my latest system builds", sub: "Check active builds", to: "/factory" },
  { icon: Sparkles, label: "Launch a growth mission", sub: "Audit and grow a domain", to: "/mission" },
  { icon: Zap, label: "Run the autonomous agent loop", sub: "Execute pending tasks", to: "/mission-control" },
];

export default function AgentCommandCenter() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("Chat");

  const send = () => {
    if (!input.trim()) return;
    navigate("/agents/orchestrator");
  };

  return (
    <div className="flex flex-col items-center min-h-full bg-[#171717] text-[#ececec] px-4 relative">
      {/* ═══ Chat / Work toggle — floating top center ═══ */}
      <div className="flex justify-center mt-6 mb-10">
        <div className="xa-toggle-track">
          {["Chat", "Work"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`xa-toggle-btn ${mode === m ? "active" : ""}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Heading ═══ */}
      <h1 className="font-heading font-semibold text-2xl md:text-[28px] text-white text-center mb-8 tracking-tight">
        What's on your mind today?
      </h1>

      {/* ═══ Input pill ═══ */}
      <div className="w-full max-w-[680px] xa-chat-input">
        <button
          className="shrink-0 w-8 h-8 rounded-full border border-[#2a2a2a] flex items-center justify-center text-[#7f7f7f] hover:text-[#ececec] hover:border-[#3a3a3a] transition-all"
          title="Add attachment"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything"
          className="flex-1 bg-transparent text-[#ececec] text-[15px] outline-none placeholder:text-[#5f5f5f] min-w-0"
        />
        <button
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[13px] font-medium text-[#7f7f7f] hover:text-[#ececec] transition-colors"
          title="Model selector"
        >
          Medium <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
        <button
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[#7f7f7f] hover:text-[#ececec] transition-colors"
          title="Voice input"
        >
          <Mic className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </button>
        <button
          onClick={send}
          className="xa-send-btn shrink-0"
          title="Send"
          disabled={!input.trim()}
          style={!input.trim() ? { opacity: 0.4, cursor: "default" } : {}}
        >
          <ArrowUp className="w-[18px] h-[18px]" strokeWidth={2.5} />
        </button>
      </div>

      {/* ═══ Suggestion cards ═══ */}
      <div className="w-full max-w-[680px] mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTIONS.map(({ icon: Icon, label, sub, to }, i) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="xa-suggest-card flex items-center gap-3.5 text-left xa-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-[#212121] border border-[#2a2a2a]">
              <Icon className="w-[18px] h-[18px] text-[#B8C5D6]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[#ececec] truncate">{label}</div>
              <div className="text-xs text-[#7f7f7f] truncate mt-0.5">{sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ═══ Footer ═══ */}
      <p className="mt-auto pt-10 pb-5 text-center text-xs text-[#5f5f5f]">
        Xtreme Super Agents can make mistakes. Workspace data isn't used to train models.
      </p>
    </div>
  );
}