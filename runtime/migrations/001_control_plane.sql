CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS agent_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name text NOT NULL,
  task_type text NOT NULL,
  title text NOT NULL,
  description text,
  domain text,
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('critical','high','medium','low')),
  autonomous boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','failed','needs_approval','cancelled')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  run_after timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  lease_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_claim
  ON agent_tasks (agent_name, status, autonomous, run_after, created_at);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_lease
  ON agent_tasks (status, lease_expires_at)
  WHERE status = 'in_progress';

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent_name text NOT NULL,
  worker_id text NOT NULL,
  source_sha text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','completed','failed','needs_approval')),
  model text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_task ON agent_runs(task_id, started_at DESC);

CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id text PRIMARY KEY,
  agent_name text NOT NULL,
  runtime text NOT NULL DEFAULT 'docker',
  status text NOT NULL DEFAULT 'online',
  source_sha text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES agent_tasks(id) ON DELETE SET NULL,
  action_class text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decision_note text
);
