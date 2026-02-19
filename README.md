# 🦅 HawkBot Mission Control

> Agent management dashboard for OpenClaw — Tasks, Calendar, Memory, Team, and Office in a single interface.

Built with **Nuxt 4** + **Nuxt UI** + **TanStack Query** + **SQLite/Drizzle ORM**, connected to the **OpenClaw Gateway** via WebSocket.

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
| Realtime | WebSocket → OpenClaw Gateway + SSE |

---

## Features

- **Tasks Board** — Kanban with 4 columns: To Do, In Progress, Review, Done. Assignee per agent or user.
- **Calendar** — Visualization of all cron jobs from the OpenClaw Gateway.
- **Memory** — Visual browser for all memory files in the workspace (`.md`), with search.
- **Team** — Agent roster with real-time status, model, specialties, and stats.
- **Office** — Gamified view of agents working at their desktops.
- **Content Pipeline** — *(Phase 2)* Content creation pipeline: Idea → Script → Thumbnail → Published.
- **Live Feed** — Real-time event stream via SSE connected to the Gateway.

---

## Prerequisites

- Node.js v24+
- pnpm v10+
- [OpenClaw](https://github.com/openclaw/openclaw) installed and gateway running

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
# Edit .env with your gateway URL and token
```

### Environment variables

```env
# OpenClaw Gateway URL (WebSocket)
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789

# Gateway authentication token
# Found at: ~/.openclaw/openclaw.json → gateway.auth.token
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
│   ├── pages/              # Routes: tasks, calendar, memory, team, office, content
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
│   │   ├── calendar/       # Gateway cron jobs
│   │   ├── memory/         # .md workspace file browser
│   │   ├── team/           # Agents (team members)
│   │   └── activity/       # Activity log + SSE stream
│   ├── db/
│   │   ├── schema.ts       # Drizzle schema (tasks, content, team, activity)
│   │   └── index.ts        # SQLite connection + automatic migrations
│   ├── plugins/
│   │   └── startup.ts      # Initialization: connects gateway, seeds team
│   └── utils/
│       ├── gateway.ts      # WebSocket client + SSE broadcast
│       └── seed.ts         # Default agent seeding
├── data/                   # SQLite database (gitignored)
├── .env.example
└── nuxt.config.ts
```

---

## Default Agents (auto-seeded)

| Agent | Role | Model | Specialties |
|-------|------|-------|-------------|
| 🦅 HawkBot | assistant | claude-sonnet | Orchestration, planning, memory |
| 💻 Dev Agent | developer | claude-sonnet | JS, Nuxt, TypeScript, Node |
| 🔍 Research Agent | researcher | claude-sonnet | Web search, analysis, summarization |
| ⚙️ Ops Agent | operator | claude-sonnet | Cron, monitoring, infra, automation |
| ✍️ Writer Agent | writer | claude-sonnet | Docs, reports, posts, scripts |

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
- [x] Live Feed (SSE)
- [ ] Content Pipeline (Phase 2)
- [ ] Drag-and-drop on Kanban (Phase 2)
- [ ] Telegram notifications on task move (Phase 2)
- [ ] Docker Compose (Phase 3)

---

*Part of the [Mission Control](https://x.com/AlexFinn/status/2024169334344679783) project — inspired by Alex Finn (@AlexFinn)*
