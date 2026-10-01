# Xtreme Domain Operator — Local Autonomous Worker

A zero-dependency Node.js worker that runs the hardened agent loop **continuously** on your machine. Deploy the same code to Railway for 24/7 uptime when your laptop sleeps.

The worker polls your Base44 app's `runAgentLoop` function on a configurable interval, executing autonomous tasks (SEO audits, sitemap submissions, report emails, competitor scans) without any human interaction.

---

## Quick Start (Local)

### 1. Set the shared secret in your Base44 app

In the Base44 builder chat, you were asked to set a `WORKER_SECRET`. Pick any strong random string — you'll use the same value here.

Generate one:
```bash
openssl rand -hex 32
```

### 2. Configure the worker

```bash
cd local-worker
cp .env.example .env
```

Edit `.env`:
```
APP_URL=https://super-agents-zero.base44.app
WORKER_SECRET=<the-same-secret-you-set-in-base44>
POLL_INTERVAL=60000
MAX_CYCLES=5
REPORT_EMAIL=youremail@gmail.com
```

### 3. Run it

```bash
node worker.js
```

That's it. The worker will:
- Run the agent loop immediately on startup
- Poll every `POLL_INTERVAL` milliseconds (default: 60s)
- Execute up to `MAX_CYCLES` cycles per run (default: 5)
- Log every action to the console **and** to `worker.log`
- Show stats every 5 minutes
- Run forever until you press `Ctrl+C`

---

## How It Works

```
  Your Machine                    Base44 Cloud
  ┌──────────┐                   ┌──────────────────┐
  │ worker.js│───POST every 60s──>│ /functions/       │
  │ (loop)  │<──JSON response────│  runAgentLoop     │
  └──────────┘                   │                  │
                                 │  • Pulls pending  │
                                 │    AgentTasks      │
                                 │  • Executes them   │
                                 │  • Sends emails    │
                                 │  • Self-dispatches │
                                 │    follow-ups      │
                                 └──────────────────┘
```

The worker is a **dumb poller** — all the intelligence lives in your Base44 backend. The worker just kicks the loop on a timer. This means:
- If the worker crashes, it just restarts and picks up where it left off (tasks are persisted in the database, not in memory)
- If Base44 is down, the worker retries on the next tick
- If your laptop sleeps, tasks queue up and execute when it wakes
- For true 24/7, deploy the same code to Railway (below)

---

## Deploy to Railway (24/7 Uptime)

Railway runs the same `worker.js` in a container that never sleeps.

### 1. Push the `local-worker/` folder to a GitHub repo

```bash
cd local-worker
git init
git add .
git commit -m "Xtreme autonomous worker"
git remote add origin https://github.com/yourname/xtreme-worker.git
git push -u origin main
```

### 2. Create a Railway project

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your `xtreme-worker` repo
3. Railway auto-detects the Dockerfile

### 3. Set environment variables in Railway

In the Railway dashboard → your service → Variables tab, add:

| Variable | Value |
|---|---|
| `APP_URL` | `https://super-agents-zero.base44.app` |
| `WORKER_SECRET` | `<same secret as Base44>` |
| `POLL_INTERVAL` | `60000` |
| `MAX_CYCLES` | `5` |
| `REPORT_EMAIL` | `youremail@gmail.com` |

### 4. Deploy

Railway builds and starts the container automatically. The worker runs forever, restarting on failure.

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `APP_URL` | `https://super-agents-zero.base44.app` | Your published Base44 app URL |
| `WORKER_SECRET` | *(required)* | Shared secret matching the Base44 app secret |
| `POLL_INTERVAL` | `60000` | Milliseconds between runs (60000 = 1 min) |
| `MAX_CYCLES` | `5` | Agent-loop cycles per run (1–10) |
| `REPORT_EMAIL` | *(empty)* | Email for autonomous report emails |
| `LOG_FILE` | `./worker.log` | Log file path |

---

## Spinning Up Systems All Day

The worker is autonomous — once running, it continuously:
1. **Observes** — pulls pending autonomous `AgentTask` records from the database
2. **Decides** — picks the next due task
3. **Acts** — executes it (SEO audit, sitemap check, email send, etc.)
4. **Records** — marks it complete and stores the result
5. **Self-dispatches** — queues follow-up tasks automatically

To add new work, just create `AgentTask` records (from the Mission Control UI, the Domain Registry, or the API). The worker picks them up on the next tick — no restart needed.

### Create tasks programmatically

```bash
curl -X POST https://super-agents-zero.base44.app/functions/runAgentLoop \
  -H "Content-Type: application/json" \
  -d '{"worker_secret":"YOUR_SECRET","max_cycles":1,"trigger":"manual"}'
```

---

## Logs

The worker logs to both the console and `worker.log`. Each line is timestamped ISO-8601:
- `✓` green = actions executed
- `○` dim = idle (no pending tasks)
- `✗` red = error (worker keeps going)

Tail the log:
```bash
tail -f worker.log
``