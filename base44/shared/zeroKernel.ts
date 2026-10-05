import { resolveZeroEngines } from './zeroRoutingMatrix.ts';

export const ZERO_VERSION = '1.1.0';

export const ZERO_ACCEPTANCE = Object.freeze({
  visual_parity_min: 0.99,
  operational_parity_required: 1,
  p0_failures_allowed: 0,
  p1_failures_allowed: 0,
  mandatory_unknowns_allowed: 0,
  rollback_required: true,
  exact_deployment_identity_required: true,
  independent_validation_required: true
});

export const ZERO_PHASES = Object.freeze([
  'INGEST',
  'PUBLIC_BUSINESS_RESEARCH',
  'CLIENT_INTELLIGENCE',
  'CREATIVE_10_10_10',
  'CLIENT_SELECTION',
  'VISUAL_LOCK',
  'CAPABILITY_BOOTSTRAP',
  'SANDBOX_PROVISION',
  'BUILD',
  'PREVIEW_DEPLOY',
  'INDEPENDENT_VALIDATE',
  'BOUNDED_REPAIR',
  'RECEIPT',
  'RELEASE_GATE'
]);

export const ZERO_PROTECTED_ACTIONS = Object.freeze([
  'production_deploy',
  'default_branch_merge',
  'production_database_change',
  'rls_change',
  'dns_change',
  'secret_change',
  'payment_or_spend',
  'permission_escalation',
  'destructive_action',
  'irreversible_migration',
  'customer_or_public_message'
]);

function fnv1a(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function normalizeFiveAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== 5) {
    throw new Error('Exactly five client answers are required.');
  }
  const normalized = answers.map((v) => String(v ?? '').trim());
  if (normalized.some((v) => !v)) {
    throw new Error('All five client answers must be non-empty.');
  }
  return normalized;
}

export function compileZeroMission(input = {}) {
  const projectName = String(input.project_name || '').trim();
  if (!projectName) throw new Error('project_name is required');

  const answers = normalizeFiveAnswers(input.answers);
  const approvedWebPack = input.approved_web_pack
    ? String(input.approved_web_pack).trim()
    : null;
  const buildType = String(input.build_type || 'website').trim();
  const useSupabase = Boolean(input.use_supabase);
  const useRailway = Boolean(input.use_railway);

  const requiredCapabilities = [
    'cloud_browser.public_business_research',
    'universal_template_system.resolve',
    'visual_lock.compile',
    'github.preview_branch',
    'vercel.preview_deploy',
    'independent_validator.browser_e2e',
    'receipt.rollback'
  ];
  if (useSupabase) requiredCapabilities.push('supabase.sandbox');
  if (useRailway) requiredCapabilities.push('railway.worker_or_service');

  const sourceTruthPayload = JSON.stringify({
    project_name: projectName,
    answers,
    approved_web_pack: approvedWebPack,
    build_type: buildType,
    use_supabase: useSupabase,
    use_railway: useRailway
  });

  const sourceTruthVersion = `zero-${ZERO_VERSION}-${fnv1a(sourceTruthPayload)}`;
  const selectionGate = approvedWebPack ? 'APPROVED_WEB_PACK_PRESENT' : 'AWAIT_CLIENT_SELECTION';

  const workPackets = [
    { id: 'WP-01', phase: 'PUBLIC_BUSINESS_RESEARCH', owner: 'orchestrator', engines: resolveZeroEngines('research'), autonomous: true, gate: 'lawful_public_business_only' },
    { id: 'WP-02', phase: 'CLIENT_INTELLIGENCE', owner: 'orchestrator', engines: resolveZeroEngines('business_intelligence'), autonomous: true, gate: 'evidence_labels_required' },
    { id: 'WP-03', phase: 'CREATIVE_10_10_10', owner: 'brand_guardian', engines: resolveZeroEngines('website_build'), autonomous: true, gate: 'no_fabricated_claims' },
    { id: 'WP-04', phase: 'CLIENT_SELECTION', owner: 'orchestrator', autonomous: false, gate: 'operator_or_client_selection_required' }
  ];

  if (approvedWebPack) {
    workPackets.push(
      { id: 'WP-05', phase: 'VISUAL_LOCK', owner: 'brand_guardian', engines: resolveZeroEngines('visual_lock'), autonomous: true, gate: 'approved_web_pack_is_authoritative' },
      { id: 'WP-06', phase: 'CAPABILITY_BOOTSTRAP', owner: 'orchestrator', engines: resolveZeroEngines('gpt_routing'), autonomous: true, gate: 'fail_closed_on_missing_capability' },
      { id: 'WP-07', phase: 'SANDBOX_PROVISION', owner: 'code_architect', engines: resolveZeroEngines('provisioning'), autonomous: true, gate: 'preview_only_no_production' },
      { id: 'WP-08', phase: 'BUILD', owner: 'code_architect', engines: resolveZeroEngines(buildType === 'website' || buildType === 'landing_page' ? 'website_build' : 'system_build'), autonomous: true, gate: 'visual_lock_no_redesign' },
      { id: 'WP-09', phase: 'PREVIEW_DEPLOY', owner: 'code_architect', autonomous: true, gate: 'vercel_preview_only' },
      { id: 'WP-10', phase: 'INDEPENDENT_VALIDATE', owner: 'swarm', engines: resolveZeroEngines('validation'), autonomous: true, gate: 'validator_may_not_edit' },
      { id: 'WP-11', phase: 'BOUNDED_REPAIR', owner: 'code_architect', engines: ['faultline','auto_builder'], autonomous: true, gate: 'max_3_same_class_attempts' },
      { id: 'WP-12', phase: 'RECEIPT', owner: 'orchestrator', autonomous: true, gate: 'evidence_backed_terminal_state_only' },
      { id: 'WP-13', phase: 'RELEASE_GATE', owner: 'orchestrator', autonomous: false, gate: 'explicit_production_approval_required' }
    );
  }

  return {
    zero_version: ZERO_VERSION,
    project_name: projectName,
    build_type: buildType,
    five_answers: answers,
    approved_web_pack: approvedWebPack,
    source_truth_version: sourceTruthVersion,
    selection_gate: selectionGate,
    required_capabilities: requiredCapabilities,
    acceptance: ZERO_ACCEPTANCE,
    protected_actions: ZERO_PROTECTED_ACTIONS,
    work_packets: workPackets,
    terminal_states: ['PASS', 'FAIL', 'BLOCKED', 'UNKNOWN'],
    truth_rule: 'queued_or_started_is_never_completed',
    release_rule: 'preview_can_autocomplete; production_requires_explicit_approval'
  };
}
