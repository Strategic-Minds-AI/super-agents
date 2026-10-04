import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { callAI } from '../../shared/aiRouter.ts';

// WEBSITE BUILDER — generates a complete, production-ready HTML website via
// the Vercel AI Gateway, then deploys it to Vercel as a live static site.
// Returns a real URL the user can visit immediately.

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function sanitizeProjectName(input) {
  return (input || 'ai-site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52) || 'ai-site';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Sign in to build a website.' }, { status: 401 });

    const niche = (body.niche || '').trim() || 'local business';
    const style = (body.style || '').trim() || 'modern professional';
    const businessName = (body.business_name || '').trim();
    const colorHint = (body.color_hint || '').trim();

    // ── STEP 1: Generate complete HTML via AI Gateway ──
    const systemPrompt = 'You are an elite front-end developer and web designer. You generate complete, production-ready, self-contained HTML websites with embedded CSS and JavaScript. You return ONLY raw HTML code — no markdown, no code fences, no explanation, no commentary. The output must start with <!DOCTYPE html> and end with </html>.';

    const userPrompt = `Generate a complete, beautiful, fully responsive single-page website for a ${niche} business.${businessName ? ` The business name is "${businessName}".` : ''} Design style: ${style}.${colorHint ? ` Color scheme: ${colorHint}.` : ''}

Requirements — every one of these MUST be in the output:
1. Complete HTML5 document: <!DOCTYPE html>, <html lang="en">, <head> with charset, viewport meta, title (50-60 chars), meta description (150-160 chars), Open Graph tags (og:title, og:description, og:type=website), JSON-LD LocalBusiness schema markup.
2. Google Fonts via <link> in <head> — pick a professional heading + body font pairing.
3. All CSS in a single <style> tag in <head> — modern, clean, professional. Use CSS custom properties for the color palette. Mobile-first responsive design with media queries. Smooth transitions and subtle hover effects. No external CSS files.
4. Sticky navigation bar with logo text, nav links (Home, Services, About, Contact), and a hamburger menu for mobile (with vanilla JS toggle).
5. Hero section: full-viewport-height background with a compelling headline, subheadline, and a prominent CTA button. Use a CSS gradient background (no external images needed).
6. Services/Features section: 3-4 cards with icons (use inline SVG), titles, and descriptions specific to a ${niche} business.
7. About section: 2-column layout with text and a visual element (CSS-shaped card or gradient block).
8. Testimonials section: 2-3 customer quotes with names and star ratings (inline SVG stars).
9. Contact section: a contact form (name, email, phone, message) with proper labels and a submit button, plus business hours and contact info.
10. Footer: copyright, quick links, social icons (inline SVG).
11. All JavaScript in a <script> tag before </body> — hamburger toggle, smooth scroll, form validation, scroll-triggered fade-in animations using IntersectionObserver.
12. All content must be specific to a ${niche} business — real-sounding service names, realistic testimonials, actual business hours. No "Lorem ipsum" or placeholder text.
13. The page must look polished and professional at every viewport size from 320px to 1920px.

Return ONLY the complete HTML file. Start with <!DOCTYPE html> and end with </html>. No markdown fences, no explanation.`;

    const vercelKey = secrets.get('AI_GATEWAY_API_KEY') || secrets.get('VERCEL_AI_GATEWAY_KEY');
    const { result: rawHtml, provider, model } = await callAI(base44, {
      vercelKey,
      taskType: 'code_generation',
      systemPrompt,
      userPrompt,
      timeoutMs: 90000,
    });

    // ── Clean the HTML (strip any markdown fences the model may have added) ──
    let html = typeof rawHtml === 'string' ? rawHtml : String(rawHtml);
    html = html.replace(/^[\s\S]*?<!DOCTYPE html>/i, m => m.slice(m.toLowerCase().indexOf('<!doctype html>')));
    html = html.replace(/```[\s]*$/g, '');
    const lastClose = html.lastIndexOf('</html>');
    if (lastClose >= 0) html = html.slice(0, lastClose + '</html>'.length);

    if (html.length < 500) return Response.json({ error: 'The generated website was too short — try again with a more specific niche.' }, { status: 500 });

    // ── STEP 2: Deploy to Vercel as a static site ──
    const vercelToken = secrets.get('VERCEL_ACCESS_TOKEN') || secrets.get('VERCEL_TOKEN');
    if (!vercelToken) {
      return Response.json({ html, deploy_url: null, error: 'Vercel access token not configured. The website HTML was generated but could not be deployed.' }, { status: 200 });
    }

    const projectName = sanitizeProjectName(businessName || niche);
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        files: [{ file: 'index.html', data: toBase64(html), encoding: 'base64' }],
        target: 'production',
        projectSettings: { framework: null },
      }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text().catch(() => '');
      return Response.json({ html, deploy_url: null, error: `Vercel deployment failed (${deployRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const deployData = await deployRes.json();
    const deployUrl = deployData.url ? `https://${deployData.url}` : null;

    // ── STEP 3: Persist the build record ──
    let buildRecord = null;
    try {
      buildRecord = await base44.entities.SystemBuild.create({
        title: businessName || `${niche} website`,
        build_type: 'website',
        what_to_build: `AI-generated ${style} website for a ${niche} business`,
        how_it_looks: style,
        how_it_functions: 'Single-page responsive HTML site with hero, services, about, testimonials, and contact form',
        what_it_connects_to: 'Deployed on Vercel',
        what_it_says: `Content for a ${niche} business`,
        how_it_operates: 'Static site, no server required',
        deliver_to: deployUrl || 'Vercel deployment',
        status: 'delivered',
        result: deployUrl || JSON.stringify(deployData),
      });
    } catch {}

    return Response.json({
      niche, style, business_name: businessName,
      html,
      deploy_url: deployUrl,
      deployment_id: deployData.id,
      project_name: projectName,
      build_id: buildRecord?.id || null,
      ai_provider: provider,
      ai_model: model,
      status: deployUrl ? 'deployed' : 'generated',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}