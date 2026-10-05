export const ZERO_PROVIDERS = Object.freeze({
  github: { role: 'CODE_TRUTH', capabilities: ['github.preview_branch','github.private_repo','github.pr','github.sha'], protected: ['default_branch_merge','repo_delete','repo_transfer'] },
  vercel: { role: 'PREVIEW_AND_WEB_RUNTIME', capabilities: ['vercel.preview_deploy','vercel.workflow','vercel.logs','vercel.rollback'], protected: ['production_deploy','env_secret_change','domain_change'] },
  supabase: { role: 'DURABLE_STATE', capabilities: ['supabase.sandbox','supabase.database','supabase.auth','supabase.storage','supabase.queue','supabase.receipt'], protected: ['production_database_change','rls_change','secret_change'] },
  railway: { role: 'PERSISTENT_WORKER', capabilities: ['railway.worker_or_service','railway.environment','railway.logs','railway.health'], protected: ['production_deploy','secret_change','payment_or_spend'] },
  base44: { role: 'APP_AND_OPERATOR_SURFACE', capabilities: ['base44.app','base44.entities','base44.functions','base44.workflows'], protected: ['production_publish','secret_change','billing'] },
  cloud_browser: { role: 'BROWSER_EXECUTION', capabilities: ['cloud_browser.public_business_research','cloud_browser.browser_session','cloud_browser.form_fill','cloud_browser.screenshot','cloud_browser.live_site_test'], protected: ['credential_submit','purchase','public_post'] },
  vision_cortex: { role: 'INTELLIGENCE', capabilities: ['vision_cortex.discovery','vision_cortex.client_intelligence','vision_cortex.opportunity_detection','vision_cortex.strategy'], protected: [] },
  auto_builder: { role: 'BUILD_FACTORY', capabilities: ['auto_builder.architecture','auto_builder.build','auto_builder.repair','auto_builder.system_factory'], protected: ['production_release'] },
  faultline: { role: 'INDEPENDENT_VALIDATION', capabilities: ['independent_validator.browser_e2e','faultline.visual_parity','faultline.security','faultline.release_validation'], protected: [] },
  digital_dominance: { role: 'GROWTH_FLEET', capabilities: ['digital_dominance.seo','digital_dominance.aeo','digital_dominance.geo','digital_dominance.site_fleet'], protected: ['production_publish','domain_change','ad_spend'] },
  windsor: { role: 'MARKETING_DATA', capabilities: ['windsor.analytics','windsor.searchconsole','windsor.cross_source_reporting'], protected: ['ads_write','destination_schedule_write'] },
  xtreme_comms: { role: 'COMMUNICATIONS', capabilities: ['xtreme_comms.email','xtreme_comms.sms','xtreme_comms.voice','xtreme_comms.whatsapp'], protected: ['customer_or_public_message'] },
  universal_templates: { role: 'BUILD_INTELLIGENCE', capabilities: ['universal_template_system.resolve','visual_lock.compile','template.generator'], protected: [] },
  x1_factory: { role: 'CONTROL_PLANE', capabilities: ['x1.queue','x1.lease','x1.receipt','x1.swarm','x1.reconcile'], protected: [] }
});

export function providerCandidatesForCapability(capability) {
  return Object.entries(ZERO_PROVIDERS)
    .filter(([, def]) => def.capabilities.includes(capability))
    .map(([id]) => id);
}

export function compileProviderPlan(requiredCapabilities = [], observed = {}) {
  const requirements = [];
  for (const capability of requiredCapabilities) {
    const candidates = providerCandidatesForCapability(capability);
    const live = candidates.filter((id) => observed[id]?.capabilities?.[capability]?.state === 'LIVE');
    const degraded = candidates.filter((id) => observed[id]?.capabilities?.[capability]?.state === 'DEGRADED');
    const providerLive = candidates.filter((id) => observed[id]?.provider_state === 'LIVE');
    const selected = live[0] || degraded[0] || providerLive[0] || candidates[0] || null;
    const selectedState = live[0]
      ? 'LIVE'
      : degraded[0]
        ? 'DEGRADED'
        : providerLive[0]
          ? 'PROVIDER_LIVE_CAPABILITY_UNVERIFIED'
          : (candidates.length ? 'UNVERIFIED' : 'MISSING');
    requirements.push({
      capability,
      candidates,
      selected,
      selected_state: selectedState,
      blocked: candidates.length === 0
    });
  }
  return {
    version: 'ZERO-PROVIDER-RESOLVER-v1',
    requirements,
    missing: requirements.filter((r) => r.blocked).map((r) => r.capability),
    unverified: requirements.filter((r) => !['LIVE','DEGRADED'].includes(r.selected_state) && !r.blocked).map((r) => r.capability),
    ready: requirements.every((r) => !r.blocked),
    rule: 'capability_first_provider_second'
  };
}
