import { createClientFromRequest } from "npm:@base44/sdk@0.8.52";

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

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const payload = body.payload || {};

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
        agents: ["orchestrator","growth_operator","code_architect","social_strategist","sales_engine","brand_guardian","replicator","swarm","validator"],
        counts: {
          tasks: tasks?.length || 0,
          workers: workers?.length || 0,
          builds: builds?.length || 0,
        }
      });
    }

    const handler = HANDLERS[action];
    if (!handler) return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    const result = await base44.functions.invoke(handler, payload);
    return Response.json({ ok: true, action, result: result?.data ?? result });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
