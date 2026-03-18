# HawkBot Mission Control — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-17
**Author:** HawkBot (AI Product Architect)
**Status:** Draft

---

## Table of Contents

1. [Vision & Positioning](#1-vision--positioning)
2. [Target Users](#2-target-users)
3. [Distribution Model](#3-distribution-model)
4. [Setup Flow](#4-setup-flow)
5. [Core Features](#5-core-features)
6. [Multi-Agent Architecture](#6-multi-agent-architecture)
7. [Agent Configuration](#7-agent-configuration)
8. [OpenClaw Integration](#8-openclaw-integration)
9. [Data Model](#9-data-model)
10. [API Design](#10-api-design)
11. [UI/UX Specification](#11-uiux-specification)
12. [Technical Architecture](#12-technical-architecture)
13. [Phase Roadmap](#13-phase-roadmap)
14. [Non-Goals](#14-non-goals)
15. [Success Metrics](#15-success-metrics)
16. [Appendix: Current State Analysis](#appendix-current-state-analysis)

---

## 1. Vision & Positioning

### What is Mission Control?

Mission Control is a **local-first web dashboard** that gives OpenClaw users a visual command center for their multi-agent AI system. It replaces the experience of managing agents through scattered terminal windows, config files, and memory of cron schedules with a single, real-time interface.

### The Problem

OpenClaw is powerful but headless. Users who run multiple specialized agents face these pain points:

1. **No visibility** — You can't see what your agents are doing right now without tailing logs or asking them.
2. **No coordination** — Assigning tasks to specific agents means crafting prompts manually and tracking outcomes in your head.
3. **No memory overview** — Agent memory files accumulate without any browsable interface. You have to `cat` files to see what your agents remember.
4. **No schedule overview** — Cron jobs are defined in config but there's no consolidated calendar view of what runs when.
5. **No team management** — Adding, configuring, or monitoring agents requires editing `openclaw.json` directly.

### The Position

Mission Control is the **official dashboard layer for OpenClaw multi-agent setups**. It is not a replacement for OpenClaw — it's the GUI that OpenClaw doesn't ship. Think of it as Portainer to Docker, or Grafana to Prometheus: a visualization and coordination layer that makes the underlying system accessible to humans.

### Core Value Proposition

> "See everything. Dispatch anything. From one screen."

- **See** what every agent is doing in real time
- **Assign** tasks via a Kanban board that auto-dispatches to agents
- **Browse** agent memory files without touching the terminal
- **View** all scheduled jobs in a calendar
- **Configure** your agent team through a UI instead of JSON files

---

## 2. Target Users

### Primary: OpenClaw Power Users

People who already run OpenClaw and want to scale from one agent to multiple specialized agents. They are comfortable with terminal but prefer a dashboard for oversight.

**Profile:**
- Technical (developers, sysadmins, AI enthusiasts)
- Running OpenClaw on macOS or Linux (local machine or VPS)
- Have 2-6 agents configured or want to set up a multi-agent system
- Value visibility and coordination over automation

### Secondary: OpenClaw Newcomers Seeking Multi-Agent

People who heard about multi-agent setups and want a guided way to configure and manage them. Mission Control serves as the "friendly front door" to OpenClaw's agent system.

### Anti-Persona: Non-Technical Users

Mission Control assumes the user can install Node.js, run CLI commands, and understand what an AI agent is. It is not a no-code platform.

---

## 3. Distribution Model

### Chosen Model: npm Package + `npx` Launcher

Mission Control ships as an **npm package** that users install globally or run via `npx`. This is the simplest distribution path for the target audience (Node.js developers already running OpenClaw on Node).

```bash
# One-command launch (downloads + runs)
npx hawkbot-mission-control

# Or install globally
npm install -g hawkbot-mission-control
mission-control
```

### Why npm over alternatives

| Option | Verdict | Reason |
|--------|---------|--------|
| **npm package** | ✅ Chosen | Target users already have Node.js. Zero friction. Single command. |
| Template repo (clone) | ❌ Rejected | Forces git clone workflow. Users don't need to edit source. Updates require manual pulls. |
| Docker | ✅ Phase 3 add-on | Good for VPS deployments. Too heavy for local dev. Offered as alternative, not primary. |
| OpenClaw plugin | ❌ Premature | OpenClaw doesn't have a plugin marketplace yet. When it does, Mission Control should be listed there. |

### Package Structure

```
hawkbot-mission-control/
├── .output/            # Pre-built Nuxt production output
├── bin/
│   └── mission-control.mjs   # CLI entry point
├── package.json
└── README.md
```

The CLI entry point:
1. Checks for OpenClaw installation (`which openclaw`)
2. Reads gateway config from `~/.openclaw/openclaw.json` (auto-detects URL + token)
3. Prompts for confirmation or lets user override via flags
4. Starts the Nitro server on port 4000 (configurable via `--port`)
5. Opens the browser

```bash
# CLI flags
mission-control                          # Auto-detect everything
mission-control --port 3000              # Custom port
mission-control --gateway ws://x:18789   # Override gateway URL
mission-control --workspace ~/my-agents  # Override workspace path
mission-control --no-open                # Don't open browser
```

### Update Path

```bash
npm update -g hawkbot-mission-control
# or
npx hawkbot-mission-control@latest
```

---

## 4. Setup Flow

### Prerequisites

1. Node.js >= 24
2. OpenClaw installed and gateway running (`openclaw gateway status` shows "running")
3. At least one agent configured in `~/.openclaw/openclaw.json`

### First Run Experience

```
$ npx hawkbot-mission-control

  🦅 HawkBot Mission Control v2.0.0

  ✔ OpenClaw gateway detected at ws://127.0.0.1:18789
  ✔ Auth token found
  ✔ Workspace: /Users/you/.openclaw/workspace
  ✔ Found 3 agents in openclaw.json

  Starting dashboard on http://localhost:4000 ...

  ✔ Ready! Opening browser...
```

### Onboarding Wizard (In-App, First Visit)

When the user opens Mission Control for the first time (no tasks, no custom team), they see a guided setup:

**Step 1: Welcome**
> "Mission Control gives you a visual command center for your OpenClaw agents. Let's get you set up."

**Step 2: Agent Discovery**
The app reads `~/.openclaw/openclaw.json` → `agents.list` and displays discovered agents:
> "We found 3 agents in your OpenClaw config. Want to import them as your team?"
> [Import All] [Customize First] [Skip — I'll set up manually]

**Step 3: First Task**
> "Create your first task and assign it to an agent. When you move it to 'To Do', Mission Control will dispatch it automatically."
> [Create a Test Task] [Skip]

**Step 4: Done**
> "You're all set. Here's what you can do: [Tasks] [Calendar] [Memory] [Team]"

### Acceptance Criteria

- [ ] `npx hawkbot-mission-control` starts the server within 10 seconds
- [ ] Auto-detects gateway URL and token from `~/.openclaw/openclaw.json`
- [ ] Falls back to environment variables if config file is missing
- [ ] Shows clear error if gateway is not running
- [ ] First-visit wizard completes in under 60 seconds
- [ ] Imported agents appear in the Team page immediately

---

## 5. Core Features

### 5.1 Tasks Board (Kanban)

**Status: Built (Phase 1) — needs generalization**

A 4-column Kanban board for managing work across agents and humans.

#### Columns

| Column | Status Key | Semantics |
|--------|-----------|-----------|
| To Do | `todo` | Queued. If assigned to an agent, auto-dispatched immediately. |
| In Progress | `in_progress` | Agent or human is working on it. |
| Review | `review` | Work complete, awaiting human review. |
| Done | `done` | Accepted. `completedAt` timestamp set. |

#### Task Properties

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | auto | Primary key |
| `title` | string | yes | Short task description |
| `description` | string | no | Detailed instructions for the agent |
| `status` | enum | yes | `todo`, `in_progress`, `review`, `done` |
| `assignee` | string | yes | Team member ID (not hardcoded name) |
| `priority` | enum | yes | `high`, `medium`, `low`, `none` |
| `tags` | string[] | no | Free-form labels |
| `sessionKey` | string | no | OpenClaw session ID tracking this task |
| `dispatchedAt` | ISO string | no | When last dispatched to an agent |
| `createdAt` | ISO string | auto | Creation timestamp |
| `updatedAt` | ISO string | auto | Last modification |
| `completedAt` | ISO string | auto | When moved to `done` |

#### Interactions

- **Drag & drop** between columns — triggers status change + auto-dispatch if moved to `todo`
- **Create task** via modal — title, description, assignee, priority, tags
- **Quick actions** on card hover — context menu with valid status transitions
- **Delete** via context menu (with confirmation)
- **Real-time updates** — SSE-driven invalidation when tasks change server-side

#### Auto-Dispatch Behavior

When a task is created with status `todo` or moved to `todo` and assigned to an agent:
1. Dispatcher checks if assignee is `memberType === 'agent'` (skips humans)
2. Moves task to `in_progress` immediately
3. Spawns `openclaw agent --session-id <id> --message "<prompt>"` as a detached child process
4. On process exit code 0: task stays `in_progress` (agent should PATCH to `review` when done)
5. On process exit non-zero: task reverts to `todo`
6. **Sweeper fallback**: Every 5 minutes, scans for `todo` tasks that weren't dispatched and dispatches them

#### Acceptance Criteria

- [ ] Drag-and-drop works across all 4 columns with visual feedback
- [ ] Tasks assigned to human members are NOT auto-dispatched
- [ ] Tasks assigned to agent members ARE auto-dispatched within 1 second of creation
- [ ] Failed dispatches revert task to `todo` with an activity log entry
- [ ] SSE updates reflect task changes within 500ms across all connected clients
- [ ] Assignee dropdown shows all team members (not hardcoded two options)

#### Gap from Current State

The current implementation hardcodes assignee to `'eduardo' | 'hawkbot'` in both the schema enum and the TaskCreateModal. This must change to a dynamic team member lookup:
- Schema: `assignee` becomes a free `text` field (foreign key to `team_members.id` by convention)
- TaskCreateModal: Fetches team members from `/api/team` and populates the assignee dropdown dynamically
- TaskCard: Displays assignee emoji + name from team member data instead of hardcoded badge

---

### 5.2 Calendar

**Status: Built (Phase 1) — basic list view**

Displays all cron jobs from the OpenClaw gateway in a unified view.

#### Data Source

Primary: `openclaw gateway call cron.list --json` (CLI invocation from server)
Fallback: `{workspace}/memory/calendar.json` (static file)

#### Current View: List

A flat list of cron jobs with:
- Job name
- Cron expression / schedule type
- Next run time
- Status (scheduled / disabled)
- Color-coded status indicator

#### Planned Enhancements (Phase 2)

- **Calendar grid view** — Month/week/day views showing cron jobs as events
- **One-time events** — Support for reminders and milestones (not just cron)
- **Create/edit cron** — Form to create new cron jobs via gateway API
- **Run history** — Show last N runs per job with success/failure indicators
- **Timezone display** — Show times in user's local timezone

#### Acceptance Criteria

- [ ] Displays all cron jobs from the gateway within 5 seconds of page load
- [ ] Shows "Gateway not connected" message when gateway is unavailable
- [ ] Refresh button re-fetches from gateway
- [ ] (Phase 2) Calendar grid renders jobs on correct dates
- [ ] (Phase 2) Creating a cron job via UI actually registers it in OpenClaw

---

### 5.3 Memory Browser

**Status: Built (Phase 1) — functional**

A visual browser for all `.md` files in the OpenClaw workspace, with search.

#### File Discovery

Scans:
1. `{workspace}/MEMORY.md` — long-term memory file
2. `{workspace}/memory/*.md` — daily memory files

#### File Categorization

| Type | Detection Rule | Emoji |
|------|---------------|-------|
| `memory` | filename is `MEMORY` | 🧠 |
| `daily` | filename matches `YYYY-MM-DD` | 📅 |
| `plan` | filename contains `plan` | 🗺️ |
| `other` | everything else | 📄 |

#### Interactions

- **Grid view** — Cards showing file name, type badge, preview (first 200 chars), modification date
- **Search** — Full-text search across all file contents (server-side filtering)
- **File viewer** — Modal with full file content (raw markdown, monospace)
- **Sorting** — MEMORY.md first, then by modification date descending

#### Planned Enhancements (Phase 2)

- **Markdown rendering** — Render markdown instead of raw text in the viewer
- **Edit capability** — Edit memory files directly from the UI
- **Multi-agent memory** — When agents have separate workspaces, browse each agent's memory
- **Diff view** — Show changes between versions of a memory file
- **Search highlighting** — Highlight search matches in results and viewer

#### Acceptance Criteria

- [ ] Lists all `.md` files from workspace root and `memory/` directory
- [ ] Search filters files in real time (debounced, server-side)
- [ ] File viewer shows complete content
- [ ] Files sorted correctly (MEMORY.md first, then by date)
- [ ] (Phase 2) Markdown rendered with proper formatting
- [ ] (Phase 2) Edits save back to the filesystem

---

### 5.4 Team Management

**Status: Built (Phase 1) — static display, hardcoded seed**

Displays the agent roster with status, model, specialties, and usage stats.

#### Current Implementation

- Team members are seeded from a hardcoded array on first startup
- Read-only display in a card grid
- Shows: emoji, name, role, model, specialties, status, usage count
- Status indicator (green pulse = busy, blue = active, gray = idle)

#### Required Changes for Distribution

The entire team management system must be redesigned:

1. **No hardcoded seed** — Remove `DEFAULT_TEAM` from `seed.ts`. Instead, on first run, import agents from `openclaw.json`
2. **CRUD operations** — Add endpoints for creating, updating, and deleting team members
3. **Agent config sync** — Two-way sync between Mission Control's team roster and OpenClaw's `agents.list` config
4. **Dynamic status** — Query gateway for real agent session status instead of relying on manual status field

#### Team Member Properties

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | UUID | Mission Control | Internal identifier |
| `name` | string | User / OpenClaw config | Display name |
| `memberType` | enum | User | `human` or `agent` |
| `emoji` | string | User | Avatar emoji |
| `role` | string | User | Freeform role label |
| `model` | string | OpenClaw config | LLM model identifier |
| `specialties` | string[] | User | Tags describing capabilities |
| `description` | string | User | Freeform description |
| `status` | enum | Live query | `active`, `idle`, `busy` |
| `openclawAgentId` | string | OpenClaw config | Maps to `agents.list[].name` |
| `agentDir` | string | OpenClaw config | Agent workspace directory |
| `sessionId` | string | Gateway | Current active session, if any |

#### Acceptance Criteria

- [ ] First run imports agents from `openclaw.json` automatically
- [ ] User can add new team members via a creation form
- [ ] User can edit team member properties
- [ ] User can delete team members (with confirmation)
- [ ] Agent status reflects actual gateway session state
- [ ] Assignee dropdowns across the app populate from this team roster

---

### 5.5 Office View (Gamified)

**Status: Built (Phase 1) — visual only**

A fun, gamified visualization of agents "working at their desks." Agents show as emoji at workstations, with animated indicators when busy.

#### Current Implementation

- Grid of workstation cards (2-3 columns)
- Each agent has a desk with a "monitor" showing activity bars when busy
- Busy agents bounce and have a green ping indicator
- Idle agents show static

#### Planned Enhancements (Phase 2)

- **Current task display** — Show the task title the agent is working on
- **Activity sparkline** — Mini graph of recent activity (tasks completed per day)
- **Click to expand** — Click an agent to see their full profile, current task, and recent activity
- **Sound effects** — Optional notification sounds when agents complete tasks

#### Acceptance Criteria

- [ ] All team members appear in the office grid
- [ ] Busy agents show clear visual distinction from idle ones
- [ ] (Phase 2) Current task title visible on busy agent's "monitor"

---

### 5.6 Live Activity Feed

**Status: Built (Phase 1) — server-side complete, no dedicated UI page**

A real-time event stream powered by Server-Sent Events (SSE).

#### Architecture

```
OpenClaw Gateway ──WebSocket──► Nitro Server ──SSE──► Browser
                                     │
                              Activity Log DB
```

Every mutation (task CRUD, agent status change) is:
1. Written to the `activity_log` table
2. Broadcast to all connected SSE clients
3. Used by the frontend to invalidate TanStack Query caches

#### Current Events

| Event Type | Trigger |
|------------|---------|
| `task_created` | New task via POST |
| `task_updated` | Task field change via PATCH |
| `task_completed` | Task moved to `done` |
| `task_deleted` | Task removed via DELETE |
| `connected` | SSE client first connects |

#### Planned: Dedicated Activity Page (Phase 2)

A full-page activity timeline showing:
- All events in reverse chronological order
- Filterable by actor, event type, date range
- Clickable task references
- Gateway events (cron runs, agent sessions)

#### Acceptance Criteria

- [ ] SSE connection established within 2 seconds of page load
- [ ] Reconnects automatically after disconnection (5s backoff)
- [ ] Singleton pattern — only one EventSource per browser tab
- [ ] Ref-counted cleanup — EventSource closes when no components are listening
- [ ] (Phase 2) Activity page shows last 100 events with infinite scroll

---

### 5.7 Content Pipeline

**Status: Placeholder (Phase 2)**

A Kanban-style pipeline for content creation workflows (blog posts, videos, social media).

#### Stages

| Stage | Description |
|-------|-------------|
| Idea | Raw concept or topic |
| Script | Written draft / outline |
| Thumbnail | Visual assets created |
| Filming | Recording in progress |
| Editing | Post-production |
| Published | Live on platforms |

#### Schema (already defined)

The `content_items` table already exists in the schema with fields for title, stage, script, thumbnail path, platforms, and timestamps.

#### Acceptance Criteria

- [ ] Kanban board with 6 columns matching content stages
- [ ] Create content item with title and initial stage
- [ ] Drag between stages
- [ ] Assign to team members for each stage
- [ ] Track target platforms (YouTube, Twitter, Blog, etc.)
- [ ] Link to published URLs

---

## 6. Multi-Agent Architecture

### OpenClaw Agent Model

OpenClaw supports multiple agents via the `agents.list` configuration in `~/.openclaw/openclaw.json`:

```json
{
  "agents": {
    "list": [
      {
        "name": "dev",
        "model": "anthropic/claude-sonnet-4-6",
        "agentDir": "~/.openclaw/agents/dev",
        "tools": ["exec", "read", "write", "edit", "web_search"]
      },
      {
        "name": "research",
        "model": "anthropic/claude-sonnet-4-6",
        "agentDir": "~/.openclaw/agents/research",
        "tools": ["web_search", "web_fetch", "read", "write"]
      }
    ]
  }
}
```

Each agent has:
- **Isolated workspace** — Its own `agentDir` with separate SOUL.md, MEMORY.md, skills
- **Own model** — Can use different LLMs for different roles
- **Own tools** — Tool access can be restricted per agent
- **Session isolation** — Runs in its own session context

### Orchestration Pattern

Mission Control implements a **hub-and-spoke orchestration** model:

```
                    ┌─────────────────────┐
                    │   Mission Control   │
                    │    (Dashboard)      │
                    └──────────┬──────────┘
                               │ HTTP/SSE
                    ┌──────────┴──────────┐
                    │   Nitro Server      │
                    │   (Orchestrator)    │
                    └──────────┬──────────┘
                               │ WebSocket
                    ┌──────────┴──────────┐
                    │  OpenClaw Gateway   │
                    └──┬──────┬──────┬────┘
                       │      │      │
                    ┌──┴──┐ ┌─┴──┐ ┌─┴──┐
                    │ Dev │ │Res │ │Ops │  Agents
                    └─────┘ └────┘ └────┘
```

1. **User creates a task** in Mission Control (via Kanban)
2. **Dispatcher** checks if assignee is an agent
3. If yes, **spawns** `openclaw agent --session-id <id> --message "<prompt>"`
4. Agent works in its own session, using its own tools and workspace
5. When done, agent **calls back** via `curl -X PATCH http://localhost:4000/api/tasks/<id>` to move the task to `review`
6. **SSE** broadcasts the status change to the dashboard
7. Human reviews and moves to `done` (or back to `in_progress`)

### Shared Space Pattern

Since OpenClaw doesn't natively support a shared filesystem across agents, Mission Control uses a **filesystem convention**:

```
~/.openclaw/
├── workspace/           # Main agent (HawkBot) workspace
│   ├── shared/          # ← Shared space convention
│   │   ├── specs/       # Requirements, PRDs, contracts
│   │   ├── outputs/     # Agent deliverables
│   │   └── context/     # Cross-agent context files
│   ├── MEMORY.md
│   └── memory/
├── agents/
│   ├── dev/             # Dev agent workspace
│   │   ├── SOUL.md
│   │   └── MEMORY.md
│   ├── research/
│   └── ops/
```

**Rules:**
- The `shared/` directory lives in the main agent's workspace
- All agents have read access to `shared/` (via tools like `read`)
- Agents write outputs to `shared/outputs/{agent-name}/`
- Mission Control can browse `shared/` in the Memory page
- Cross-agent context (e.g., "Research Agent, here are the requirements from Dev Agent") is passed via the dispatcher prompt, which includes relevant shared files

### Task Dispatch Protocol

When Mission Control dispatches a task to an agent, the prompt includes:

```
New task from Mission Control:

📋 Agent: 💻 Dev Agent
🎯 Specialties: javascript, nuxt, typescript, node

**Build the user settings page**
Add a /settings page with profile editing, theme toggle, and notification preferences.

When finished: curl -X PATCH http://localhost:4000/api/tasks/{id} \
  -H "Content-Type: application/json" \
  -d '{"status":"review"}'
```

This protocol is critical — the agent must know:
1. What to do (task title + description)
2. Its identity and specialties (context for self-orientation)
3. How to signal completion (HTTP callback)

---

## 7. Agent Configuration

### Current Problem

The current codebase hardcodes a `DEFAULT_TEAM` array in `seed.ts` with Eduardo's specific agents. This is unusable for any other OpenClaw user.

### Solution: Config-Driven Agent Import

#### Phase 1: Import from openclaw.json

On first run, Mission Control reads `~/.openclaw/openclaw.json` and imports agents:

```typescript
// Pseudo-code for agent import
const openclawConfig = JSON.parse(readFileSync('~/.openclaw/openclaw.json'));
const agents = openclawConfig.agents?.list || [];

for (const agent of agents) {
  // Create team member from OpenClaw agent config
  db.insert(teamMembers).values({
    id: uuidv4(),
    name: agent.name,
    memberType: 'agent',
    emoji: inferEmoji(agent.name), // 💻 for "dev", 🔍 for "research", etc.
    role: inferRole(agent.name),
    model: agent.model,
    specialties: JSON.stringify(agent.tools || []),
    description: `Imported from openclaw.json`,
    openclawAgentId: agent.name,
    agentDir: agent.agentDir,
    status: 'idle',
    createdAt: new Date().toISOString()
  });
}

// Also add the current user as a human member
db.insert(teamMembers).values({
  id: uuidv4(),
  name: os.userInfo().username,
  memberType: 'human',
  emoji: '👤',
  role: 'owner',
  model: null,
  specialties: JSON.stringify(['management', 'review']),
  description: 'Project owner',
  status: 'active',
  createdAt: new Date().toISOString()
});
```

#### Phase 2: UI-Driven Agent Creation

A form in the Team page lets users:
1. Define a new agent (name, role, model, specialties)
2. Mission Control generates the `agents.list` entry
3. Optionally writes back to `openclaw.json` (with user confirmation)
4. Creates the agent's workspace directory with template SOUL.md

#### Phase 3: Agent Templates

Pre-built agent templates users can one-click install:

| Template | Role | Model | Tools | SOUL.md |
|----------|------|-------|-------|---------|
| Fullstack Dev | developer | claude-sonnet | exec, read, write, edit, web_search | Coding-focused personality |
| Researcher | researcher | claude-sonnet | web_search, web_fetch, read, write | Analysis-focused personality |
| Writer | writer | claude-sonnet | read, write, web_search | Content-focused personality |
| Ops/DevOps | operator | claude-haiku | exec, read, write | Automation-focused personality |
| Custom | — | user choice | user choice | Blank template |

---

## 8. OpenClaw Integration

### Gateway WebSocket Connection

Mission Control maintains a persistent WebSocket connection to the OpenClaw Gateway.

#### Connection Lifecycle

```
Startup → Connect(ws://gateway:18789, Bearer token)
  ├─ on open  → Log "Connected ✅"
  ├─ on message → JSON parse → Broadcast to SSE clients
  ├─ on error → Log error
  └─ on close → Reconnect after 5 seconds
```

#### Authentication

Token source priority:
1. `OPENCLAW_GATEWAY_TOKEN` environment variable
2. `~/.openclaw/openclaw.json` → `gateway.auth.token`
3. No token (local connections may not require auth)

#### Gateway API Usage

| Operation | Method | Purpose |
|-----------|--------|---------|
| Cron list | `openclaw gateway call cron.list` | Calendar page data |
| Agent dispatch | `openclaw agent --session-id X --message Y` | Task auto-dispatch |
| Session list | (Phase 2) `openclaw gateway call sessions.list` | Live agent status |
| Cron create | (Phase 2) `openclaw gateway call cron.create` | Calendar management |

### agents.list Config Integration

#### Read Path (current)

Mission Control reads `openclaw.json` to discover agents during setup/import.

#### Write Path (Phase 2)

When a user creates a new agent via Mission Control's UI:
1. Mission Control generates the agent config object
2. Reads current `openclaw.json`
3. Appends to `agents.list`
4. Writes back (after user confirmation dialog)
5. Signals gateway to reload config (if supported)

### Session Routing

Each dispatched task uses `openclaw agent --session-id <MAIN_SESSION_ID>`. This is currently hardcoded to a single session ID.

#### Phase 2: Per-Agent Sessions

Each agent gets its own session ID, allowing:
- Independent conversation threads
- Session-specific memory
- Concurrent dispatches without conflicts

```typescript
// Generate stable session ID from agent name
const sessionId = uuidv5(agent.openclawAgentId, MISSION_CONTROL_NAMESPACE);
```

---

## 9. Data Model

### Entity Relationship

```
┌──────────────┐       ┌──────────────┐
│ team_members │◄──────│    tasks     │
│              │  1:N   │              │
│ id (PK)      │       │ id (PK)      │
│ name         │       │ title        │
│ memberType   │       │ description  │
│ emoji        │       │ status       │
│ role         │       │ assignee ──────► team_members.id
│ model        │       │ priority     │
│ specialties  │       │ tags []      │
│ description  │       │ sessionKey   │
│ status       │       │ dispatchedAt │
│ agentDir     │       │ createdAt    │
│ openclawId   │       │ updatedAt    │
│ currentTask  │       │ completedAt  │
│ usageCount   │       └──────┬───────┘
│ successCount │              │
│ createdAt    │              │
└──────────────┘              │
                              │
┌──────────────┐              │
│ activity_log │◄─────────────┘
│              │       task_id (FK)
│ id (PK)      │
│ type         │
│ actor        │
│ message      │
│ taskId       │
│ metadata {}  │
│ createdAt    │
└──────────────┘

┌───────────────┐
│ content_items │  (Phase 2)
│               │
│ id (PK)       │
│ title         │
│ stage         │
│ script        │
│ thumbnailPath │
│ platforms []  │
│ assignee      │
│ createdAt     │
│ updatedAt     │
│ publishedAt   │
└───────────────┘
```

### Schema Changes Required for Distribution

#### team_members (additions)

```sql
ALTER TABLE team_members ADD COLUMN openclaw_agent_id TEXT;  -- maps to agents.list[].name
ALTER TABLE team_members ADD COLUMN agent_dir TEXT;           -- workspace directory path
```

#### tasks (changes)

```sql
-- Remove enum constraint on assignee, make it a plain text field
-- referencing team_members.id instead of hardcoded names
```

#### settings (new table — Phase 2)

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Used for:
- `gateway.url` — WebSocket URL
- `gateway.token` — Auth token
- `workspace.path` — Workspace directory
- `onboarding.completed` — Whether setup wizard ran
- `dispatch.main_session_id` — Session ID for dispatching
- `ui.theme` — Theme preference

---

## 10. API Design

### Existing Endpoints

#### Tasks

| Method | Path | Purpose | Request Body | Response |
|--------|------|---------|-------------|----------|
| GET | `/api/tasks` | List all tasks | Query: `?status=todo&assignee=X` | `Task[]` |
| POST | `/api/tasks` | Create task | `{ title, description?, assignee?, priority?, tags? }` | `Task` |
| PATCH | `/api/tasks/:id` | Update task | `{ title?, description?, status?, assignee?, priority?, tags? }` | `Task` |
| PUT | `/api/tasks/:id` | Update task (alias) | Same as PATCH | `Task` |
| DELETE | `/api/tasks/:id` | Delete task | — | `{ success: true }` |

#### Team

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/api/team` | List all members | `TeamMember[]` |

#### Calendar

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/api/calendar` | List cron jobs | `{ events: CalendarEvent[], lastSync: string }` |

#### Memory

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/api/memory` | List memory files | `MemoryFile[]` |
| | | Query: `?q=search&content=true` | |

#### Activity

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| GET | `/api/activity` | List recent activity | `ActivityLog[]` (last 50) |
| GET | `/api/activity/stream` | SSE event stream | `text/event-stream` |

### New Endpoints Required

#### Team CRUD (Phase 1 completion)

| Method | Path | Purpose | Request Body |
|--------|------|---------|-------------|
| POST | `/api/team` | Create member | `{ name, memberType, emoji, role, model, specialties, description }` |
| PATCH | `/api/team/:id` | Update member | Partial `TeamMember` fields |
| DELETE | `/api/team/:id` | Delete member | — |

#### Settings (Phase 2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/settings` | Get all settings |
| PATCH | `/api/settings` | Update settings `{ key: value, ... }` |

#### Agent Operations (Phase 2)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/agents/import` | Import agents from openclaw.json |
| POST | `/api/agents/:id/dispatch` | Manually dispatch a prompt to an agent |
| GET | `/api/agents/:id/sessions` | List agent sessions from gateway |

#### Content Pipeline (Phase 2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/content` | List content items |
| POST | `/api/content` | Create content item |
| PATCH | `/api/content/:id` | Update content item |
| DELETE | `/api/content/:id` | Delete content item |

#### Health & Status (Phase 2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Server health + gateway connection status |
| GET | `/api/status` | Dashboard summary (task counts, agent statuses, next cron) |

---

## 11. UI/UX Specification

### Design System

- **Framework:** Nuxt UI v4 (built on Radix Vue + TailwindCSS v4)
- **Theme:** Dark mode only (gray-950 background)
- **Colors:** Primary = green, Neutral = slate
- **Font:** Public Sans
- **Icons:** Lucide (via @iconify-json/lucide)

### Layout

```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐ ┌──────────────────────────────────┐│
│ │ Sidebar  │ │        Main Content              ││
│ │ (60px w) │ │                                   ││
│ │          │ │                                   ││
│ │ 🦅 Logo  │ │  (Page content rendered here)    ││
│ │          │ │                                   ││
│ │ 📋 Tasks │ │                                   ││
│ │ 📅 Cal   │ │                                   ││
│ │ 🎬 Cont  │ │                                   ││
│ │ 🧠 Mem   │ │                                   ││
│ │ 👥 Team  │ │                                   ││
│ │ 🏢 Office│ │                                   ││
│ │          │ │                                   ││
│ │ ● Live   │ │                                   ││
│ └──────────┘ └──────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

- **Sidebar:** Fixed left, 240px wide, dark gray-900 background
- **Logo:** Top of sidebar — emoji + "Mission Control" + instance name
- **Navigation:** Icon + label links with active state highlighting (primary color background)
- **Live indicator:** Bottom of sidebar — green dot + "Gateway connected" (or red + "Disconnected")
- **Main content:** Scrollable, padded (24px), gray-950 background

### Page Specifications

#### Tasks Page (`/tasks`)

**Header:** "Tasks Board" title + task count + "New Task" button

**Body:** Horizontal 4-column Kanban layout
- Columns: To Do, In Progress, Review, Done
- Each column: emoji header, label, count badge, droppable area
- Cards: priority dot, assignee badge, title, description preview (2-line clamp), tags, creation date
- Empty column: "No tasks" placeholder
- Drag: ghost opacity 40%, slight rotation on drag, scale 105% on chosen

**Interactions:**
- Click "New Task" → modal with form
- Drag card between columns → PATCH status
- Hover card → context menu button appears
- Click context menu → status transitions + delete option

#### Team Page (`/team`)

**Header:** "Team" title + member count + busy count

**Body:** Responsive card grid (1/2/3 columns)
- Each card: emoji avatar (large), name, role, status dot + label, description, specialty badges, model + usage stats footer
- Status: green pulse = busy, blue = active, gray = idle

**Phase 2 additions:**
- "Add Member" button
- Click card → edit modal
- Delete button (with confirmation)
- "Import from OpenClaw" button

#### Calendar Page (`/calendar`)

**Header:** "Calendar" title + "Sync" refresh button

**Body:** List of cron jobs
- Each row: status dot, job name, cron expression, next run time, status badge
- Empty state: calendar-off icon + "No scheduled jobs found"

**Phase 2 additions:**
- Toggle between list and calendar grid view
- Month/week/day navigation
- Click job → detail panel with run history

#### Memory Page (`/memory`)

**Header:** "Memory" title + file count + search input

**Body:** 2-column card grid
- Each card: type emoji, filename, type badge, preview text (2-line clamp), modification date
- Click card → modal with full content

**Modal:** File name header, close button, monospace text content, scroll for long files

**Phase 2 additions:**
- Rendered markdown (not raw)
- Edit button in modal
- Save changes
- Agent memory tabs (browse per-agent memory)

#### Office Page (`/office`)

**Header:** "Office" title + "Live view of your agents"

**Body:** Grid floor with workstation cards
- Background: subtle grid pattern (5% opacity lines)
- Each workstation: bordered card, agent emoji (bouncing if busy), "monitor" div with activity bars or "idle" text, name, status
- Busy agents: green border glow, ping indicator, animated bars in monitor

#### Content Pipeline Page (`/content`) — Phase 2

**Header:** "Content Pipeline" title + "New Content" button

**Body:** 6-column Kanban (same pattern as Tasks)
- Columns: Idea → Script → Thumbnail → Filming → Editing → Published
- Cards: title, target platforms, assignee, dates

#### Settings Page (`/settings`) — Phase 2

**Sections:**
- **Gateway:** URL, token (masked), connection status, test button
- **Workspace:** Path, browse button
- **Team:** Import from OpenClaw button, export config
- **Appearance:** (future) Theme, language

#### Activity Page (`/activity`) — Phase 2

**Header:** "Activity" title + filter controls

**Body:** Reverse-chronological timeline
- Each entry: timestamp, actor emoji + name, action description, optional task link
- Filters: by actor, by event type, date range
- Infinite scroll (load 50 at a time)

---

## 12. Technical Architecture

### Stack Decisions

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Nuxt 4 | Full-stack (client + server) in one project. SSR-capable. File-based routing. |
| **UI Library** | Nuxt UI v4 | Native Nuxt integration. Radix Vue primitives. Built-in dark mode. TailwindCSS included. |
| **Data Fetching** | TanStack Vue Query | Cache management, polling intervals, SSE-driven invalidation. Superior to raw `useFetch` for dynamic data. |
| **State** | Pinia | Available but minimally used — TanStack Query handles most state. Pinia reserved for UI-only state (modals, drag state). |
| **Database** | SQLite + Drizzle ORM | Local-first, zero-config, single-file database. Drizzle provides type-safe queries. No external DB required. |
| **SQLite Driver** | better-sqlite3 | Synchronous API (simpler than async alternatives). WAL mode for concurrent reads. |
| **Realtime** | WebSocket (ws) + SSE | WS for gateway communication (bidirectional). SSE for client broadcast (simple, HTTP-native, auto-reconnect). |
| **Drag & Drop** | vue-draggable-plus | SortableJS wrapper for Vue 3. Mature, lightweight, good touch support. |
| **Package Manager** | pnpm | Faster, disk-efficient, strict dependency resolution. |

### Tradeoffs

1. **SQLite vs PostgreSQL:** SQLite limits Mission Control to single-node deployments. This is intentional — Mission Control is a local tool, not a cloud service. If multi-user becomes a goal, PostgreSQL migration via Drizzle is straightforward (schema is the same).

2. **SSE vs WebSocket (client):** SSE is simpler and auto-reconnects. The client only needs to receive events, never send. If bidirectional client communication is needed later, Nitro's experimental WebSocket support can be used.

3. **better-sqlite3 vs libsql:** better-sqlite3 requires native compilation (node-gyp). This causes friction on some systems. Phase 3 should evaluate migrating to libsql (Turso's fork) which ships pre-built binaries and supports HTTP replication.

4. **Monolith vs Microservices:** Mission Control is a monolith by design. The server, database, and client ship as one unit. Splitting would add complexity without benefit for a local tool.

### Build & Deployment

```bash
# Development
pnpm dev                    # Nuxt dev server on :4000

# Production (current)
pnpm build                  # Produces .output/
node .output/server/index.mjs  # Or: pnpm preview

# Production (npm package, Phase 2)
# Pre-built .output/ ships inside the npm package
# CLI entry point starts the Nitro server directly
```

### Directory Structure (target)

```
hawkbot-mission-control/
├── app/
│   ├── pages/
│   │   ├── index.vue          # Redirect to /tasks
│   │   ├── tasks.vue          # Kanban board
│   │   ├── calendar.vue       # Cron calendar
│   │   ├── content.vue        # Content pipeline
│   │   ├── memory.vue         # Memory browser
│   │   ├── team.vue           # Team roster
│   │   ├── office.vue         # Gamified view
│   │   ├── activity.vue       # Activity timeline (Phase 2)
│   │   └── settings.vue       # Settings (Phase 2)
│   ├── components/
│   │   ├── TaskCard.vue
│   │   ├── TaskCreateModal.vue
│   │   ├── TeamMemberCard.vue      # (Phase 2)
│   │   ├── TeamMemberModal.vue     # (Phase 2)
│   │   ├── OnboardingWizard.vue    # (Phase 2)
│   │   ├── NavItem.vue
│   │   └── AppLogo.vue
│   ├── composables/
│   │   └── useEventStream.ts
│   ├── layouts/
│   │   └── default.vue
│   ├── plugins/
│   │   └── vue-query.ts
│   └── assets/css/
│       └── main.css
├── server/
│   ├── api/
│   │   ├── tasks/             # CRUD
│   │   ├── team/              # CRUD (Phase 2: POST, PATCH, DELETE)
│   │   ├── calendar/          # GET
│   │   ├── memory/            # GET
│   │   ├── activity/          # GET + SSE stream
│   │   ├── content/           # CRUD (Phase 2)
│   │   ├── settings/          # GET + PATCH (Phase 2)
│   │   ├── agents/            # Import + dispatch (Phase 2)
│   │   └── health/            # GET (Phase 2)
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts
│   ├── plugins/
│   │   ├── startup.ts
│   │   └── autoWatcher.ts
│   └── utils/
│       ├── gateway.ts
│       ├── dispatcher.ts
│       ├── seed.ts            # Replaced by config-driven import
│       └── openclaw-config.ts # (Phase 2) Read/write openclaw.json
├── bin/
│   └── mission-control.mjs   # CLI entry point (Phase 2)
├── docs/
│   └── PRD.md                 # This document
├── data/                      # SQLite database (gitignored)
├── .env.example
├── nuxt.config.ts
└── package.json
```

---

## 13. Phase Roadmap

### Phase 1: Foundation (Current — v1.0)

**Status: 85% complete**

What exists:
- ✅ Tasks Kanban with drag-and-drop
- ✅ Auto-dispatch to agents
- ✅ SSE real-time updates
- ✅ Calendar (cron list view)
- ✅ Memory browser with search
- ✅ Team roster (read-only)
- ✅ Office gamified view
- ✅ Activity logging
- ✅ Gateway WebSocket connection
- ✅ SQLite + Drizzle ORM
- ✅ TanStack Query data fetching

What's missing to complete Phase 1:
- [ ] **Remove hardcoded assignees** — Make assignee a dynamic field referencing team_members
- [ ] **Dynamic TaskCreateModal** — Fetch team members for assignee dropdown
- [ ] **Dynamic TaskCard** — Display assignee from team member data
- [ ] **Config-driven seed** — Import agents from `openclaw.json` instead of hardcoded array
- [ ] **Team CRUD endpoints** — POST, PATCH, DELETE for team members
- [ ] **Team management UI** — Add/edit/delete members in the Team page

**Milestone:** Any OpenClaw user can clone the repo, configure `.env`, run `pnpm dev`, and manage their own agents.

### Phase 2: Distribution & Polish (v2.0)

**Timeline: 4-6 weeks after Phase 1**

| Feature | Priority | Effort |
|---------|----------|--------|
| npm package with CLI launcher | P0 | 1 week |
| First-run onboarding wizard | P0 | 3 days |
| Auto-detect gateway config | P0 | 2 days |
| Settings page | P1 | 3 days |
| Activity page (dedicated timeline) | P1 | 3 days |
| Markdown rendering in memory viewer | P1 | 2 days |
| Memory file editing | P1 | 3 days |
| Content pipeline (basic Kanban) | P2 | 1 week |
| Calendar grid view | P2 | 1 week |
| Agent config write-back to openclaw.json | P2 | 3 days |
| Per-agent session IDs | P2 | 2 days |
| Health endpoint + status dashboard widget | P2 | 2 days |

**Milestone:** `npx hawkbot-mission-control` works out of the box. First-time users complete setup in under 2 minutes.

### Phase 3: Scale & Community (v3.0)

**Timeline: 8-12 weeks after Phase 2**

| Feature | Priority | Effort |
|---------|----------|--------|
| Docker Compose deployment | P1 | 1 week |
| Agent templates (one-click role setup) | P1 | 1 week |
| Shared space browser UI | P1 | 3 days |
| Multi-agent memory browsing | P2 | 1 week |
| Notification integrations (Telegram, Discord) | P2 | 1 week |
| Task dependencies (blocked-by) | P2 | 3 days |
| Task templates / recurring tasks | P2 | 3 days |
| libsql migration (drop node-gyp requirement) | P2 | 3 days |
| Plugin system for custom pages | P3 | 2 weeks |
| OpenClaw plugin marketplace listing | P3 | 1 week |

**Milestone:** Mission Control is the recommended way to manage multi-agent OpenClaw setups. Featured in OpenClaw documentation.

---

## 14. Non-Goals

Mission Control explicitly does **NOT** aim to be:

1. **A chat interface** — It does not provide a conversational UI for interacting with agents. That's what Discord, Telegram, and the terminal are for. Mission Control is for oversight and coordination, not conversation.

2. **A code editor** — It does not embed Monaco/CodeMirror for editing code. Agents have their own workspaces and tools for that.

3. **A model playground** — It does not let you test prompts or compare model outputs. Use Claude.ai, OpenRouter, or dedicated tools for that.

4. **A cloud service** — It runs locally on the user's machine. There is no hosted version, no user accounts, no multi-tenant architecture. One instance = one user.

5. **An OpenClaw replacement** — It depends on OpenClaw. It doesn't duplicate gateway functionality or implement its own agent runtime.

6. **A general-purpose project management tool** — It's not Jira, Linear, or Trello. It's specifically for AI agent coordination. Features like sprints, story points, or team velocity are out of scope.

7. **A monitoring/observability platform** — It shows agent status and activity, but it's not Datadog. No metrics aggregation, no alerting rules, no historical analytics beyond the activity log.

8. **Multi-user/multi-tenant** — One Mission Control instance serves one user. There's no login system, no role-based access control, no shared dashboards. If two people want Mission Control, they each run their own instance.

---

## 15. Success Metrics

### Adoption Metrics

| Metric | Target (6 months) | Measurement |
|--------|-------------------|-------------|
| npm weekly downloads | 100+ | npm registry stats |
| GitHub stars | 200+ | GitHub API |
| Active issues/PRs from community | 10+ | GitHub |
| Forks | 20+ | GitHub |

### Usage Metrics (per-instance, opt-in telemetry)

| Metric | Healthy Signal | Source |
|--------|---------------|--------|
| Tasks created per week | ≥ 5 | SQLite query |
| Tasks dispatched to agents | ≥ 3/week | Activity log |
| Active agents | ≥ 2 | Team table |
| Dashboard open time | ≥ 30 min/day | Client-side (Phase 3) |
| SSE connection uptime | ≥ 95% | Server-side |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first task dispatched (new user) | < 5 minutes | Onboarding flow timing |
| `npx` cold start time | < 15 seconds | CI benchmark |
| Page load time | < 2 seconds | Lighthouse |
| Dispatch latency (task created → agent spawned) | < 3 seconds | Activity log timestamps |
| SSE event delivery | < 500ms | Client-side measurement |
| Zero critical bugs in production | 0 P0 bugs open | GitHub issues |

### Qualitative Success

- OpenClaw documentation links to Mission Control as the recommended dashboard
- Users create blog posts or tweets about their multi-agent setups using Mission Control
- At least one community contribution (feature PR, not just bug fixes)
- Eduardo uses it daily for his own multi-agent workflow without reaching for the terminal

---

## Appendix: Current State Analysis

### What's Built and Working

| Component | Status | Quality |
|-----------|--------|---------|
| Kanban board | ✅ Complete | Good — drag-and-drop works, SSE invalidation, priority badges |
| Auto-dispatch | ✅ Complete | Good — immediate dispatch + 5-min sweeper fallback |
| Gateway WebSocket | ✅ Complete | Good — auto-reconnect, SSE bridge |
| SSE composable | ✅ Complete | Excellent — singleton, ref-counted, clean lifecycle |
| Activity logging | ✅ Complete | Good — all mutations logged |
| Calendar (list) | ✅ Complete | Basic — reads cron jobs from gateway CLI |
| Memory browser | ✅ Complete | Good — search, file viewer, categorization |
| Team display | ✅ Complete | Read-only — no CRUD |
| Office view | ✅ Complete | Fun — animated workstations |
| Database layer | ✅ Complete | Good — WAL mode, auto-migrations, Drizzle ORM |
| Content pipeline | ❌ Placeholder | Schema exists, UI is "Coming Phase 2" |

### Critical Gaps for Distribution

1. **Hardcoded identities**: Assignee is `'eduardo' | 'hawkbot'` — must become dynamic team member references
2. **Hardcoded team seed**: `DEFAULT_TEAM` in `seed.ts` contains Eduardo's specific agents — must be replaced with config-driven import
3. **No Team CRUD**: Can't add, edit, or delete team members via UI or API
4. **No settings management**: Gateway URL, token, workspace path only configurable via `.env` — needs a settings page
5. **No onboarding**: New users get a blank dashboard with no guidance
6. **No npm packaging**: Can't install via `npx` — requires cloning the repo
7. **Hardcoded session ID**: `MAIN_SESSION_ID` in `dispatcher.ts` is a UUID literal — must be configurable
8. **Hardcoded dispatch prompt language**: Prompt is partially in Portuguese ("Agente", "Especialidades") — should be English by default
9. **No health check**: No way to verify gateway connection status from the UI beyond the sidebar indicator

### Code Quality Assessment

- **TypeScript strictness**: Good — strict typing, interfaces defined, minimal `any`
- **Component quality**: Good — Composition API, proper props/emits, clean templates
- **API design**: Consistent — method-suffixed files, Drizzle ORM, JSON responses
- **Error handling**: Basic — try/catch in gateway, no user-facing error messages
- **Testing**: None — no unit tests, no integration tests, no e2e tests
- **Documentation**: Good — README.md and CLAUDE.md are comprehensive

### Recommended Priority for Closing Gaps

1. **P0**: Remove hardcoded assignees (schema + TaskCreateModal + TaskCard)
2. **P0**: Config-driven agent import (replace seed.ts)
3. **P0**: Team CRUD endpoints + UI
4. **P1**: Settings page + configurable session ID
5. **P1**: npm package with CLI launcher
6. **P1**: Onboarding wizard
7. **P2**: Content pipeline
8. **P2**: Calendar grid view
9. **P3**: Docker Compose
10. **P3**: Agent templates

---

## Implementation Checklist (Ralph Loop)

> This checklist is designed for autonomous agent execution via a Ralph loop.
> Each item is atomic, implementable independently, and ends with a commit.
> Run `ralph-once.sh` to pick the next unchecked item, implement it, commit, and update `progress.txt`.

### Phase 1 — Make It Distributable (P0/P1)

- [ ] **P0-1**: Remove hardcoded assignee enum from schema
  - `server/db/schema.ts`: change `assignee` from `'eduardo' | 'hawkbot'` to `text('assignee')` referencing `team.id`
  - `server/api/tasks/index.get.ts`: update query joins
  - `app/components/tasks/TaskCreateModal.vue`: replace hardcoded options with dynamic team fetch
  - `app/components/tasks/TaskCard.vue`: update assignee display to use team member name/avatar

- [ ] **P0-2**: Replace hardcoded DEFAULT_TEAM seed with config-driven import
  - `server/utils/seed.ts`: read `~/.openclaw/openclaw.json`, parse `agents.list` + `identity` fields
  - Fall back to a minimal default (one human "owner" + one "assistant" agent) if config not found
  - Re-seed only if team table is empty; never overwrite existing records

- [ ] **P0-3**: Add Team CRUD API endpoints
  - `server/api/team/index.post.ts`: create team member (name, type, role, model, specialties, agentId)
  - `server/api/team/[id].patch.ts`: update team member fields
  - `server/api/team/[id].delete.ts`: soft-delete (set `active = false`)
  - Validate: `type` must be `human | agent`; `agentId` must be unique if provided

- [ ] **P0-4**: Add Team management UI
  - New page `app/pages/team/index.vue`: list all team members with edit/delete actions
  - Modal `app/components/team/TeamMemberModal.vue`: form for create/edit
  - Integrate with TanStack Query (invalidate on mutation)

- [ ] **P1-1**: Create Settings page
  - `app/pages/settings/index.vue`: form with Gateway URL, Gateway Token, Workspace Path, Main Session ID
  - `server/api/settings/index.get.ts` + `index.patch.ts`: read/write to a `settings` table in SQLite
  - On save, validate gateway connectivity (ping `/api/health` on the gateway)
  - `server/db/schema.ts`: add `settings` table (`key text PK`, `value text`, `updatedAt`)

- [ ] **P1-2**: Make MAIN_SESSION_ID configurable
  - `server/utils/dispatcher.ts`: replace hardcoded UUID with a lookup to `settings` table key `main_session_id`
  - If not set, log a warning and skip dispatch (don't fail silently)

- [ ] **P1-3**: Fix hardcoded Portuguese in dispatch prompt
  - `server/utils/dispatcher.ts`: translate dispatch prompt to English
  - Make prompt template a configurable string in `settings` table (key: `dispatch_prompt_template`)

- [ ] **P1-4**: Add gateway health check indicator
  - `server/api/gateway/health.get.ts`: probe gateway WebSocket/HTTP and return `{ connected: boolean, latencyMs: number }`
  - `app/layouts/default.vue`: replace static sidebar indicator with live poll (every 30s via TanStack Query)

- [ ] **P1-5**: Add npm package entry point and CLI launcher
  - Add `bin/hawkbot-mission-control.js` — checks Node version, copies `.env.example` if no `.env`, runs `nuxt preview` (or `nuxt dev` if `--dev` flag)
  - `package.json`: add `"bin": { "hawkbot-mission-control": "bin/hawkbot-mission-control.js" }`
  - Test: `npx hawkbot-mission-control` should start the app on port 4000

- [ ] **P1-6**: Add onboarding wizard
  - `app/pages/onboarding/index.vue`: 4-step wizard (Welcome → Connect Gateway → Configure Workspace → Meet Your Team)
  - Step 2: input Gateway URL + Token, validate live, save to settings
  - Step 3: input Workspace path, validate it exists, save to settings
  - Step 4: show auto-imported team from OpenClaw config, allow manual additions
  - Redirect to `/onboarding` on first launch (detect via empty `settings` table)

### Phase 2 — Feature Complete (P2)

- [ ] **P2-1**: Content Pipeline — database and API
  - `server/db/schema.ts`: verify `contentItems` table has all required fields (title, status, type, assigneeId, scriptUrl, thumbnailUrl, publishedUrl, metadata)
  - `server/api/content/index.get.ts` + `index.post.ts`: list and create content items
  - `server/api/content/[id].patch.ts` + `[id].delete.ts`: update status/fields, soft-delete

- [ ] **P2-2**: Content Pipeline — UI
  - `app/pages/content/index.vue`: Kanban board (Idea → Script → Thumbnail → Published)
  - Reuse `TaskCard` pattern; add content-specific fields (type badge, thumbnail preview)
  - Drag-and-drop status transitions via vue-draggable-plus (same as Tasks)

- [ ] **P2-3**: Calendar grid view
  - `app/pages/calendar/index.vue`: upgrade from list view to monthly grid (use `@fullcalendar/vue3` or build custom with CSS grid)
  - Show cron jobs as recurring events; show one-shot `at` jobs as single events
  - Click event → show cron job details (name, schedule, last run, next run)

- [ ] **P2-4**: Telegram/Discord notifications on task status change
  - `server/plugins/notifications.ts`: watch for task `status` transitions to `done` or `review`
  - Send notification via OpenClaw Gateway message API (POST to gateway `/api/message`)
  - Configurable: notification channel settable per team member in settings

### Phase 3 — Distribution Polish (P3)

- [ ] **P3-1**: Docker Compose setup
  - `docker-compose.yml`: service for `hawkbot-mission-control` with volume mounts for `~/.openclaw` and SQLite data
  - `Dockerfile`: multi-stage build (build → runtime), non-root user, health check
  - Document in README: `docker compose up -d` one-liner

- [ ] **P3-2**: Agent templates library
  - `server/data/agent-templates.ts`: array of template definitions (Fullstack Dev, System Architect, Research, Ops, Writer)
  - Each template: `{ id, name, role, model, specialties, systemPromptFile, suggestedTools }`
  - `server/api/agent-templates/index.get.ts`: return available templates
  - `app/pages/team/index.vue`: "Add from template" button in Team UI → opens template picker modal

- [ ] **P3-3**: OpenClaw config generator
  - `server/api/openclaw/export-config.get.ts`: generate `agents.list` YAML/JSON from current team table
  - `app/pages/settings/index.vue`: "Export to OpenClaw" button → downloads generated config snippet
  - Include instructions for merging into `~/.openclaw/openclaw.json`

- [ ] **P3-4**: Shared space filesystem browser
  - `server/api/shared/index.get.ts`: list files in configured shared space directory
  - `server/api/shared/[...path].get.ts`: read file content
  - `app/pages/shared/index.vue`: file tree with viewer (reuse Memory browser pattern)
  - Configurable shared space path in settings (default: `{workspace}/../shared`)

