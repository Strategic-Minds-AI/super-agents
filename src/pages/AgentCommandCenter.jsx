import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Mic, ArrowUp, ChevronDown, Calendar, Code, Sparkles, Zap } from "lucide-react";

const SUGGESTIONS = [
  { icon: Calendar, label: "What's on the schedule today?", to: "/mission-control" },
  { icon: Code, label: "Review my latest system builds", to: "/factory" },
  { icon: Sparkles, label: "Launch a growth mission", to: "/mission" },
  { icon: Zap, label: "Run the autonomous agent loop", to: "/mission-control" },
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
    <div className="flex flex-col items-center min-h-full bg-[#0D0D0D] text-white px-4">
      {/* Chat / Work toggle */}
      <div className="flex items-center gap-1 mt-6 mb-8 p-1 rounded-full border border-[#2F2F2F] bg-[#171717]">
        {["Chat", "Work"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition-all ${
              mode === m
                ? "text-white border border-[#C0C8D0]/30"
                : "text-[#8A8F98] hover:text-white border border-transparent"
            }`}
            style={mode === m ? { background: "linear-gradient(135deg, rgba(232,237,242,0.1), rgba(123,150,184,0.2), rgba(74,111,165,0.15))" } : {}}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Heading */}
      <h1 className="font-heading font-bold text-3xl md:text-4xl text-white text-center mb-8">
        What's on your mind today?
      </h1>

      {/* Input pill */}
      <div className="w-full max-w-2xl xa-chat-input">
        <button className="shrink-0 w-8 h-8 rounded-full border border-[#2F2F2F] flex items-center justify-center text-[#8A8F98] hover:text-white hover:border-[#3A3F4A] transition-all">
          <Plus className="w-4 h-4" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-[#5A5F68] min-w-0"
        />
        <button className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-[#8A8F98] hover:text-white transition-colors">
          Medium <ChevronDown className="w-3 h-3" />
        </button>
        <button className="shrink-0 w-8 h-8 rounded-full text-[#8A8F98] hover:text-white transition-colors flex items-center justify-center">
          <Mic className="w-4 h-4" />
        </button>
        <button
          onClick={send}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white hover:brightness-110 transition-all"
          style={{ background: "linear-gradient(135deg, #7B96B8, #4A6FA5)" }}
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion cards */}
      <div className="w-full max-w-2xl mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTIONS.map(({ icon: Icon, label, to }) => (
          <button
            key={label}
            onClick={() => navigate(to)}
            className="xa-suggest-card flex items-center gap-3 text-left"
          >
            <Icon className="w-5 h-5 shrink-0 text-[#B8C5D6]" />
            <span className="text-sm font-medium text-white">{label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-auto pt-8 pb-4 text-center text-xs text-[#5A5F68]">
        Xtreme Super Agents can make mistakes. Workspace data isn't used to train models.
      </p>
    </div>
  );
}