import { config } from './config.js';

function extractOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text) {
    return response.output_text;
  }

  const parts = [];
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

export async function runAgentModel(agent, task, { signal } = {}) {
  if (!config.openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const input = {
    task_id: task.id,
    task_type: task.task_type,
    title: task.title,
    description: task.description,
    domain: task.domain,
    priority: task.priority,
    payload: task.payload || {},
    execution_mode: 'repo_native_super_agents',
  };

  const res = await fetch(`${config.openaiBaseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiModel,
      instructions: [
        agent.instructions,
        '',
        'Runtime governance:',
        '- Never claim an external action succeeded unless a tool/runtime receipt proves it.',
        '- Treat production deploys, DNS, purchases, live messages, social publishing, credentials, permissions, and destructive actions as approval-gated.',
        '- Return a concise execution result suitable for durable task storage.',
      ].join('\n'),
      input: [{
        role: 'user',
        content: JSON.stringify(input),
      }],
    }),
    signal,
  });

  const raw = await res.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch {}

  if (!res.ok) {
    const message = data?.error?.message || raw.slice(0, 500) || `HTTP ${res.status}`;
    throw new Error(`OpenAI Responses API failed: ${message}`);
  }

  return {
    response_id: data.id || null,
    model: data.model || config.openaiModel,
    text: extractOutputText(data),
    usage: data.usage || null,
  };
}
