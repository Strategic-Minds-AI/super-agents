import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { compileProviderPlan } from '../../shared/zeroProviderResolver.ts';

function stableId(input) {
  let hash = 2166136261;
  for (const ch of input) { hash ^= ch.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8,'0');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({error:'Unauthorized'},{status:401});
    const body = await req.json().catch(()=>({}));
    const projectName = String(body.project_name || '').trim();
    const sourceTruthVersion = String(body.source_truth_version || '').trim();
    const requiredCapabilities = Array.isArray(body.required_capabilities) ? body.required_capabilities.map(String) : [];
    if (!projectName || !sourceTruthVersion) return Response.json({error:'project_name and source_truth_version required'},{status:400});

    const states = await base44.entities.CapabilityState.filter({}).catch(()=>[]);
    const observed = {};
    for (const state of states) {
      if (!state.provider) continue;
      observed[state.provider] ||= { provider_state: 'UNKNOWN', capabilities: {} };
      if (state.capability_id === 'provider.session') {
        observed[state.provider].provider_state = state.state;
        continue;
      }
      const current = observed[state.provider].capabilities[state.capability_id];
      if (!current || String(state.last_verified_at || '') > String(current.last_verified_at || '')) {
        observed[state.provider].capabilities[state.capability_id] = state;
      }
    }
    const plan = compileProviderPlan(requiredCapabilities, observed);
    const protectedHolds = ['production_deploy','default_branch_merge','production_database_change','rls_change','dns_change','secret_change','payment_or_spend','permission_escalation','destructive_action','irreversible_migration','customer_or_public_message'];
    const manifestId = 'zero-manifest-' + stableId(projectName + '|' + sourceTruthVersion + '|' + requiredCapabilities.join(','));

    const record = await base44.entities.ProvisioningManifest.create({
      manifest_id: manifestId,
      project_name: projectName,
      build_id: body.build_id || '',
      source_truth_version: sourceTruthVersion,
      target_mode: body.target_mode === 'sandbox' ? 'sandbox' : 'preview',
      required_capabilities: requiredCapabilities,
      provider_plan: JSON.stringify(plan),
      resources: JSON.stringify(body.resources || {}),
      protected_holds: protectedHolds,
      status: plan.missing.length ? 'blocked' : 'compiled',
      rollback_pointer: body.rollback_pointer || '',
      compiled_at: new Date().toISOString()
    });

    return Response.json({
      ok:true,
      mode:'PROVISIONING_MANIFEST_COMPILED_NOT_EXECUTED',
      manifest_id: record.id,
      deterministic_manifest_id: manifestId,
      provider_plan: plan,
      protected_holds: protectedHolds,
      next_action: plan.missing.length ? 'Close missing capability routes.' : 'Verify selected providers LIVE, then execute sandbox/preview provisioning only.'
    });
  } catch (error) {
    return Response.json({error:error.message},{status:400});
  }
}
