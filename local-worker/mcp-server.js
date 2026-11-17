#!/usr/bin/env node
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '0.0.0.0'
const MCP_BEARER_TOKEN = process.env.MCP_BEARER_TOKEN || process.env.WORKER_SECRET || ''
const EXECUTION_ENABLED = process.env.EDEN_F2_EXECUTOR_ENABLED === 'true'
const MAX_BODY_BYTES = 256 * 1024

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
    if (!EXECUTION_ENABLED) {
      return { isError: true, content: [{ type: 'text', text: 'executor_disabled_pending_isolated_sandbox_approval' }] }
    }
    return { isError: true, content: [{ type: 'text', text: 'executor_adapter_not_configured' }] }
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
    if (!authorized(req)) return json(res, 401, { outcome: 'blocked', reason: 'unauthorized' })
    return json(res, 503, { outcome: 'blocked', reason: 'executor_disabled_pending_isolated_sandbox_approval' })
  }
  return json(res, 404, { error: 'not_found', requestId: randomUUID() })
})

server.listen(PORT, HOST, () => console.log(JSON.stringify({ service: 'strategic-sandbox-executor', event: 'started', host: HOST, port: PORT, executionEnabled: EXECUTION_ENABLED })))
