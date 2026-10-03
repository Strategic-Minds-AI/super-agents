import { base44 } from "@/api/base44Client";

const LOCAL_HOSTS = new Set(["127.0.0.1","localhost"]);
const isLocalRuntime = () => typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname);
const hostedConversations = new Map();
const hostedSubscribers = new Map();

async function localJson(path, init = {}) {
  const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Runtime request failed: ${res.status}`);
  return data;
}

const emitHosted = (id) => {
  const conv=hostedConversations.get(id);
  for(const cb of hostedSubscribers.get(id) || []) cb(conv);
};

export const runtime = {
  mode: () => isLocalRuntime() ? "local-agent-factory" : "vercel-ai-gateway",

  status: async () => {
    if (isLocalRuntime()) return localJson("/api/super-agent", { method:"POST", body:JSON.stringify({action:"status",payload:{}}) });
    const result = await base44.functions.invoke("superAgentGateway", { action: "status" });
    return result?.data ?? result;
  },

  createConversation: async ({ agent_name, metadata = {} }) => {
    if (isLocalRuntime()) return localJson("/api/conversations/create", { method:"POST", body:JSON.stringify({ agent_name, metadata }) });
    const id=crypto.randomUUID();
    const conv={id,agent_name,metadata,messages:[],created_at:new Date().toISOString()};
    hostedConversations.set(id,conv);
    return conv;
  },

  sendMessage: async (conversationId, message) => {
    if (isLocalRuntime()) return localJson("/api/conversations/message", { method:"POST", body:JSON.stringify({ conversation_id:conversationId, message }) });
    const conv=hostedConversations.get(conversationId);
    if(!conv) throw new Error("Conversation not found");
    conv.messages.push({...message,at:new Date().toISOString()}); emitHosted(conversationId);
    const result=await base44.functions.invoke("superAgentGateway", {
      action:"chat",
      payload:{agent_name:conv.agent_name,messages:conv.messages}
    });
    const data=result?.data ?? result;
    conv.messages.push({role:"assistant",content:data?.message || "No response returned.",at:new Date().toISOString(),provider:data?.provider,model:data?.model});
    emitHosted(conversationId);
    return conv;
  },

  getConversation: async (conversationId) => {
    if (isLocalRuntime()) return localJson(`/api/conversations/${conversationId}`);
    return hostedConversations.get(conversationId) || null;
  },

  subscribeToConversation: (conversationId, onData) => {
    if (!isLocalRuntime()) {
      const set=hostedSubscribers.get(conversationId) || new Set(); set.add(onData); hostedSubscribers.set(conversationId,set);
      const conv=hostedConversations.get(conversationId); if(conv) queueMicrotask(()=>onData(conv));
      return ()=>{set.delete(onData)};
    }
    let stopped=false,last="";
    const poll=async()=>{while(!stopped){try{const data=await localJson(`/api/conversations/${conversationId}`);const sig=JSON.stringify(data?.messages||[]);if(sig!==last){last=sig;onData(data)}}catch{}await new Promise(r=>setTimeout(r,1200));}};
    poll(); return ()=>{stopped=true};
  },

  invoke: async (action, payload = {}) => {
    if (isLocalRuntime()) return localJson("/api/super-agent", { method:"POST", body:JSON.stringify({ action, payload }) });
    const result = await base44.functions.invoke("superAgentGateway", { action, payload });
    return result?.data ?? result;
  },
};
