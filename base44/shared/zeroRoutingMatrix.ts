export const ZERO_ENGINES = Object.freeze({
  vision_cortex: {
    role: 'INTELLIGENCE_BRAIN',
    owns: ['browser_research','deep_discovery','company_intelligence','councils','memory','knowledge','business_ops','prediction']
  },
  auto_builder: {
    role: 'END_TO_END_BUILDER',
    owns: ['architecture','code_generation','build_factory','template_generation','deployment_planning','repair_implementation']
  },
  faultline: {
    role: 'INDEPENDENT_VALIDATOR',
    owns: ['forensic_audit','browser_qa','visual_parity','operational_parity','security','e2e','repair_diagnosis','release_validation']
  },
  digital_dominance: {
    role: 'GROWTH_AND_FLEET_ENGINE',
    owns: ['seo','aeo','geo','search_intelligence','keyword_strategy','programmatic_sites','domain_strategy','growth_automation']
  },
  x1_factory: {
    role: 'CONTROL_PLANE',
    owns: ['mission_state','queue','lease','work_packets','provisioning_plan','capacity','swarm','receipts','rollback','reconciliation']
  },
  xtreme_comms: {
    role: 'COMMUNICATIONS_ENGINE',
    owns: ['sms','mms','voice','email','whatsapp','contact_center','webhooks','communications_routing']
  },
  cloud_browser: {
    role: 'EYES_AND_HANDS',
    owns: ['browser_session','form_fill','mouse_keyboard','screenshot','dom_extract','live_site_test','public_web_acquisition']
  },
  universal_templates: {
    role: 'REUSABLE_BUILD_INTELLIGENCE',
    owns: ['template_resolve','visual_archetype','industry_pack','component_recipe','generator_definition']
  },
  gpt_workbook: {
    role: 'GPT_OPERATOR_DOCTRINE',
    owns: ['routing_policy','task_contract','operator_interface','capability_preflight']
  },
  ops_24_7: {
    role: 'PERSISTENCE_AND_GOVERNANCE',
    owns: ['execution_contract','protected_actions','durable_receipts','resume','persistent_runtime']
  },
  windsor: {
    role: 'MARKETING_DATA_FABRIC',
    owns: ['analytics_aggregation','marketing_data','cross_source_reporting','performance_intelligence']
  }
});

const CATEGORY_ROUTE = Object.freeze({
  research: ['vision_cortex','cloud_browser'],
  business_intelligence: ['vision_cortex','windsor'],
  website_build: ['auto_builder','universal_templates'],
  system_build: ['auto_builder','x1_factory'],
  visual_lock: ['universal_templates','faultline'],
  validation: ['faultline','cloud_browser'],
  growth: ['digital_dominance','vision_cortex','windsor'],
  communications: ['xtreme_comms'],
  provisioning: ['x1_factory','auto_builder'],
  browser_operation: ['cloud_browser'],
  orchestration: ['x1_factory','ops_24_7'],
  persistence: ['x1_factory','ops_24_7'],
  gpt_routing: ['gpt_workbook','x1_factory']
});

export function resolveZeroEngines(category) {
  const key = String(category || '').trim().toLowerCase();
  return CATEGORY_ROUTE[key] || ['x1_factory'];
}

export function zeroEngineManifest() {
  return {
    version: 'ZERO-ROUTING-v1',
    engines: ZERO_ENGINES,
    categories: CATEGORY_ROUTE,
    law: [
      'capability_first_provider_second',
      'one_command_plane',
      'one_authoritative_queue',
      'one_writer_per_mutable_target',
      'independent_validator',
      'evidence_before_pass',
      'approved_web_pack_is_visual_source_truth'
    ]
  };
}
