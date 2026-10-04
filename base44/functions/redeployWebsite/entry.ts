import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { websiteFiles } from '../../shared/websiteAssets.ts';
import { requireFactoryExecutor, hashContactToken } from '../../shared/factoryAuth.ts';

// REDEPLOY WEBSITE — takes an edited HTML source for an existing build,
// re-deploys it to Vercel (same project), and updates the build record.
// Optionally assigns a custom domain to the Vercel project.

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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

    const buildId = body.build_id;
    const html = typeof body.html === 'string' ? body.html : null;
    const customDomain = typeof body.custom_domain === 'string' ? body.custom_domain.trim() : null;

    if (!buildId) return Response.json({ error: 'Missing build_id.' }, { status: 400 });
    if (!html || html.length < 500) return Response.json({ error: 'Missing or invalid HTML source.' }, { status: 400 });

    const db = base44.asServiceRole.entities;
    const build = await db.SystemBuild.get(buildId).catch(() => null);
    if (!build) return Response.json({ error: 'Build not found.' }, { status: 404 });
    if (user.role !== 'admin' && build.created_by_id !== user.id && build.owner_id !== user.id) {
      return Response.json({ error: 'You do not own this build.' }, { status: 403 });
    }

    await db.SystemBuild.update(build.id, { status: 'deploying', build_stage: 'Re-deploying edited site', last_error: '' });

    const vercelToken = secrets.get('VERCEL_ACCESS_TOKEN') || secrets.get('VERCEL_TOKEN');
    if (!vercelToken) {
      await db.SystemBuild.update(build.id, { status: 'failed', last_error: 'Vercel access token not configured.' });
      return Response.json({ error: 'Vercel access token not configured.' }, { status: 502 });
    }

    const projectName = build.project_name || 'ai-site';
    const contactToken = randomToken();
    const tokenHash = await hashContactToken(contactToken);

    const files = websiteFiles(html, build.id, contactToken).map(f => ({ file: f.file, data: toBase64(f.data), encoding: 'base64' }));

    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, files, target: 'production', projectSettings: { framework: null } }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text().catch(() => '');
      await db.SystemBuild.update(build.id, { status: 'failed', last_error: `Vercel re-deploy failed (${deployRes.status}): ${errText.slice(0, 400)}` });
      return Response.json({ error: `Vercel re-deploy failed (${deployRes.status}): ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const deployData = await deployRes.json();
    const deployUrl = deployData.url ? `https://${deployData.url}` : null;

    // Optionally assign a custom domain to the project
    let domainStatus = 'unchanged';
    if (customDomain) {
      try {
        const domainRes = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}/domains`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: customDomain }),
        });
        domainStatus = domainRes.ok ? 'assigned' : `failed: ${domainRes.status}`;
      } catch (e) { domainStatus = `failed: ${e.message}`; }
    }

    const update = {
      status: 'delivered',
      result: deployUrl,
      deployment_id: deployData.id,
      deployment_url: deployUrl,
      source_html: html,
      contact_token_hash: tokenHash,
      contact_verified: false,
      build_stage: 'Re-deployed from Studio',
      last_error: '',
    };
    if (customDomain) update.custom_domain = customDomain;
    if (body.meta_title) update.meta_title = String(body.meta_title).slice(0, 200);
    if (body.meta_description) update.meta_description = String(body.meta_description).slice(0, 500);
    if (body.target_keywords) update.target_keywords = String(body.target_keywords).slice(0, 1000);
    if (body.competitors) update.competitors = String(body.competitors).slice(0, 1000);

    const updated = await db.SystemBuild.update(build.id, update);

    return Response.json({
      build_id: build.id,
      deploy_url: deployUrl,
      deployment_id: deployData.id,
      contact_token: contactToken,
      custom_domain_status: domainStatus,
      status: 'deployed',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}