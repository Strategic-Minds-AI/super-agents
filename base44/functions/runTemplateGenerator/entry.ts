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

    // Use Vercel AI Gateway if key is set (free — no Base44 credits)
    const vercelKey = secrets.get('VERCEL_AI_GATEWAY_KEY');
    let template;
    let aiProvider = 'base44_invoke_llm';

    if (vercelKey) {
      try {
        const res = await fetch('https://gateway.ai.vercel.app/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a website template generator. Return only valid JSON, no markdown.' },
              { role: 'user', content: prompt + '\n\nReturn a JSON object with these exact fields: title, what_to_build, how_it_looks, how_it_functions, what_it_connects_to, what_it_says, how_it_operates, deliver_to.' }
            ],
            response_format: { type: 'json_object' }
          }),
          signal: AbortSignal.timeout(30000)
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          template = JSON.parse(content);
          aiProvider = 'vercel_ai_gateway';
        }
      } catch (e) { /* fall through to InvokeLLM */ }
    }

    if (!template) {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: responseSchema
      });
      template = typeof result === 'string' ? JSON.parse(result) : result;
    }

    return Response.json({
      niche,
      style,
      template,
      ai_provider: aiProvider
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}