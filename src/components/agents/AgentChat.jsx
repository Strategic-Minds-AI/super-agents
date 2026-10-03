import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, Plus, Mic, ArrowUp } from "lucide-react";
import { runtime } from "@/lib/runtimeClient";
import MessageBubble from "./MessageBubble";

export default function AgentChat({ agentName, agentLabel, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runtimeMode, setRuntimeMode] = useState(runtime.mode());
  const scrollRef = useRef(null);

  const initConversation = async () => {
    setLoading(true); setError(null);
    try {
      const conv = await runtime.createConversation({ agent_name: agentName, metadata: { name: agentLabel } });
      setConversation(conv); setMessages(conv.messages || []); setRuntimeMode(runtime.mode()); setLoading(false);
      const unsub = runtime.subscribeToConversation(conv.id, (data) => setMessages(data.messages || []));
      return unsub;
    } catch (e) {
      setError(e.message || "Failed to connect to this agent.");
      setLoading(false);
      return () => {};
    }
  };

  useEffect(() => {
    let unsub = () => {};
    initConversation().then(fn => { unsub = fn; });
    return () => unsub();
  }, [agentName]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || !conversation || sending) return;
    setInput(""); setSending(true); setError(null);
    try {
      const updated = await runtime.sendMessage(conversation.id, { role: "user", content: text });
      if (updated?.messages) setMessages(updated.messages);
    } catch (e) {
      setError(e.message || "Failed to send message.");
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full bg-[#111]">
      <div className="h-14 flex items-center gap-3 px-4 border-b border-[#242424]">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-[#222]"><ArrowLeft size={19}/></button>
        <div className="font-semibold">{agentLabel}</div>
        <span className="text-[11px] px-2 py-1 rounded-full border border-[#343434] text-[#aaa]">
          {runtimeMode === "local-agent-factory" ? "LOCAL RUNTIME" : "BASE44"}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {loading ? <div className="h-56 flex items-center justify-center"><Loader2 className="animate-spin" /></div>
          : error ? <div className="h-56 flex flex-col items-center justify-center text-center">
              <AlertCircle className="mb-3 text-red-400"/><p className="text-sm text-[#bbb]">{error}</p>
              <button onClick={initConversation} className="mt-4 gpt-action"><RefreshCw size={15}/>Retry</button>
            </div>
          : messages.length === 0 ? <div className="text-center mt-24 text-[#8d8d8d]">Send a message to activate {agentLabel}.</div>
          : messages.map((m,i)=><MessageBubble key={i} message={m}/>)}
          {sending && <div className="flex items-center gap-2 text-sm text-[#888]"><Loader2 size={15} className="animate-spin"/>Thinking…</div>}
        </div>
      </div>

      <div className="p-4">
        <div className="gpt-composer max-w-3xl mx-auto">
          <button className="gpt-circle"><Plus size={20}/></button>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            rows={1} placeholder={`Message ${agentLabel}`}
            className="flex-1 resize-none bg-transparent outline-none text-[16px] max-h-32 py-2" />
          <button className="gpt-circle border-0"><Mic size={19}/></button>
          <button onClick={send} disabled={!input.trim()||sending} className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30">
            <ArrowUp size={18}/>
          </button>
        </div>
      </div>
    </div>
  );
}
