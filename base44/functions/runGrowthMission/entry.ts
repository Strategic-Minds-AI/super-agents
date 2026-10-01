import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Autonomous code agent: runs a real tool-loop against the AI gateway.
// No human in the chat. It reads/writes Domain + AgentTask records and runs web research,
// looping until the mission is complete or the step cap is hit.

const MAX_STEPS = 8;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const targetDomain = (body?.domain || 'benearme.com').trim();

    const { baseURL, token, headers } = base44.asServiceRole.aiGateway.connection();
    const chatURL = `${baseURL}/chat/completions`;

    // ---- Real tools the agent can call ----
    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_domain',
          description: 'Look up a domain record in the registry by root domain. Returns the record or null.',
          parameters: { type: 'object', properties: { domain: { type: 'string' } }, required: ['domain'] }
        }
      },
      {
        type: 'function',
        function: {
          name: 'update_domain',
          description: 'Update a domain record with onboarding state. Call after each pipeline stage.',
          parameters: {
            type: 'object',
            properties: {
              domain: { type: 'string' },
              status: { type: 'string', enum: ['onboarding', 'verifying', 'verified', 'active', 'issues', 'paused'] },
              gsc_property: { type: 'string' },
              sitemap_url: { type: 'string' },
              health_score: { type: 'number' },
              next_action: { type: 'string' },
              competitors: { type: 'string' }
            },
            required: ['domain']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create an action-queue task dispatched to a specialist agent.',
          parameters: {
            type: 'object',
            properties: {
              agent_name: { type: 'string' },
              title: { type: 'string' },
              task_type: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
              description: { type: 'string' },
              autonomous: { type: 'boolean' }
            },
            required: ['agent_name', 'title', 'task_type', 'priority', 'description', 'autonomous']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'web_research',
          description: 'Run a live web search (competitor SERP, sitemap discovery, site analysis) and return findings.',
          parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
        }
      }
    ];

    const toolHandlers = {
      get_domain: async ({ domain }) => {
        const res = await base44.asServiceRole.entities.Domain.filter({ domain }, { limit: 1 });
        return res.items?.[0] || null;
      },
      update_domain: async (args) => {
        const existing = await base44.asServiceRole.entities.Domain.filter({ domain: args.domain }, { limit: 1 });
        const rec = existing.items?.[0];
        if (!rec) return { error: 'domain not found' };
        const update = {};
        for (const k of ['status', 'gsc_property', 'sitemap_url', 'health_score', 'next_action', 'competitors']) {
          if (args[k] !== undefined) update[k] = args[k];
        }
        return await base44.asServiceRole.entities.Domain.update(rec.id, update);
      },
      create_task: async (args) => {
        return await base44.asServiceRole.entities.AgentTask.create({
          agent_name: args.agent_name,
          title: args.title,
          task_type: args.task_type,
          priority: args.priority,
          description: args.description,
          autonomous: args.autonomous,
          status: 'pending'
        });
      },
      web_research: async ({ query }) => {
        const r = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Research the following for autonomous domain operations and return concise, structured findings (no fluff): ${query}`,
          add_context_from_internet: true,
          model: 'gemini_3_8_flash'
        });
        return r;
      }
    };

    // ---- The agent loop ----
    const systemPrompt = `You are the Growth Operator autonomous code agent for Xtreme AI. You run the Google growth pipeline for a domain with NO human in the loop.
Execute these stages in order, calling a tool for each:
1. get_domain — load the record for "${targetDomain}".
2. web_research — find the sitemap URL and robots.txt for the domain.
3. update_domain — set sitemap_url and status 'verifying'.
4. web_research — run a SERP/competitor scan for the domain's main keyword.
5. update_domain — set competitors and next_action, status 'active', health_score based on findings.
6. create_task — dispatch 'submit_sitemap' to growth_operator (autonomous).
7. create_task — dispatch 'configure_ga4' to growth_operator (autonomous=false, needs approval).
After all stages, STOP and do not call more tools. Be efficient: one tool per step.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Run the full growth mission for ${targetDomain} now.` }
    ];

    const trace = [];
    let step = 0;
    let finalText = '';

    while (step < MAX_STEPS) {
      step++;
      const resp = await fetch(chatURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...headers },
        body: JSON.stringify({ model: 'automatic', messages, tools, tool_choice: 'auto' })
      });
      const data = await resp.json();
      if (!resp.ok) {
        return Response.json({ error: 'gateway error', detail: data, step }, { status: 502 });
      }
      const msg = data.choices?.[0]?.message;
      messages.push(msg);

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        for (const tc of msg.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          const fn = tc.function.name;
          let result;
          try {
            result = await toolHandlers[fn](args);
          } catch (e) {
            result = { error: e.message };
          }
          trace.push({ step, tool: fn, args, ok: !result?.error });
          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result).slice(0, 2000)
          });
        }
        continue; // keep looping while the agent calls tools
      }

      // No tool calls → agent is done
      finalText = msg.content || '';
      break;
    }

    return Response.json({
      domain: targetDomain,
      steps_executed: step,
      completed: step < MAX_STEPS,
      final_summary: finalText,
      tool_trace: trace
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}