# Mission Control Next Attack Plan

> **For Hermes:** Use `subagent-driven-development` to implement this plan task-by-task after Eduardo approves the next slice.

**Goal:** Continue evolving HawkBot Mission Control after the runtime health sidebar milestone, prioritizing operational usefulness before large new surfaces.

**Current baseline:**

- Latest committed app milestone: `4c943e9 feat: show runtime health in sidebar`.
- PRD v2 and roadmap exist in `docs/PRD.md` and `.hermes/plans/2026-05-10_1318-mission-control-roadmap.md`.
- Built: runtime adapters, task board, team, activity page, task output drawer, Telegram lifecycle notifications, runtime health cards/sidebar badges.
- Pending: retry dispatch, activity filters, notification delivery logging, content pipeline MVP, scheduler/cron control, Docker Compose.

**Quality gates:**

```bash
pnpm install # if node_modules was cleaned
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

---

## Product Priority

The next evolution should optimize for this order:

1. **Operational control** — can Eduardo recover from failures and understand what happened?
2. **Observability** — are task/runtime/notification events searchable and explainable?
3. **Workflow expansion** — can Mission Control manage content and scheduled automations?
4. **Reliability/deployment** — can it run predictably outside dev mode?

This means the next best work is not Content Pipeline yet. First we should finish the task-control loop.

---

## Recommended Next Slice: Retry Dispatch + Activity Filters

### Why this slice

Runtime health and output inspection are now visible. The next missing operational action is: when a task fails or is reverted, Eduardo should be able to retry it intentionally and then inspect the attempt in Activity.

### Deliverables

1. `POST /api/tasks/:id/retry-dispatch`
2. Retry action in task output drawer or task actions.
3. Activity log entry for manual retry.
4. Activity API filters: `type`, `actor`, `taskId`, `limit`.
5. Activity UI filters for common debugging flows.

### Acceptance Criteria

- Retry is available only for agent-assigned tasks.
- Retry is blocked for tasks already dispatching.
- Retry records Activity metadata with task ID, actor, provider, and reason.
- Activity page can filter to a task or event type.
- Full gates pass.

---

## Phase A: Retry Dispatch API

### Task A1: Extract retry eligibility utility

**Objective:** Make retry rules testable before wiring the API.

**Files:**

- Create: `server/utils/taskRetry.ts`
- Test: `tests/taskRetry.test.ts`

**Behavior:**

- Human tasks are not retryable.
- Tasks currently dispatching are not retryable.
- Agent tasks in `todo`, `review`, or failed/reverted states are retryable.
- `in_progress` tasks are not retryable unless explicitly forced in a later feature.

**Validation:**

```bash
pnpm test tests/taskRetry.test.ts
pnpm test
```

---

### Task A2: Add retry dispatch endpoint

**Objective:** Create explicit API endpoint for manual retry.

**Files:**

- Create: `server/api/tasks/[id]/retry-dispatch.post.ts`
- Modify if needed: `server/utils/dispatcher.ts`

**Behavior:**

- Load task and assignee.
- Validate retry eligibility.
- Write Activity entry: `Task "X" manually retried`.
- Set status to `todo` or call dispatch directly using existing dispatch path.
- Return updated task.

**Validation:**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

1. Start dev server.
2. Create an agent task with bad runtime config or temporarily unavailable runtime.
3. Confirm failure/revert.
4. POST retry endpoint.
5. Confirm Activity includes retry and dispatcher attempts again.

---

### Task A3: Add retry action to output drawer

**Objective:** Make retry discoverable where Eduardo already inspects failures.

**Files:**

- Modify: `app/components/OutputModal.vue` or current task output modal component.
- Potentially modify: `app/components/TaskCard.vue` if quick action is desired.

**Behavior:**

- Show Retry button when task is agent-assigned and not busy.
- Button calls retry endpoint.
- Refresh task/output queries after success.
- Show disabled/explained state when retry is unavailable.

**Validation:**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

---

## Phase B: Activity Filters

### Task B1: Add activity query parsing utility

**Objective:** Keep filters safe and testable.

**Files:**

- Create: `server/utils/activityFilters.ts`
- Test: `tests/activityFilters.test.ts`

**Behavior:**

- Accept `type`, `actor`, `taskId`, `limit`.
- Clamp limit, e.g. max 200.
- Ignore/validate unknown values safely.

**Validation:**

```bash
pnpm test tests/activityFilters.test.ts
pnpm test
```

---

### Task B2: Wire filters into Activity API

**Objective:** Support filtered Activity retrieval.

**Files:**

- Modify: `server/api/activity/index.get.ts`

**Behavior:**

- Query by type, actor, taskId.
- Respect limit.
- Keep default behavior unchanged: latest 50.

**Validation:**

```bash
curl -sS 'http://localhost:4000/api/activity?type=agent_completed&limit=10'
curl -sS 'http://localhost:4000/api/activity?taskId=<task-id>'
pnpm lint
pnpm typecheck
```

---

### Task B3: Add Activity UI filters

**Objective:** Let Eduardo debug from the Activity page without curl/logs.

**Files:**

- Modify: `app/pages/activity.vue`

**UI controls:**

- Type dropdown.
- Actor text/search input.
- Task ID input.
- Limit dropdown.
- Clear filters button.

**Validation:**

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Manual smoke:

1. Open Activity.
2. Filter by `task_updated` or `agent_completed`.
3. Filter by a task ID from a task output drawer.
4. Clear filters.

---

## Phase C: Notification Delivery Logging

### Task C1: Record notification delivery attempts

**Objective:** Make Telegram notification behavior visible in Activity.

**Files:**

- Modify: `server/utils/notifications.ts`
- Modify call sites in dispatcher/task patch if DB context is needed.
- Potentially update activity type enum if strict enough.

**Behavior:**

- Record attempt when notification spawn starts.
- Record failure on spawn error.
- Do not log full message body unless reviewed for secrets.
- Include event, taskId, provider, and notification command metadata.

**Validation:**

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Smoke:

1. Enable notifications.
2. Move a task to review.
3. Confirm Telegram message.
4. Confirm Activity shows notification attempt.

---

## Phase D: PRD / Roadmap Maintenance

After Phases A-C:

- Update `docs/PRD.md` Current State and Roadmap.
- Update `.hermes/plans/2026-05-10_1318-mission-control-roadmap.md` or supersede it.
- Update `mission-control-prd` skill if new conventions emerge.

---

## Phase E: Next Big Feature After Operational Polish

Once retry/filter/logging are done, choose between:

### Option 1: Content Pipeline MVP

Best if the next product goal is creator workflow.

Build:

- Content API CRUD.
- Content Kanban.
- Stage transitions.
- Link content item to task.

### Option 2: Scheduler / Morning Briefing Control

Best if the next product goal is autonomous daily operations.

Build:

- Hermes cron listing.
- Delivery target display.
- Run/pause/resume actions.
- Morning briefing configuration.

### Recommendation

Do **Scheduler / Morning Briefing Control** before full Content Pipeline if the priority is making HawkBot useful every day. Do **Content Pipeline** first if the priority is building the public-facing/content creation product surface.

---

## Suggested Execution Order

1. Retry dispatch API.
2. Retry action in output drawer.
3. Activity API filters.
4. Activity UI filters.
5. Notification delivery logging.
6. PRD/roadmap cleanup.
7. Pick Content Pipeline or Scheduler.

This is the cleanest next attack path because it closes the operational loop before expanding the app surface area.
