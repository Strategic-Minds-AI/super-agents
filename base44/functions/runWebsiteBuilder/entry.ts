import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { callAI } from '../../shared/aiRouter.ts';
import { prepareWebsite, websiteFiles } from '../../shared/websiteAssets.ts';
import { requireFactoryExecutor, hashContactToken } from '../../shared/factoryAuth.ts';
import { refreshFactoryBatch } from '../../shared/factoryProgress.ts';

// WEBSITE BUILDER — generates a complete HTML website via the Vercel AI Gateway,
// injects a working contact form + serverless handler, deploys to Vercel, and
// records the build with a hashed contact token so enquiries persist.

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function sanitizeProjectName(input) {
  return (input || 'ai-site').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52) || 'ai-site';
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await requireFactoryExecutor(base44, body);

    const niche = (body.niche || '').trim() || 'local business';
    const style = (body.style || '').trim() || 'modern professional';
    const businessName = (body.business_name || '').trim();
    const buildId = typeof body.build_id === 'string' ? body.build_id : null;
    const batchId = typeof body.batch_id === 'string' ? body.batch_id : null;

    const db = base44.asServiceRole.entities;
    let build = buildId ? await db.SystemBuild.get(buildId).catch(() => null) : null;

    if (build && user.role !== 'admin' && build.created_by_id !== user.id && build.owner_id !== user.id) {
      return Response.json({ error: 'You do not own this build.' }, { status: 403 });
    }

    const ownerId = build?.owner_id || user.id || null;

    if (build) {
      await db.SystemBuild.update(build.id, { status: 'building', build_stage: 'Generating website via AI Gateway', last_error: '' });
    }

    // ── STEP 1: Generate complete HTML via AI Gateway ──
    const systemPrompt = 'You are an elite front-end developer and web designer. You generate complete, production-ready, self-contained HTML websites with embedded CSS and JavaScript. You return ONLY raw HTML code — no markdown, no code fences, no explanation, no commentary. The output must start with <!DOCTYPE html> and end with </html>.';

    const userPrompt = `Generate a complete, beautiful, fully responsive single-page website for a ${niche} business.${businessName ? ` The business name is "${businessName}".` : ''} Design style: ${style}.

Requirements — every one of these MUST be in the output:
1. Complete HTML5 document: <!DOCTYPE html>, <html lang="en">, <head> with charset, viewport meta, title (50-60 chars), meta description (150-160 chars), Open Graph tags, JSON-LD LocalBusiness schema markup.
2. Google Fonts via <link> in <head>.
3. All CSS in a single <style> tag in <head> — modern, clean, professional. CSS custom properties for the color palette. Mobile-first responsive. Smooth transitions and subtle hover effects. No external CSS files.
4. Sticky navigation bar with logo text, nav links (Home, Services, About, Contact), and a hamburger menu for mobile (vanilla JS toggle).
5. Hero section: full-viewport-height background with a compelling headline, subheadline, and a prominent CTA button. CSS gradient background.
6. Services section: 3-4 cards with inline SVG icons, titles, and descriptions specific to a ${niche} business.
7. About section: 2-column layout with text and a visual element.
8. Testimonials section: 2-3 customer quotes with names and inline SVG star ratings.
9. Contact section: a contact form (name, email, phone, message) with labels and a submit button, plus business hours and contact info.
10. Footer: copyright, quick links, inline SVG social icons.
11. All JavaScript in a <script> tag before </body> — hamburger toggle, smooth scroll, form validation, scroll-triggered fade-in via IntersectionObserver.
12. All content specific to a ${niche} business — real-sounding service names, realistic testimonials, actual business hours. No "Lorem ipsum".
13. The page must look polished at every viewport from 320px to 1920px.

Return ONLY the complete HTML file. Start with <!DOCTYPE html> and end with </html>. No markdown fences, no explanation.`;

    const vercelKey = secrets.get('AI_GATEWAY_API_KEY') || secrets.get('VERCEL_AI_GATEWAY_KEY');
    let rawHtml;
    let provider = 'vercel_ai_gateway';
    let model = 'openai/gpt-4o';
    try {
      const ai = await callAI(base44, {
        vercelKey,
        taskType: 'code_generation',
        systemPrompt,
        userPrompt,
        timeoutMs: 90000,
      });
      rawHtml = ai.result;
      provider = ai.provider;
      model = ai.model;
    } catch (e) {
      if (build) await db.SystemBuild.update(build.id, { status: 'failed', last_error: `AI generation failed: ${e.message}`.slice(0, 1500) });
      return Response.json({ error: `Website generation failed: ${e.message}` }, { status: 502 });
    }

    // ── STEP 2: Prepare the website (inject contact form + handler) ──
    const contactToken = randomToken();
    const tokenHash = await hashContactToken(contactToken);
    const workingBuildId = build?.id || `pending_${Date.now()}`;
    let html;
    try {
      html = prepareWebsite(rawHtml, workingBuildId);
    } catch (e) {
      if (build) await db.SystemBuild.update(build.id, { status: 'failed', last_error: `Generated site failed validation: ${e.message}`.slice(0, 1500) });
      return Response.json({ error: `Generated website was incomplete: ${e.message}` }, { status: 500 });
    }

    // ── STEP 3: Deploy to Vercel ──
    const vercelToken = secrets.get('VERCEL_ACCESS_TOKEN') || secrets.get('VERCEL_TOKEN');
    if (!vercelToken) {
      if (build) await db.SystemBuild.update(build.id, { status: 'failed', last_error: 'Vercel access token not configured.' });
      return Response.json({ error: 'Vercel access token not configured. Add VERCEL_ACCESS_TOKEN to deploy websites.' }, { status: 502 });
    }

    const projectName = sanitizeProjectName(businessName || niche);
    const files = websiteFiles(html, workingBuildId, contactToken).map(f => ({ file: f.file, data: toBase64(f.data), encoding: 'base64' }));

    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        files,
        target: 'production',
        projectSettings: { framework: null },
      }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text().catch(() => '');
      if (build) await db.SystemBuild.update(build.id, { status: 'failed', last_error: `Vercel deployment failed (${deployRes.status}): ${errText.slice(0, 400)}` });
      return Response.json({ error: `Vercel deployment failed (${deployRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const deployData = await deployRes.json();
    const deployUrl = deployData.url ? `https://${deployData.url}` : null;

    // ── STEP 4: Persist / update the build record ──
    const buildPayload = {
      title: businessName || `${niche} website`,
      build_type: 'website',
      what_to_build: `AI-generated ${style} website for a ${niche} business`,
      how_it_looks: style,
      how_it_functions: 'Single-page responsive HTML site with hero, services, about, testimonials, and working contact form',
      what_it_connects_to: 'Deployed on Vercel; enquiries saved via saveWebsiteContact',
      what_it_says: `Content for a ${niche} business`,
      how_it_operates: 'Static site + serverless contact handler',
      deliver_to: deployUrl || 'Vercel deployment',
      status: 'delivered',
      result: deployUrl,
      deployment_id: deployData.id,
      deployment_url: deployUrl,
      project_name: projectName,
      contact_token_hash: tokenHash,
      contact_verified: false,
      owner_id: ownerId,
      batch_id: batchId || build?.batch_id || null,
      ai_provider: provider,
      ai_model: model,
      build_stage: 'Deployed',
      last_error: '',
    };

    let buildRecord;
    if (build) {
      buildRecord = await db.SystemBuild.update(build.id, buildPayload);
    } else {
      buildRecord = await db.SystemBuild.create(buildPayload);
    }

    if (batchId || buildRecord.batch_id) {
      await refreshFactoryBatch(base44, batchId || buildRecord.batch_id);
    }

    return Response.json({
      niche, style, business_name: businessName,
      deploy_url: deployUrl,
      deployment_id: deployData.id,
      project_name: projectName,
      build_id: buildRecord.id,
      contact_token: contactToken,
      ai_provider: provider,
      ai_model: model,
      status: 'deployed',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}