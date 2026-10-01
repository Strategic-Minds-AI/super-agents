import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import MessageBubble from "./MessageBubble";

export default function AgentChat({ agentName, agentLabel, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const initConversation = async () => {
    setLoading(true);
    setError(null);
    try {
      const conv = await base44.agents.createConversation({ agent_name: agentName, metadata: { name: agentLabel } });
      setConversation(conv);
      setMessages(conv.messages || []);
      setLoading(false);
      const unsub = base44.agents.subscribeToConversation(conv.id, (data) => {
        setMessages(data.messages || []);
      });
      return unsub;
    } catch (e) {
      setError(e.message || "Failed to connect to this agent. Integration credits may be exhausted — the agent system needs active credits to run.");
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    let unsub = () => {};
    initConversation().then((fn) => { unsub = fn; });
    return () => unsub();
  }, [agentName]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } catch (e) {
      setError(e.message || "Failed to send message. The agent system may be out of integration credits.");
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[#E5E7EB] bg-white">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-[#FAFAFA]"><ArrowLeft className="w-5 h-5" /></button>
        <div className="font-heading font-bold text-black">{agentLabel}</div>
        <span className="xa-pill-badge">LIVE</span>
      </div>
      <div ref={scrollRef} className="xa-scroll flex-1 overflow-y-auto px-4 py-6 space-y-5 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-[#CCBB00]" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-sm font-semibold text-black/70 mb-1">Agent unavailable</p>
            <p className="text-xs text-black/50 mb-4 max-w-xs">{error}</p>
            <button onClick={() => initConversation()} className="xa-btn-outline text-sm">
              <RefreshCw className="w-4 h-4" /> Retry connection
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-black/40 mt-20">Send a message to activate this super-agent.</div>
        ) : messages.map((m, i) => <MessageBubble key={i} message={m} />)}
        {sending && <div className="flex items-center gap-2 text-black/40 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Thinking…</div>}
      </div>
      <div className="border-t border-[#E5E7EB] bg-white p-4">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Message ${agentLabel}…`}
            rows={1}
            className="xa-input flex-1 resize-none max-h-32 py-3"
          />
          <button onClick={send} disabled={!input.trim() || sending} className="xa-btn-primary h-[42px]"><Send className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}