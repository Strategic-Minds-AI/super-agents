import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { compileZeroMission } from '../../shared/zeroKernel.ts';

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

    const createdTasks = [];
    for (const packet of mission.work_packets) {
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
        status: packet.autonomous ? 'pending' : 'needs_approval',
        priority: packet.phase === 'INDEPENDENT_VALIDATE' ? 'high' : 'medium',
        autonomous: false
      });
      createdTasks.push({ id: task.id, phase: packet.phase, status: task.status });
    }

    return Response.json({
      ok: true,
      mode: 'MISSION_COMPILED_NOT_EXECUTED',
      build_id: build.id,
      source_truth_version: mission.source_truth_version,
      selection_gate: mission.selection_gate,
      acceptance: mission.acceptance,
      required_capabilities: mission.required_capabilities,
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
