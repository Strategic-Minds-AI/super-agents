import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import { config } from './config.js';

let cache = null;

async function loadAll() {
  if (cache) return cache;
  const entries = await readdir(config.agentConfigDir);
  const agents = new Map();

  for (const file of entries.filter(x => x.endsWith('.json')).sort()) {
    const raw = await readFile(resolve(config.agentConfigDir, file), 'utf8');
    const agent = JSON.parse(raw);
    if (!agent?.name || !agent?.instructions) {
      throw new Error(`Invalid agent definition: ${file}`);
    }
    agents.set(agent.name, agent);
  }

  cache = agents;
  return agents;
}

export async function getAgent(name) {
  const agents = await loadAll();
  const agent = agents.get(name);
  if (!agent) throw new Error(`Unknown agent: ${name}`);
  return agent;
}

export async function listAgents() {
  const agents = await loadAll();
  return [...agents.keys()];
}
