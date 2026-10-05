import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { compileZeroMission } from '../../shared/zeroKernel.ts';
import { compileProviderPlan } from '../../shared/zeroProviderResolver.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const mission = compileZeroMission(body);

    const build = await base44.entities.SystemBuild.create({
      title: mission.project_name,
      build_type: body.build_type || 'website',
      what_to_build: JSON.stringify({
        project_name: mission.project_name,
        five_answers: mission.five_answers,
        source_truth_version: mission.source_truth_version
      }),
      how_it_looks: mission.approved_web_pack
        ? `AUTHORITATIVE_WEB_PACK: ${mission.approved_web_pack}`
        : 'AWAITING_CLIENT_WEB_PACK_SELECTION',
      how_it_functions: JSON.stringify({ acceptance: mission.acceptance }),
      what_it_connects_to: mission.required_capabilities.join(', '),
      how_it_operates: JSON.stringify({
        work_packets: mission.work_packets,
        protected_actions: mission.protected_actions,
        truth_rule: mission.truth_rule
      }),
      deliver_to: 'VERCEL_PREVIEW',
      status: 'planning',
      result: JSON.stringify({
        zero_version: mission.zero_version,
        selection_gate: mission.selection_gate,
        terminal_states: mission.terminal_states
      })
    });

    const phaseActionClass = {
      PUBLIC_BUSINESS_RESEARCH: 'READ',
      CLIENT_INTELLIGENCE: 'READ',
      CREATIVE_10_10_10: 'DRAFT',
      CLIENT_SELECTION: 'PROTECTED',
      VISUAL_LOCK: 'DRAFT',
      CAPABILITY_BOOTSTRAP: 'READ',
      SANDBOX_PROVISION: 'PREVIEW_WRITE',
      BUILD: 'BRANCH_WRITE',
      PREVIEW_DEPLOY: 'PREVIEW_WRITE',
      INDEPENDENT_VALIDATE: 'READ',
      BOUNDED_REPAIR: 'BRANCH_WRITE',
      RECEIPT: 'DRAFT',
      RELEASE_GATE: 'PROTECTED'
    };

    const providerPlan = compileProviderPlan(mission.required_capabilities, {});
    const manifestKey = `zero-manifest-${mission.source_truth_version}`;
    const manifest = await base44.entities.ProvisioningManifest.create({
      manifest_id: manifestKey,
      project_name: mission.project_name,
      build_id: build.id,
      source_truth_version: mission.source_truth_version,
      target_mode: 'preview',
      required_capabilities: mission.required_capabilities,
      provider_plan: JSON.stringify(providerPlan),
      resources: JSON.stringify({}),
      protected_holds: mission.protected_actions,
      status: providerPlan.missing.length ? 'blocked' : 'compiled',
      rollback_pointer: '',
      compiled_at: new Date().toISOString()
    });

    const createdTasks = [];
    for (const packet of mission.work_packets) {
      const actionClass = phaseActionClass[packet.phase] || 'DRAFT';
      const task = await base44.entities.AgentTask.create({
        agent_name: packet.owner,
        task_type: `zero_${packet.phase.toLowerCase()}`,
        title: `${packet.phase}: ${mission.project_name}`,
        description: JSON.stringify({
          build_id: build.id,
          project_name: mission.project_name,
          source_truth_version: mission.source_truth_version,
          approved_web_pack: mission.approved_web_pack,
          required_capabilities: mission.required_capabilities,
          acceptance: mission.acceptance,
          gate: packet.gate
        }),
        status: actionClass === 'PROTECTED' ? 'needs_approval' : 'pending',
        priority: packet.phase === 'INDEPENDENT_VALIDATE' ? 'high' : 'medium',
        autonomous: false,
        packet_id: packet.id,
        source_truth_version: mission.source_truth_version,
        engines: packet.engines || [],
        action_class: actionClass,
        idempotency_key: `${mission.source_truth_version}:${packet.id}`,
        timeout_ms: packet.phase === 'BUILD' ? 900000 : 120000,
        retry_budget: packet.phase === 'BOUNDED_REPAIR' ? 3 : 2,
        validation_contract: JSON.stringify({
          acceptance: mission.acceptance,
          independent_validator_required: mission.acceptance.independent_validation_required,
          evidence_before_pass: true
        }),
        rollback_pointer: ''
      });
      createdTasks.push({
        id: task.id,
        packet_id: packet.id,
        phase: packet.phase,
        status: task.status,
        action_class: actionClass,
        engines: packet.engines || []
      });
    }

    return Response.json({
      ok: true,
      mode: 'MISSION_COMPILED_NOT_EXECUTED',
      build_id: build.id,
      source_truth_version: mission.source_truth_version,
      selection_gate: mission.selection_gate,
      acceptance: mission.acceptance,
      required_capabilities: mission.required_capabilities,
      provider_plan: providerPlan,
      provisioning_manifest_id: manifest.id,
      tasks: createdTasks,
      next_action: mission.approved_web_pack
        ? 'Run capability bootstrap and provider binding checks, then enable only eligible preview-safe packets.'
        : 'Complete lawful public-business research and 10/10/10 creative generation, then wait for client Web Pack selection.',
      protected_actions: mission.protected_actions
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
