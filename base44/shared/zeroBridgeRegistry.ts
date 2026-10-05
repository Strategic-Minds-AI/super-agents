export const ZERO_BRIDGES = Object.freeze({
  vision_cortex: {
    preferred: 'chatgpt_mcp',
    routes: ['chatgpt_mcp','base44_app'],
    persistent_native: false,
    fallback: 'cloud_browser'
  },
  auto_builder: {
    preferred: 'chatgpt_mcp',
    routes: ['chatgpt_mcp','base44_app'],
    persistent_native: false,
    fallback: 'github'
  },
  faultline: {
    preferred: 'chatgpt_mcp',
    routes: ['chatgpt_mcp','base44_app'],
    persistent_native: false,
    fallback: 'cloud_browser'
  },
  cloud_browser: {
    preferred: 'railway_http_engine',
    routes: ['chatgpt_mcp','railway_http_engine','base44_app'],
    persistent_native: true,
    fallback: null
  },
  digital_dominance: {
    preferred: 'github_runtime',
    routes: ['chatgpt_mcp','github_runtime','base44_app'],
    persistent_native: true,
    fallback: 'cloud_browser'
  },
  xtreme_comms: {
    preferred: 'chatgpt_mcp',
    routes: ['chatgpt_mcp','provider_api'],
    persistent_native: true,
    fallback: null
  },
  windsor: {
    preferred: 'chatgpt_plugin',
    routes: ['chatgpt_plugin','windsor_api'],
    persistent_native: false,
    fallback: null
  },
  universal_templates: {
    preferred: 'base44_app',
    routes: ['base44_app','github_package'],
    persistent_native: true,
    fallback: 'auto_builder'
  },
  github: {
    preferred: 'github_api',
    routes: ['chatgpt_connector','github_api'],
    persistent_native: true,
    fallback: null
  },
  vercel: {
    preferred: 'vercel_api',
    routes: ['chatgpt_connector','vercel_api','vercel_workflow'],
    persistent_native: true,
    fallback: null
  },
  supabase: {
    preferred: 'supabase_sdk',
    routes: ['chatgpt_connector','supabase_sdk'],
    persistent_native: true,
    fallback: null
  },
  railway: {
    preferred: 'railway_api',
    routes: ['chatgpt_connector','railway_api'],
    persistent_native: true,
    fallback: null
  },
  google_workspace: {
    preferred: 'google_apis',
    routes: ['chatgpt_connectors','google_apis'],
    persistent_native: true,
    fallback: 'windsor'
  }
});

export function resolveBridge(engine, bridgeStates = {}) {
  const definition = ZERO_BRIDGES[engine];
  if (!definition) return { engine, state:'MISSING', route:null, persistent_native:false };
  const liveRoute = definition.routes.find((route) => bridgeStates[engine]?.[route]?.state === 'LIVE');
  return {
    engine,
    state: liveRoute ? 'LIVE' : 'UNVERIFIED',
    route: liveRoute || definition.preferred,
    preferred: definition.preferred,
    persistent_native: definition.persistent_native,
    fallback: definition.fallback,
    available_routes: definition.routes
  };
}

export function bridgeManifest(bridgeStates = {}) {
  return {
    version: 'ZERO-BRIDGE-FABRIC-v1',
    bridges: Object.keys(ZERO_BRIDGES).map((engine) => resolveBridge(engine, bridgeStates))
  };
}
