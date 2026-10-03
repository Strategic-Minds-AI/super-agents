import { base44 } from "@/api/base44Client";

const LOCAL_HOSTS = new Set(["127.0.0.1","localhost"]);
const isLocalRuntime = () => typeof window !== "undefined" && LOCAL_HOSTS.has(window.location.hostname);

async function localJson(path, init = {}) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Runtime request failed: ${res.status}`);
  return data;
}

export const runtime = {
  mode: () => isLocalRuntime() ? "local-agent-factory" : "base44",

  status: async () => {
    if (isLocalRuntime()) return localJson("/api/runtime/status");
    const result = await base44.functions.invoke("superAgentGateway", { action: "status" });
    return result?.data ?? result;
  },

  createConversation: async ({ agent_name, metadata = {} }) => {
    if (isLocalRuntime()) {
      return localJson("/api/conversations/create", {
        method: "POST",
        body: JSON.stringify({ agent_name, metadata }),
      });
    }
    return base44.agents.createConversation({ agent_name, metadata });
  },

  sendMessage: async (conversationId, message) => {
    if (isLocalRuntime()) {
      return localJson("/api/conversations/message", {
        method: "POST",
        body: JSON.stringify({ conversation_id: conversationId, message }),
      });
    }
    await base44.agents.addMessage(conversationId, message);
    return null;
  },

  getConversation: async (conversationId) => {
    if (isLocalRuntime()) return localJson(`/api/conversations/${conversationId}`);
    if (base44.agents.getConversation) return base44.agents.getConversation(conversationId);
    return null;
  },

  subscribeToConversation: (conversationId, onData) => {
    if (!isLocalRuntime()) return base44.agents.subscribeToConversation(conversationId, onData);

    let stopped = false;
    let last = "";
    const poll = async () => {
      while (!stopped) {
        try {
          const data = await localJson(`/api/conversations/${conversationId}`);
          const sig = JSON.stringify(data?.messages || []);
          if (sig !== last) {
            last = sig;
            onData(data);
          }
        } catch {}
        await new Promise(r => setTimeout(r, 1200));
      }
    };
    poll();
    return () => { stopped = true; };
  },

  invoke: async (action, payload = {}) => {
    if (isLocalRuntime()) {
      return localJson("/api/super-agent", {
        method: "POST",
        body: JSON.stringify({ action, payload }),
      });
    }
    const result = await base44.functions.invoke("superAgentGateway", { action, payload });
    return result?.data ?? result;
  },
};
