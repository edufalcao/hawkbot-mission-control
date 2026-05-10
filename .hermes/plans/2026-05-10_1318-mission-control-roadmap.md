# Mission Control Roadmap Implementation Plan

> **For Hermes:** Use `subagent-driven-development` to implement this plan task-by-task.

**Goal:** Convert the refreshed Mission Control PRD into a concrete implementation roadmap for the next product slices.

**Architecture:** Keep Mission Control runtime-agnostic. UI pages talk to generic APIs; provider-specific execution lives in runtime adapters, health utilities, and notification helpers. Each slice should be independently testable and shippable.

**Tech Stack:** Nuxt 4, Nuxt UI, TanStack Query, Nitro APIs, SQLite/Drizzle, Vitest, Hermes/OpenClaw runtime adapters.

---

## Current Context

Repo: `/Users/eduardo/Projects/Personal/Repositories/hawkbot-mission-control`

Current baseline:

- Runtime providers exist: Hermes, OpenClaw, manual.
- Task board, team, activity, settings, runtime health, task output drawer, and Telegram lifecycle notifications exist.
- Content page exists but is placeholder-level.
- Calendar exists but is not yet a scheduler control center.
- README has at least one stale roadmap line: Telegram notifications are listed as both complete and Phase 2.
- Local convention: after major validation, remove `node_modules/` and local SQLite DB files.

Quality gates for implementation work:

```bash
pnpm install # if node_modules was cleaned
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

---

## Phase 1: Documentation and Roadmap Alignment

### Task 1: Clean README roadmap drift

**Objective:** Make README agree with the PRD and current implementation.

**Files:**

- Modify: `README.md`

**Steps:**

1. Remove stale roadmap item `Telegram notifications on task move (Phase 2)` because lifecycle notifications are already implemented.
2. Add current next-phase items:
   - Runtime health in sidebar/header.
   - Activity filters and retry dispatch.
   - Content Pipeline MVP.
   - Scheduler/Cron control surface.
   - Docker Compose.
3. Keep README concise; PRD remains the source of product detail.

**Validation:**

```bash
git diff -- README.md
```

Expected: README roadmap no longer contradicts itself.

**Commit:**

```bash
git add README.md docs/PRD.md .hermes/plans/2026-05-10_1318-mission-control-roadmap.md
git commit -m "docs: align mission control PRD and roadmap"
```

---

## Phase 2: Operational Visibility Polish

### Task 2: Add runtime health summary utility

**Objective:** Create a pure utility that converts runtime health API data into compact status badges for navigation/header UI.

**Files:**

- Create: `app/utils/runtimeStatus.ts` or `server/utils/runtimeStatus.ts` if shared server-side only.
- Test: `tests/runtimeStatus.test.ts`

**Step 1: Write failing tests**

Test cases:

- all runtimes ready => overall `ready`
- one available but missing config => overall `warning`
- one unavailable => overall `error`
- optional gateway disabled should not force `error`

Run:

```bash
pnpm test tests/runtimeStatus.test.ts
```

Expected: FAIL because utility does not exist.

**Step 2: Implement utility**

Export functions like:

```ts
export function summarizeRuntimeHealth(report: RuntimeHealthReport): RuntimeStatusSummary
```

**Step 3: Verify**

```bash
pnpm test tests/runtimeStatus.test.ts
pnpm test
```

Expected: PASS.

---

### Task 3: Show runtime health in sidebar/header

**Objective:** Make runtime readiness visible without opening Settings.

**Files:**

- Modify: `app/layouts/default.vue`
- Potentially modify/create: `app/components/RuntimeHealthBadge.vue`
- Reuse: `/api/runtimes/health`

**Steps:**

1. Add a small status area near the bottom of sidebar or top header.
2. Fetch `/api/runtimes/health` with TanStack Query or existing composable pattern.
3. Show Hermes and OpenClaw compact badges.
4. Keep Settings page as detailed view.

**Validation:**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

```bash
pnpm dev
curl -sS http://localhost:4000/api/runtimes/health
```

Expected: UI builds and health endpoint returns report.

---

### Task 4: Add retry dispatch action

**Objective:** Allow a failed/reverted task to be retried explicitly from the UI/API.

**Files:**

- Create: `server/api/tasks/[id]/retry-dispatch.post.ts`
- Modify: `app/components/OutputModal.vue` or task actions component.
- Test: pure status eligibility utility if extracted.

**Behavior:**

- Only retry tasks assigned to agents.
- Only retry tasks not currently dispatching.
- PATCH or POST should move task to `todo` and call dispatcher.
- Activity log should record manual retry.

**Validation:**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

1. Create an agent task.
2. Force runtime unavailable or use a bad runtime command.
3. Confirm failure/revert.
4. Click retry after fixing config.
5. Confirm dispatch happens again.

---

## Phase 3: Activity and Notification Hardening

### Task 5: Add activity filters

**Objective:** Let user filter Activity by type, actor, and task ID.

**Files:**

- Modify: `server/api/activity/index.get.ts`
- Modify: `app/pages/activity.vue`
- Test: optional query parsing utility.

**API behavior:**

Support query params:

- `type`
- `actor`
- `taskId`
- `limit`

**Validation:**

```bash
curl -sS 'http://localhost:4000/api/activity?type=agent_completed&limit=10'
pnpm lint
pnpm typecheck
```

---

### Task 6: Log notification delivery attempts

**Objective:** Make Telegram notification attempts visible in Activity.

**Files:**

- Modify: `server/utils/notifications.ts`
- Modify: call sites in `dispatcher.ts` and `server/api/tasks/[id].patch.ts` if DB logging is passed there.
- Potentially update schema enum for activity types.
- Test: notification formatting remains pure; delivery wrapper can be thin.

**Behavior:**

- Record `notification_sent` when spawn starts successfully.
- Record `notification_failed` on spawn error.
- Do not log message content if it could contain sensitive data; log task ID/event/provider.

**Validation:**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Smoke:

1. Enable notifications.
2. Move task to review.
3. Confirm Telegram message.
4. Confirm Activity includes notification attempt.

---

## Phase 4: Content Pipeline MVP

### Task 7: Add content item API CRUD

**Objective:** Turn existing `content_items` schema into usable APIs.

**Files:**

- Create: `server/api/content/index.get.ts`
- Create: `server/api/content/index.post.ts`
- Create: `server/api/content/[id].patch.ts`
- Create: `server/api/content/[id].delete.ts`
- Test: extracted validation utility if practical.

**Behavior:**

- List content items sorted by updated date.
- Create item with title and default `idea` stage.
- Patch title, stage, script, thumbnailPath, platforms, publishedAt.
- Delete item.
- Log activity for create/update/delete.

**Validation:**

```bash
curl -sS http://localhost:4000/api/content
pnpm lint
pnpm typecheck
pnpm build
```

---

### Task 8: Build content Kanban UI

**Objective:** Replace placeholder Content page with a stage-based board.

**Files:**

- Modify: `app/pages/content.vue`
- Create: `app/components/ContentCard.vue`
- Create: `app/components/ContentCreateModal.vue`

**Stages:**

- Idea
- Script
- Thumbnail
- Filming
- Editing
- Published

**Behavior:**

- Display cards by stage.
- Create new item.
- Drag/drop stage transitions.
- Edit script/platform fields in modal or drawer.

**Validation:**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

1. Create content item.
2. Move through stages.
3. Refresh page and confirm persisted state.

---

### Task 9: Link content items to agent tasks

**Objective:** Let a content item spawn related tasks for agents.

**Files:**

- Modify schema if adding `relatedTaskId` or create link table.
- Modify content UI.
- Reuse task creation endpoint.

**Behavior:**

- From content item, create task like “Draft script for X”.
- Link resulting task ID to content item.
- Show task status on content card.

**Validation:**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

1. Create content item.
2. Generate script task.
3. Confirm task appears on Tasks board and link is visible from content item.

---

## Phase 5: Scheduler and Briefing Control

### Task 10: Add scheduler source abstraction

**Objective:** Prepare Calendar to show Hermes cron jobs and optional OpenClaw jobs behind one interface.

**Files:**

- Create: `server/utils/schedulerSources.ts`
- Modify: `server/api/calendar/index.get.ts`
- Test: `tests/schedulerSources.test.ts`

**Behavior:**

- Normalize jobs into common shape:
  - id
  - name
  - schedule
  - status
  - source
  - nextRunAt
  - deliver target if available

**Validation:**

```bash
pnpm test tests/schedulerSources.test.ts
pnpm test
```

---

### Task 11: Add scheduler actions

**Objective:** Allow pause/resume/run for supported scheduler sources.

**Files:**

- Create: `server/api/calendar/jobs/[id]/run.post.ts`
- Create: `server/api/calendar/jobs/[id]/pause.post.ts`
- Create: `server/api/calendar/jobs/[id]/resume.post.ts`
- Modify: Calendar UI.

**Behavior:**

- Actions are source-aware.
- Unsupported actions are disabled with explanation.
- Activity records action attempts.

**Validation:**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

1. List jobs.
2. Run a safe test job.
3. Confirm action result and activity record.

---

## Phase 6: Deployment and Packaging

### Task 12: Add Docker Compose

**Objective:** Provide reproducible local deployment.

**Files:**

- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create/modify: `.dockerignore`
- Modify: `README.md`

**Requirements:**

- Runs Nuxt production build.
- Persists SQLite `data/` volume.
- Supports env vars for database path and gateway config.
- Documents host CLI runtime limitation: Hermes/OpenClaw CLIs must be available inside container or dispatch must be disabled/manual.

**Validation:**

```bash
docker compose build
docker compose up -d
curl -I http://localhost:4000/tasks
docker compose down
```

---

## Final Integration Review

After completing any phase:

1. Run full quality gates.
2. Inspect `git diff --stat`.
3. Smoke test the changed workflow.
4. Commit with a focused message.
5. Push to `origin/main`.
6. If local cleanup is desired:

```bash
rm -rf node_modules data/mission-control.db data/mission-control.db-shm data/mission-control.db-wal .output
git status --short
```

---

## Recommended Next Slice

Start with **Phase 1 / Task 1** immediately because it is low-risk and aligns documentation with reality.

Then implement **Phase 2 / Task 2 and Task 3** because runtime health visibility is the highest-value UX improvement after task output and Telegram notifications.
