# CLAUDE.md — HawkBot Mission Control

## Project Overview

Agent management dashboard for orchestrating AI agents (OpenClaw). Built with Nuxt 4, it provides a Kanban task board, team roster, memory browser, calendar, and live activity feed.

## Tech Stack

- **Framework:** Nuxt 4 (Vue 3 Composition API + Nitro server)
- **UI:** Nuxt UI v4, TailwindCSS v4
- **State/Data:** TanStack Vue Query (client caching/polling), Pinia (store-ready)
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Realtime:** WebSocket client (ws) + SSE broadcast
- **Drag & Drop:** vue-draggable-plus (SortableJS)
- **Language:** TypeScript (strict)
- **Package Manager:** pnpm (>=10) — do NOT use npm or yarn
- **Node.js:** >=24 (see .nvmrc)

## Commands

```bash
pnpm dev          # Start dev server on port 4000
pnpm build        # Production build
pnpm preview      # Preview production build
pnpm lint         # ESLint check
pnpm typecheck    # TypeScript validation
```

Always run `pnpm lint` and `pnpm typecheck` after making changes to verify correctness.

## Project Structure

```
app/                  # Frontend (Nuxt 4 app dir)
  pages/              # Route pages (tasks, team, memory, calendar, office, content)
  components/         # Reusable Vue components (PascalCase)
  layouts/            # Layout wrappers (default.vue with sidebar)
  plugins/            # Client plugins (vue-query setup)
  assets/css/         # TailwindCSS + custom styles
server/               # Backend (Nitro)
  api/                # REST endpoints (method-suffixed: index.get.ts, [id].patch.ts)
  db/                 # Drizzle schema + SQLite connection
  plugins/            # Server startup (gateway, seeding)
  utils/              # Gateway WebSocket client, SSE broadcast, seed data
```

## Coding Conventions

### Vue Components
- Always use `<script setup lang="ts">` — no Options API
- Props: `defineProps<T>()` with TypeScript interfaces
- Emits: `defineEmits<{ (e: 'name', payload: Type): void }>()`
- Reactive state: `ref()`, `reactive()`, `computed()`
- Component files: **PascalCase** (e.g., `TaskCard.vue`, `TaskCreateModal.vue`)

### TypeScript
- Strict typing everywhere — no `any` unless absolutely unavoidable
- Define interfaces for all data shapes
- Use Drizzle's type inference for database types

### Styling
- Use Nuxt UI components and TailwindCSS utility classes
- Theme colors: primary=green, neutral=slate (configured in `app.config.ts`)
- Font: Public Sans (loaded in `main.css`)

### ESLint Rules
- No trailing commas (`commaDangle: 'never'`)
- One True Brace Style (`braceStyle: '1tbs'`)
- All rules from `@nuxt/eslint` apply

### Formatting
- 2-space indentation
- LF line endings
- UTF-8 charset
- Trim trailing whitespace (except .md files)
- Insert final newline

### API Endpoints
- Files named with HTTP method suffix: `index.get.ts`, `index.post.ts`, `[id].patch.ts`
- Use Drizzle ORM for all database queries — no raw SQL
- Log mutations to `activityLog` table and broadcast via SSE
- Return JSON responses; arrays stored as JSON strings in SQLite

### Data Fetching (Client)
- Use TanStack Vue Query (`useQuery`, `useMutation`) for data fetching with polling
- Use `$fetch()` for imperative calls (in event handlers, modals)
- Default poll interval: 10 seconds

## Database

SQLite database at `./data/mission-control.db` (gitignored). Schema in `server/db/schema.ts`. Migrations run automatically on startup. Tables: `tasks`, `content_items`, `team_members`, `activity_log`.

## Environment Variables

Copy `.env.example` to `.env`. Key variables:
- `OPENCLAW_GATEWAY_URL` — WebSocket URL for OpenClaw gateway
- `OPENCLAW_GATEWAY_TOKEN` — Auth token (from `~/.openclaw/openclaw.json`)
- `DATABASE_PATH` — SQLite database file path
- `WORKSPACE_PATH` — OpenClaw workspace directory

## Key Patterns

- **Gateway:** WebSocket client auto-connects on startup with 5s reconnect; all messages broadcast to SSE clients
- **Seeding:** 5 default agents seeded on first run (idempotent)
- **Kanban DnD:** Local state synced from server → diff on drop → PATCH changed tasks → refetch
- **Activity Feed:** Every mutation logs to `activityLog` + SSE broadcast for real-time updates
