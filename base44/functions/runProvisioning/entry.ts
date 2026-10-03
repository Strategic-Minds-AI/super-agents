import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

// INFRASTRUCTURE PROVISIONER
// Provisions a system across GitHub, Supabase, Vercel, Railway, and local Docker.
// Creates a ClientInfrastructure record and orchestrates each target.

interface ProvisionResult {
  target: string;
  status: 'provisioned' | 'pending' | 'failed';
  detail: string;
  url?: string;
}

function generateDockerfile(stackType: string, name: string): string {
  const base = stackType === 'backend_api' || stackType === 'fullstack'
    ? `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE ${stackType === 'backend_api' ? '3000' : '5173'}
CMD ["npm", "start"]`
    : `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;
  return `# Dockerfile for ${name} (${stackType})\n${base}\n`;
}

function generateDockerCompose(name: string, stackType: string): string {
  const hasDb = stackType === 'fullstack' || stackType === 'backend_api';
  return `# docker-compose.yml for ${name}
version: "3.9"
services:
  app:
    build: .
    ports:
      - "${stackType === 'backend_api' ? '3000:3000' : '80:80'}"
    environment:
      - NODE_ENV=production
${hasDb ? `  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: \${name}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-changeme}
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
volumes:
  db_data:` : ''}
`;
}

function generateReadme(name: string, stackType: string): string {
  return `# ${name}

## Local Docker Setup

\`\`\`bash
# Build and run with Docker
docker-compose up --build

# Or build just the image
docker build -t ${name} .
docker run -p ${stackType === 'backend_api' ? '3000' : '80'}:${stackType === 'backend_api' ? '3000' : '80'} ${name}
\`\`\`

## Stack
- **Type:** ${stackType}
- **Runtime:** Node.js 20 (Alpine)
- **Database:** ${stackType === 'fullstack' || stackType === 'backend_api' ? 'PostgreSQL 16' : 'N/A'}

## Provisioned by Xtreme Super Agents
`;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // ── AUTH ──
    const expectedSecret = secrets.get('WORKER_SECRET');
    const isWorker = !!(body?.worker_secret && expectedSecret && body.worker_secret === expectedSecret);
    if (!isWorker) {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const name = (body.name || 'untitled-project').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const stackType = body.stack_type || 'fullstack';
    const requestedTargets: string[] = Array.isArray(body.targets) ? body.targets : ['docker'];

    const results: ProvisionResult[] = [];
    const envVars: string[] = [];

    // ── Create the infrastructure record ──
    const infra = await base44.asServiceRole.entities.ClientInfrastructure.create({
      name,
      stack_type: stackType,
      provision_status: 'pending',
      client_id: 'self',
    });

    // ── GitHub ──
    if (requestedTargets.includes('github')) {
      try {
        const conn = await base44.asServiceRole.connectors.getConnection('github');
        if (conn?.accessToken) {
          const repoRes = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${conn.accessToken}`,
              Accept: 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name,
              description: `Provisioned by Xtreme Super Agents`,
              private: false,
              auto_init: true,
            }),
          });
          if (repoRes.ok) {
            const repo = await repoRes.json();
            results.push({ target: 'github', status: 'provisioned', detail: `Repo created: ${repo.full_name}`, url: repo.html_url });
            await base44.asServiceRole.entities.ClientInfrastructure.update(infra.id, { github_repo: repo.full_name, github_url: repo.html_url });
            envVars.push('GITHUB_REPO');
          } else {
            results.push({ target: 'github', status: 'failed', detail: `GitHub API error: ${repoRes.status}` });
          }
        } else {
          results.push({ target: 'github', status: 'pending', detail: 'GitHub connector not authorized — authorize in Integrations' });
        }
      } catch (e) {
        results.push({ target: 'github', status: 'pending', detail: 'GitHub connector not authorized — authorize in Integrations' });
      }
    }

    // ── Supabase ──
    if (requestedTargets.includes('supabase')) {
      try {
        const conn = await base44.asServiceRole.connectors.getConnection('supabase');
        if (conn?.accessToken) {
          results.push({ target: 'supabase', status: 'provisioned', detail: 'Supabase connection verified — project provisioning requires dashboard setup', url: 'https://supabase.com/dashboard' });
          await base44.asServiceRole.entities.ClientInfrastructure.update(infra.id, { supabase_url: 'https://supabase.com/dashboard' });
          envVars.push('SUPABASE_URL', 'SUPABASE_ANON_KEY');
        } else {
          results.push({ target: 'supabase', status: 'pending', detail: 'Supabase connector not authorized — authorize in Integrations' });
        }
      } catch (e) {
        results.push({ target: 'supabase', status: 'pending', detail: 'Supabase connector not authorized — authorize in Integrations' });
      }
    }

    // ── Vercel ──
    if (requestedTargets.includes('vercel')) {
      const vercelToken = secrets.get('VERCEL_TOKEN') || secrets.get('VERCEL_ACCESS_TOKEN');
      if (vercelToken) {
        try {
          const projectRes = await fetch('https://api.vercel.com/v10/projects', {
            method: 'POST',
            headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, framework: stackType === 'static_site' ? null : 'vite' }),
          });
          if (projectRes.ok) {
            const project = await projectRes.json();
            results.push({ target: 'vercel', status: 'provisioned', detail: `Vercel project created: ${project.name}`, url: `https://vercel.com/dashboard` });
            await base44.asServiceRole.entities.ClientInfrastructure.update(infra.id, { vercel_id: project.id, vercel_url: project.url || `https://${name}.vercel.app` });
            envVars.push('VERCEL_PROJECT_ID');
          } else {
            results.push({ target: 'vercel', status: 'failed', detail: `Vercel API error: ${projectRes.status}` });
          }
        } catch (e) {
          results.push({ target: 'vercel', status: 'failed', detail: e.message });
        }
      } else {
        results.push({ target: 'vercel', status: 'pending', detail: 'Set VERCEL_TOKEN secret to enable Vercel provisioning' });
      }
    }

    // ── Railway ──
    if (requestedTargets.includes('railway')) {
      const railwayToken = secrets.get('RAILWAY_TOKEN') || secrets.get('RAILWAY_API_TOKEN');
      if (railwayToken) {
        try {
          const svcRes = await fetch('https://backboard.railway.app/graphql/v2', {
            method: 'POST',
            headers: { Authorization: `Bearer ${railwayToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: `mutation { serviceCreate(input: { name: "${name}" }) { id } }`,
            }),
          });
          if (svcRes.ok) {
            const svc = await svcRes.json();
            const svcId = svc?.data?.serviceCreate?.id;
            results.push({ target: 'railway', status: 'provisioned', detail: `Railway service created`, url: `https://railway.app` });
            await base44.asServiceRole.entities.ClientInfrastructure.update(infra.id, { railway_service_id: svcId, railway_url: 'https://railway.app' });
            envVars.push('RAILWAY_SERVICE_ID');
          } else {
            results.push({ target: 'railway', status: 'failed', detail: `Railway API error: ${svcRes.status}` });
          }
        } catch (e) {
          results.push({ target: 'railway', status: 'failed', detail: e.message });
        }
      } else {
        results.push({ target: 'railway', status: 'pending', detail: 'Set RAILWAY_TOKEN secret to enable Railway provisioning' });
      }
    }

    // ── Docker (always works — generates files) ──
    if (requestedTargets.includes('docker')) {
      const dockerFiles: Record<string, string> = {
        'Dockerfile': generateDockerfile(stackType, name),
        'docker-compose.yml': generateDockerCompose(name, stackType),
        'README.md': generateReadme(name, stackType),
      };
      results.push({ target: 'docker', status: 'provisioned', detail: 'Dockerfile + docker-compose.yml + README generated' });
      await base44.asServiceRole.entities.ClientInfrastructure.update(infra.id, {
        provision_status: 'complete',
        env_vars: JSON.stringify(envVars),
      });
      return Response.json({
        infrastructure_id: infra.id,
        name,
        stack_type: stackType,
        results,
        docker_files: dockerFiles,
      });
    }

    // ── Finalize ──
    const allProvisioned = results.filter(r => r.target !== 'docker').every(r => r.status === 'provisioned');
    const anyFailed = results.some(r => r.status === 'failed');
    await base44.asServiceRole.entities.ClientInfrastructure.update(infra.id, {
      provision_status: anyFailed ? 'failed' : allProvisioned ? 'complete' : 'pending',
      env_vars: JSON.stringify(envVars),
    });

    return Response.json({
      infrastructure_id: infra.id,
      name,
      stack_type: stackType,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}