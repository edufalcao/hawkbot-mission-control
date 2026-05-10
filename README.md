# 🦅 HawkBot Mission Control

> Runtime-agnostic agent management dashboard for Hermes and OpenClaw — Tasks, Calendar, Memory, Team, Office, and Activity in a single interface.

Built with **Nuxt 4** + **Nuxt UI** + **TanStack Query** + **SQLite/Drizzle ORM**, with optional **OpenClaw Gateway** WebSocket integration and local **Hermes CLI** dispatch support.

---

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Nuxt 4 |
| UI Components | Nuxt UI |
| Data Fetching | TanStack Query (`@tanstack/vue-query`) |
| State | Pinia |
| Styling | TailwindCSS (via Nuxt UI) |
| API/Backend | Nitro (built-in Nuxt) |
| Database | SQLite + Drizzle ORM (`better-sqlite3`) |
| Realtime | Optional OpenClaw WebSocket Gateway + local SSE |

---

## Features

- **Tasks Board** — Kanban with 4 columns: To Do, In Progress, Review, Done. Assignee per agent or user.
- **Calendar** — Visualization of scheduled/cron jobs from Mission Control or the optional OpenClaw Gateway.
- **Memory** — Visual browser for all memory files in the workspace (`.md`), with search.
- **Team** — Agent roster with real-time status, runtime, specialties, and stats.
- **Office** — Gamified view of agents working at their desktops.
- **Content Pipeline** — *(Phase 2)* Content creation pipeline: Idea → Script → Thumbnail → Published.
- **Activity** — Runtime/task audit log with captured dispatch metadata, stdout/stderr tails, and SSE updates.
- **Runtime Health** — Settings badges for Hermes/OpenClaw CLI availability, gateway state, and required runtime configuration.

---

## Prerequisites

- Node.js v24+
- pnpm v10+
- Hermes CLI and/or [OpenClaw](https://github.com/openclaw/openclaw), depending on which runtime providers you want to use

---

## Setup

```bash
# Clone
git clone <repo-url>
cd hawkbot-mission-control

# Install dependencies (includes compiling better-sqlite3)
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env if you want OpenClaw gateway integration or a custom database/workspace path
```

### Environment variables

```env
# Optional OpenClaw Gateway integration
OPENCLAW_GATEWAY_ENABLED=false
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789
OPENCLAW_GATEWAY_TOKEN=your-token-here

# SQLite database path
DATABASE_PATH=./data/mission-control.db

# OpenClaw workspace path
WORKSPACE_PATH=/Users/your-user/.openclaw/workspace
```

---

## Running

```bash
# Dev (port 4000)
pnpm dev
# → http://localhost:4000

# Production build
pnpm build

# Preview build
pnpm preview

# Run in production with PM2
pm2 start "pnpm preview" --name mission-control
```

---

## Structure

```
hawkbot-mission-control/
├── app/
│   ├── pages/              # Routes: tasks, calendar, memory, team, office, activity, content
│   ├── composables/
│   │   └── useEventStream.ts # SSE composable (singleton EventSource, ref-counted)
│   ├── components/
│   │   ├── tasks/          # TaskCard, TaskCreateModal
│   │   └── NavItem.vue     # Sidebar navigation item
│   ├── layouts/
│   │   └── default.vue     # Layout with sidebar
│   └── plugins/
│       └── vue-query.ts    # TanStack Query setup
├── server/
│   ├── api/
│   │   ├── tasks/          # CRUD for tasks (GET, POST, PATCH, DELETE)
│   │   ├── calendar/       # Cron/scheduled jobs
│   │   ├── memory/         # .md workspace file browser
│   │   ├── team/           # Agents (team members)
│   │   ├── runtimes/       # Runtime health probes
│   │   └── activity/       # Activity log + SSE stream
│   ├── db/
│   │   ├── schema.ts       # Drizzle schema (tasks, content, team, activity)
│   │   └── index.ts        # SQLite connection + automatic migrations
│   ├── plugins/
│   │   ├── startup.ts      # Initialization: connects gateway, seeds team
│   │   └── autoWatcher.ts  # 5-min sweeper for undispatched todo tasks
│   └── utils/
│       ├── gateway.ts      # Optional OpenClaw WebSocket client + SSE broadcast
│       ├── runtimeHealth.ts # Hermes/OpenClaw availability probes
│       ├── runtimes/       # Runtime adapters for Hermes, OpenClaw, manual agents
│       ├── dispatcher.ts   # Event-driven task dispatch with output capture
│       └── seed.ts         # Default team seeding (humans + agents)
├── data/                   # SQLite database (gitignored)
├── .env.example
└── nuxt.config.ts
```

---

## Default Team (auto-seeded)

| Member | Type | Role | Runtime | Specialties |
|--------|------|------|---------|-------------|
| 👤 Eduardo | human | owner | manual | Management, review, planning |
| 🦅 HawkBot - Hermes | agent | assistant | Hermes | Orchestration, planning, memory |
| 🦅 HawkBot - OpenClaw | agent | assistant | OpenClaw | Orchestration, planning, memory |

---

## Docker *(coming soon)*

```bash
docker compose up -d
```

---

## Roadmap

- [x] Tasks Board (Kanban)
- [x] Calendar (cron jobs sync)
- [x] Memory browser (workspace .md files)
- [x] Team view (agents)
- [x] Office view (gamified)
- [x] Live Feed / Activity page (SSE + audit log)
- [x] Runtime health badges for Hermes and OpenClaw
- [x] Dispatch observability (duration, exit code, stdout/stderr tails)
- [x] Task output drawer for review/debugging
- [x] Agent busy/idle usage and success stats
- [x] Drag-and-drop on Kanban (SortableJS via vue-draggable-plus)
- [x] SSE-driven dashboard updates (replaced polling)
- [x] Event-driven agent dispatch (immediate dispatch + 5-min sweeper fallback)
- [x] Human vs Agent member types (auto-dispatch only for agents)
- [ ] Content Pipeline (Phase 2)
- [ ] Telegram notifications on task move (Phase 2)
- [ ] Docker Compose (Phase 3)

---

*Part of the [Mission Control](https://x.com/AlexFinn/status/2024169334344679783) project — inspired by Alex Finn (@AlexFinn)*
