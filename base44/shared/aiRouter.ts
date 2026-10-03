// INTELLIGENT AI ROUTER — picks the best model for each task type.
// Routes through Vercel AI Gateway (your own key, no Base44 credits) with
// automatic fallback to Base44 InvokeLLM if the key is missing or the call fails.
//
// Design: every task has an optimal model. Planning needs deep reasoning;
// template generation needs fast structured JSON; content needs a great
// writer. This router matches the task to the model, so you get the best
// output at the lowest cost every time.

export type TaskType =
  | 'planning'            // complex goal decomposition, mission briefs (MetaArchitect)
  | 'code_generation'     // writing production code (Code Architect)
  | 'content_writing'     // copy, brand voice, landing pages (Brand Guardian)
  | 'sales_outreach'      // email sequences, cold scripts (Sales Engine)
  | 'social_content'      // platform-native social posts (Social Strategist)
  | 'template_generation' // structured website template specs (Template Generator)
  | 'seo_audit'           // technical SEO analysis (Growth Operator)
  | 'web_search'          // competitor research, market context
  | 'quick_json'          // simple structured output, classification
  | 'complex_reasoning'   // hard multi-step problems
  | 'summarization';      // condensing reports, logs

interface ModelConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  label: string;
  reason: string;
}

// ── ROUTING TABLE — the best model for each task ──
const ROUTING_TABLE: Record<TaskType, ModelConfig> = {
  planning: {
    model: 'anthropic/claude-sonnet-4',
    maxTokens: 4096,
    temperature: 0.7,
    label: 'Claude Sonnet 4',
    reason: 'Best at multi-step decomposition and structured mission briefs',
  },
  code_generation: {
    model: 'openai/gpt-4o',
    maxTokens: 8192,
    temperature: 0.2,
    label: 'GPT-4o',
    reason: 'Strongest code generation and refactoring accuracy',
  },
  content_writing: {
    model: 'anthropic/claude-sonnet-4',
    maxTokens: 4096,
    temperature: 0.8,
    label: 'Claude Sonnet 4',
    reason: 'Superior prose quality, brand voice consistency, persuasive copy',
  },
  sales_outreach: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.7,
    label: 'GPT-4o mini',
    reason: 'Fast, cost-effective for high-volume personalized sequences',
  },
  social_content: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.85,
    label: 'GPT-4o mini',
    reason: 'Creative, platform-native output at low cost for high cadence',
  },
  template_generation: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.5,
    label: 'GPT-4o mini',
    reason: 'Reliable structured JSON output, fast and cheap for batch generation',
  },
  seo_audit: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.3,
    label: 'GPT-4o mini',
    reason: 'Analytical precision at low cost for repeated audit cycles',
  },
  web_search: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.3,
    label: 'GPT-4o mini',
    reason: 'Web-grounded summarization, cost-effective for research volume',
  },
  quick_json: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 1024,
    temperature: 0.2,
    label: 'GPT-4o mini',
    reason: 'Cheapest option for simple structured output',
  },
  complex_reasoning: {
    model: 'anthropic/claude-sonnet-4',
    maxTokens: 8192,
    temperature: 0.5,
    label: 'Claude Sonnet 4',
    reason: 'Deepest reasoning for hard multi-step problems',
  },
  summarization: {
    model: 'openai/gpt-4o-mini',
    maxTokens: 1024,
    temperature: 0.3,
    label: 'GPT-4o mini',
    reason: 'Fast condensation at minimal cost',
  },
};

export function getModelForTask(taskType: TaskType): ModelConfig {
  return ROUTING_TABLE[taskType] || ROUTING_TABLE.quick_json;
}

export function listRoutes() {
  return Object.entries(ROUTING_TABLE).map(([type, cfg]) => ({
    taskType: type,
    model: cfg.model,
    label: cfg.label,
    reason: cfg.reason,
    maxTokens: cfg.maxTokens,
    temperature: cfg.temperature,
  }));
}

// ── VERCEL AI GATEWAY CALL ──
// Uses the routed model. Returns the raw text content.
export async function callVercelGateway(opts: {
  apiKey: string;
  taskType: TaskType;
  systemPrompt: string;
  userPrompt: string;
  jsonMode?: boolean;
  timeoutMs?: number;
}): Promise<{ content: string; model: string; provider: string }> {
  const cfg = getModelForTask(opts.taskType);
  const body: any = {
    model: cfg.model,
    messages: [
      { role: 'system', content: opts.systemPrompt },
      { role: 'user', content: opts.userPrompt },
    ],
    max_tokens: cfg.maxTokens,
    temperature: cfg.temperature,
  };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs || 30000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Vercel AI Gateway error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  return { content, model: cfg.model, provider: 'vercel_ai_gateway' };
}

// ── INTELLIGENT CALL — operates off the AI Gateway API key ──
// This is the main entry point for all AI calls in the system.
// When a gateway key is present (AI_GATEWAY_API_KEY / VERCEL_AI_GATEWAY_KEY),
// the system runs EXCLUSIVELY on the gateway — no Base44 credit fallback.
// If the gateway call fails, the error propagates so the caller (agent loop,
// resilience layer) can handle it. Base44 InvokeLLM is only used as a dev
// fallback when NO gateway key is configured at all.
// Uses AI_GATEWAY_API_KEY (the standard Vercel env var) with fallback to
// VERCEL_AI_GATEWAY_KEY for backward compatibility.
export async function callAI(base44, opts: {
  vercelKey?: string | null;
  taskType: TaskType;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: object | null;
  useWebSearch?: boolean;
  timeoutMs?: number;
}): Promise<{ result: any; provider: string; model: string; routedTask: string }> {
  const cfg = getModelForTask(opts.taskType);

  // ── Primary path: Vercel AI Gateway (your key, no Base44 credits) ──
  if (opts.vercelKey) {
    const { content, model, provider } = await callVercelGateway({
      apiKey: opts.vercelKey,
      taskType: opts.taskType,
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt + (opts.jsonSchema ? '\n\nReturn ONLY valid JSON matching this schema. No markdown, no explanation.' : ''),
      jsonMode: !!opts.jsonSchema,
      timeoutMs: opts.timeoutMs,
    });

    let parsed: any = content;
    if (opts.jsonSchema) {
      try { parsed = JSON.parse(content); } catch { parsed = content; }
    }
    return { result: parsed, provider, model, routedTask: opts.taskType };
  }

  // ── Dev fallback: Base44 InvokeLLM (only when no gateway key is set) ──
  const llmOpts: any = {
    prompt: `${opts.systemPrompt}\n\n${opts.userPrompt}`,
  };
  if (opts.jsonSchema) llmOpts.response_json_schema = opts.jsonSchema;
  if (opts.useWebSearch) {
    llmOpts.add_context_from_internet = true;
    llmOpts.model = 'gemini_3_flash';
  }

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM(llmOpts);
  let parsed: any = result;
  if (opts.jsonSchema && typeof result === 'string') {
    try { parsed = JSON.parse(result); } catch { parsed = result; }
  }
  return { result: parsed, provider: 'base44_invoke_llm', model: 'automatic', routedTask: opts.taskType };
}