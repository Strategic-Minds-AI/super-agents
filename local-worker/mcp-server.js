#!/usr/bin/env node
import { createServer } from 'node:http'
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Script } from 'node:vm'

const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || process.env.WORKER_SECRET || ''
const EXECUTION_ENABLED = process.env.EDEN_F2_EXECUTOR_ENABLED === 'true'
const EXECUTOR_REVISION = process.env.RAILWAY_GIT_COMMIT_SHA || ''
const SUPABASE_URL = (process.env.STORAGE_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_SERVICE_KEY = process.env.STORAGE_SUPABASE_SERVICE_ROLE_KEY || ''
const F2_CANARY_PROMPT = 'EDEN_F2_CANARY_SLUGIFY_V1'
const MAX_BODY_BYTES = 256 * 1024
const F2_PROJECT = /^railway-staging-f2-[a-z0-9-]{8,80}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const tools = [
  {
    name: 'generate_mcp_server',
    description: 'Generate a portable MCP server manifest from a validated tool definition list. Does not deploy or execute code.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 80 },
        description: { type: 'string', maxLength: 500 },
        tools: {
          type: 'array',
          maxItems: 100,
          items: {
            type: 'object',
            required: ['name', 'description', 'inputSchema'],
            properties: {
              name: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,64}$' },
              description: { type: 'string', maxLength: 500 },
              inputSchema: { type: 'object' },
            },
          },
        },
      },
      required: ['name', 'tools'],
      additionalProperties: false,
    },
  },
  {
    name: 'execute_coding_job',
    description: 'Submit a fenced low-risk coding job to the configured executor. Disabled until an isolated sandbox adapter is approved.',
    inputSchema: {
      type: 'object',
      properties: {
        jobId: { type: 'string', minLength: 1, maxLength: 128 },
        projectId: { type: 'string', minLength: 1, maxLength: 128 },
        prompt: { type: 'string', minLength: 1, maxLength: 4000 },
        risk: { type: 'string', enum: ['low', 'medium'] },
        leaseId: { type: 'string', minLength: 1, maxLength: 128 },
      },
      required: ['jobId', 'projectId', 'prompt', 'risk', 'leaseId'],
      additionalProperties: false,
    },
  },
]

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

function authorized(req) {
  if (!MCP_BEARER_TOKEN) return false
  return req.headers.authorization === `Bearer ${MCP_BEARER_TOKEN}`
}

async function readJson(req) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('request_too_large')
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function validateToolDefinition(tool) {
  return tool && typeof tool === 'object' &&
    typeof tool.name === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(tool.name) &&
    typeof tool.description === 'string' && tool.description.length <= 500 &&
    tool.inputSchema && typeof tool.inputSchema === 'object'
}

function sameSecret(header, token) {
  if (!token || token.length < 32 || !header?.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7)); const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function readLease(jobId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null
  const response = await fetch(`${SUPABASE_URL}/rest/v1/eden_jobs?id=eq.${encodeURIComponent(jobId)}&select=id,project_id,prompt,risk,worker_id,lease_id,lease_expires_at,cancel_requested_at,attempt,requested_by,status`, {
    headers: { apikey: SUPABASE_SERVICE_KEY, authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    redirect: 'error',
  })
  if (!response.ok) throw new Error('queue_readback_failed')
  const rows = await response.json()
  return Array.isArray(rows) ? rows[0] || null : null
}

function verifyLease(payload, row) {
  if (!row || row.status !== 'running' || !row.requested_by || row.id !== payload.job.id ||
      row.project_id !== payload.job.projectId || row.prompt !== payload.job.prompt ||
      row.risk !== payload.job.risk || row.attempt !== payload.job.attempt ||
      row.worker_id !== payload.fence.workerId || row.lease_id !== payload.fence.leaseId ||
      row.cancel_requested_at) return false
  const expiry = Date.parse(row.lease_expires_at || '')
  return Number.isFinite(expiry) && expiry > Date.now() + 1000
}

function validateExecutorPayload(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      input.protocol !== 'eden-worker-executor-v1' || !input.job || !input.fence) return null
  const { job, fence } = input
  if (!UUID.test(job.id) || !F2_PROJECT.test(job.projectId) || job.prompt !== F2_CANARY_PROMPT ||
      job.risk !== 'low' || !Number.isInteger(job.attempt) || job.attempt < 1 || job.attempt > 3 ||
      !/^[a-zA-Z0-9_-]{4,100}$/.test(fence.workerId) || !UUID.test(fence.leaseId)) return null
  return input
}

const buggy = 'function slugify(text) { return text.toLowerCase().replace(/ /g, "-") }\\n'
const fixed = 'function slugify(text) {\\n  if (typeof text !== "string") throw new TypeError("text must be a string")\\n  return text.normalize("NFKD").replace(/[\\\\u0300-\\\\u036f]/g, "")\\n    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")\\n}\\n'
const canaryCases = [['Hello World','hello-world'],['  Hello   World  ','hello-world'],['Café déjà vu','cafe-deja-vu'],['Build, test & ship!','build-test-ship'],['Release 2.0','release-2-0'],['A\\tB\\nC','a-b-c'],['---already---slugged---','already-slugged'],['','']]
function sha256(value) { return createHash('sha256').update(value).digest('hex') }
function runFixture(source) {
  const code = `${source}\\nconst cases=${JSON.stringify(canaryCases)};let passed=0;for(const [input,expected] of cases){if(slugify(input)===expected)passed++}passed`
  return new Script(code).runInNewContext({}, { timeout: 500 })
}
async function runF2Canary() {
  if (!/^[a-f0-9]{40}$/.test(EXECUTOR_REVISION)) throw new Error('immutable_executor_revision_required')
  const dir = await mkdtemp(join(tmpdir(), 'eden-f2-'))
  try {
    const path = join(dir, 'slugify.js'); await writeFile(path, buggy, { flag: 'wx' })
    const before = await readFile(path, 'utf8'); const beforePassed = runFixture(before)
    await writeFile(path, fixed); const after = await readFile(path, 'utf8'); const afterPassed = runFixture(after)
    if (beforePassed >= 8 || afterPassed !== 8) throw new Error('canary_failed')
    const content = JSON.stringify({ proof: 'real-local-first-party-code-canary', sourceRevisionKind: 'executor-deployment-commit-not-output-commit', executorRevision: EXECUTOR_REVISION, beforeSha256: sha256(before), afterSha256: sha256(after), tests: { total: 8, beforePassed, afterPassed }, diff: { before, after }, limitations: 'Staging fixture only; no user repository change, Git commit, preview deployment, or Guardian approval.' })
    return { outcome: 'preview_ready', artifact: { artifactType: 'code_canary', content, version: 1, sourceRevision: EXECUTOR_REVISION, path: 'f2/staging/slugify.js' } }
  } finally { await rm(dir, { recursive: true, force: true }) }
}

function generateManifest(input) {
  if (!input || typeof input.name !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(input.name)) {
    throw new Error('invalid_server_name')
  }
  if (!Array.isArray(input.tools) || input.tools.length > 100 || !input.tools.every(validateToolDefinition)) {
    throw new Error('invalid_tool_definitions')
  }
  return {
    schemaVersion: 1,
    name: input.name,
    description: typeof input.description === 'string' ? input.description.slice(0, 500) : '',
    transport: 'streamable-http',
    generatedAt: new Date().toISOString(),
    tools: input.tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    deployment: { target: 'railway', requiresBearerAuth: true },
  }
}

async function callTool(name, args) {
  if (name === 'generate_mcp_server') {
    return { content: [{ type: 'text', text: JSON.stringify(generateManifest(args), null, 2) }] }
  }
  if (name === 'execute_coding_job') {
    if (!EXECUTION_ENABLED) return { isError: true, content: [{ type: 'text', text: 'executor_disabled_pending_isolated_sandbox_approval' }] }
    return { isError: true, content: [{ type: 'text', text: 'mcp_tool_requires_v1_execute_route' }] }
  }
  throw new Error('unknown_tool')
}

async function handleMcp(req, res) {
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' })
  let body
  try { body = await readJson(req) } catch (error) { return json(res, 400, { error: error.message }) }
  const id = body.id ?? null
  try {
    if (body.method === 'initialize') {
      return json(res, 200, { jsonrpc: '2.0', id, result: { protocolVersion: '2025-03-26', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'strategic-sandbox-executor', version: '1.0.0' } } })
    }
    if (body.method === 'tools/list') {
      return json(res, 200, { jsonrpc: '2.0', id, result: { tools } })
    }
    if (body.method === 'tools/call') {
      const result = await callTool(body.params?.name, body.params?.arguments || {})
      return json(res, 200, { jsonrpc: '2.0', id, result })
    }
    return json(res, 200, { jsonrpc: '2.0', id, error: { code: -32601, message: 'method_not_found' } })
  } catch (error) {
    return json(res, 200, { jsonrpc: '2.0', id, error: { code: -32602, message: error.message } })
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
    return json(res, 200, { ok: true, service: 'strategic-sandbox-executor', mcp: true, executionEnabled: EXECUTION_ENABLED })
  }
  if (req.method === 'POST' && (req.url === '/mcp' || req.url === '/v1/mcp')) return handleMcp(req, res)
  if (req.method === 'POST' && req.url === '/v1/execute') {
    if (!sameSecret(req.headers.authorization, MCP_BEARER_TOKEN)) return json(res, 401, { outcome: 'blocked', reason: 'unauthorized' })
    if (!EXECUTION_ENABLED) return json(res, 503, { outcome: 'blocked', reason: 'executor_disabled_pending_isolated_sandbox_approval' })
    if (req.headers['idempotency-key'] === undefined) return json(res, 409, { outcome: 'blocked', reason: 'idempotency_key_required' })
    let body
    try { body = await readJson(req) } catch (error) { return json(res, 400, { outcome: 'blocked', reason: error.message }) }
    const payload = validateExecutorPayload(body)
    if (!payload) return json(res, 400, { outcome: 'blocked', reason: 'unsupported_or_invalid_staging_job' })
    if (req.headers['idempotency-key'] !== payload.job.id) return json(res, 409, { outcome: 'blocked', reason: 'idempotency_key_mismatch' })
    try {
      const lease = await readLease(payload.job.id)
      if (!verifyLease(payload, lease)) return json(res, 409, { outcome: 'blocked', reason: 'unauthorized_cancelled_or_stale_fenced_lease' })
      const artifact = await runF2Canary()
      const afterLease = await readLease(payload.job.id)
      if (!verifyLease(payload, afterLease)) return json(res, 409, { outcome: 'blocked', reason: 'lease_lost_before_result' })
      return json(res, 200, artifact)
    } catch { return json(res, 503, { outcome: 'blocked', reason: 'trusted_canary_or_queue_verification_failed' }) }
  }
  return json(res, 404, { error: 'not_found', requestId: randomUUID() })
})

server.listen(PORT, HOST, () => console.log(JSON.stringify({ service: 'strategic-sandbox-executor', event: 'started', host: HOST, port: PORT, executionEnabled: EXECUTION_ENABLED })))
