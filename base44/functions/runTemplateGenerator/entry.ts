import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// TEMPLATE GENERATOR — uses InvokeLLM to generate a full website template spec
// from a niche + style. Returns structured JSON matching the SystemBuild fields.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const expectedSecret = secrets.get('WORKER_SECRET');
    const isWorker = !!(body?.worker_secret && expectedSecret && body.worker_secret === expectedSecret);
    if (!isWorker) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const niche = body.niche || 'business';
    const style = body.style || 'modern professional';

    const prompt = `Generate a complete, production-ready website template spec for a ${niche} business. Design style: ${style}. The template must be SEO-optimized to meet Google's 100% programmatic requirements (title 50-60 chars, meta description 150-160 chars, H1 + H2s, schema markup, mobile-friendly, fast page speed). Return a JSON object with these exact fields:
- title: a compelling site title
- what_to_build: detailed description of what to build
- how_it_looks: design style, colors, layout, aesthetic
- how_it_functions: features, flows, interactions
- what_it_connects_to: integrations, APIs, data sources
- what_it_says: content, copy, messaging, tone
- how_it_operates: autonomous behaviors, schedules, workflows
- deliver_to: where to deploy (GitHub + Railway + domain)`;

    const responseSchema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        what_to_build: { type: 'string' },
        how_it_looks: { type: 'string' },
        how_it_functions: { type: 'string' },
        what_it_connects_to: { type: 'string' },
        what_it_says: { type: 'string' },
        how_it_operates: { type: 'string' },
        deliver_to: { type: 'string' }
      },
      required: ['title', 'what_to_build', 'how_it_looks', 'how_it_functions']
    };

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema
    });

    const template = typeof result === 'string' ? JSON.parse(result) : result;

    return Response.json({
      niche,
      style,
      template
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}