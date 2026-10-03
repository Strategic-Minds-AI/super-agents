import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";
import { secrets } from "base44:runtime";
import { callAI } from "../../shared/aiRouter.ts";

const HANDLERS = {
  run_loop: "runAgentLoop",
  heartbeat: "runAutonomousHeartbeat",
  generate_template: "runTemplateGenerator",
  architect: "runMetaArchitect",
  batch: "runBatchOperation",
  growth: "runGrowthMission",
  create_repo: "runRepoGenerator",
  domain_discovery: "runDomainDiscovery",
  domain_check: "runDomainBuyer",
  provisioning: "runProvisioning",
};

const ROLE = {
  orchestrator: { taskType:"complex_reasoning", prompt:"You are Apex, the governed Strategic Minds master orchestrator. Decompose goals, route specialist work, preserve evidence, and never claim unverified completion. Protected production, secrets, DNS, spend, public publishing and destructive actions require approval." },
  growth_operator: { taskType:"seo_audit", prompt:"You are the Strategic Minds Growth Operator. Focus on evidence-backed SEO, analytics, content and growth work. Persist safe next actions and keep protected external actions approval-gated." },
  code_architect: { taskType:"code_generation", prompt:"You are the Strategic Minds Code Architect. Produce production-grade implementation guidance, minimal safe changes, tests and validation. Never self-certify." },
  social_strategist: { taskType:"social_content", prompt:"You are the Strategic Minds Social Strategist. Produce drafts and plans only unless live publishing is explicitly approved." },
  sales_engine: { taskType:"sales_outreach", prompt:"You are the Strategic Minds Sales Engine. Produce sales strategy and drafts; customer outreach remains approval-gated." },
  brand_guardian: { taskType:"content_writing", prompt:"You are the Strategic Minds Brand Guardian. Preserve approved brand systems and produce polished brand/content direction without unapproved public publishing." },
  replicator: { taskType:"planning", prompt:"You are the Strategic Minds Replicator. Turn validated systems into deterministic reusable configurations and rollout plans while preserving rollback and approval gates." },
  swarm: { taskType:"complex_reasoning", prompt:"You are the Strategic Minds Swarm coordinator. Break safe work into parallel specialist packets, aggregate evidence, and send validation to an independent validator." },
  validator: { taskType:"complex_reasoning", prompt:"You are the independent Strategic Minds Validator. Re-fetch evidence, return PASS/FAIL/BLOCKED, and never accept implementer self-certification." },
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const payload = body.payload || {};
    const vercelKey = secrets.get("AI_GATEWAY_API_KEY") || secrets.get("VERCEL_AI_GATEWAY_KEY");

    if (action === "status") {
      const [tasks, workers, builds] = await Promise.all([
        base44.entities.AgentTask.list("-updated_date", 50),
        base44.entities.WorkerFleet.list("-last_seen", 50),
        base44.entities.SystemBuild.list("-updated_date", 25),
      ]);
      return Response.json({
        ok: true,
        surface: "XTREME_SUPER_AGENT_MCP_V1",
        runtime: "base44",
        ai_gateway: { configured: !!vercelKey, preferred: "vercel_ai_gateway" },
        agents: Object.keys(ROLE),
        counts: { tasks: tasks?.length || 0, workers: workers?.length || 0, builds: builds?.length || 0 }
      });
    }

    if (action === "chat") {
      const agent = String(payload.agent_name || "orchestrator");
      const role = ROLE[agent] || ROLE.orchestrator;
      const history = Array.isArray(payload.messages) ? payload.messages.slice(-12) : [];
      const userPrompt = history.map(m => `${String(m.role || "user").toUpperCase()}: ${String(m.content || "")}`).join("\n\n") || String(payload.message || "");
      const { result, provider, model } = await callAI(base44, {
        vercelKey,
        taskType: role.taskType,
        systemPrompt: role.prompt,
        userPrompt,
        timeoutMs: 45000,
      });
      return Response.json({ ok:true, action, agent_name:agent, message:String(result || ""), provider, model });
    }

    const handler = HANDLERS[action];
    if (!handler) return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    const result = await base44.functions.invoke(handler, payload);
    return Response.json({ ok: true, action, result: result?.data ?? result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
