# HawkBot Mission Control — Product Requirements Document

**Version:** 2.0
**Date:** 2026-05-10
**Owner:** Eduardo Falcão Lima
**Author:** HawkBot / Hermes
**Status:** Active product draft
**Repository:** `~/Projects/Personal/Repositories/hawkbot-mission-control`

---

## 1. Executive Summary

HawkBot Mission Control is a local-first command center for supervising and dispatching work across human users and AI agents. It began as an OpenClaw dashboard and is now evolving into a runtime-agnostic orchestration layer for Hermes, OpenClaw, and manual/human work.

The core product promise:

> See every agent, dispatch every task, inspect every result, and keep the human in control.

Mission Control should make AI-agent work operationally safe: every dispatch is visible, every output is inspectable, every runtime has health status, and every important lifecycle transition can notify Eduardo through Telegram.

---

## 2. Product Vision

### 2.1 What Mission Control Is

Mission Control is a personal AI operations dashboard for managing a small team of specialized agents and human tasks. It provides:

- A task board for assigning and tracking work.
- Runtime adapters for Hermes, OpenClaw, and manual members.
- Agent roster and status visibility.
- Activity logs and task output inspection.
- Runtime health checks.
- Calendar/memory/content pipeline surfaces.
- Telegram lifecycle alerts for important events.

### 2.2 What Mission Control Is Not

Mission Control is not:

- A replacement for Hermes or OpenClaw.
- A generic no-code automation product.
- A model router or model selection UI.
- A SaaS-first multi-tenant system.
- A hidden autonomous system that works without audit trails.

The system should stay local-first, explicit, observable, and operator-friendly.

---

## 3. Target Users

### 3.1 Primary User: Eduardo / Personal AI Operator

The immediate target user is Eduardo: a technical operator who uses AI agents for software development, automation, research, planning, and personal workflows.

Needs:

- Dispatch coding/planning/research tasks quickly.
- Know what each agent is doing.
- Review outputs without digging through terminal logs.
- Keep the dashboard lightweight and local.
- Receive proactive Telegram alerts when attention is needed.

### 3.2 Secondary User: Technical Agent Power User

A future target user is a developer running Hermes/OpenClaw locally who wants a GUI for agent orchestration.

Assumptions:

- Comfortable with Node.js, CLI tools, local env files, and git.
- Wants visibility more than heavy abstraction.
- Accepts local-first setup and self-hosted operation.

### 3.3 Anti-Persona

Mission Control is not initially for non-technical users who expect hosted onboarding, billing, team permissions, or zero-config agent creation.

---

## 4. Product Principles

1. **Runtime-agnostic orchestration**
   Tasks, activity, output, and UI should not be coupled to one runtime. Hermes, OpenClaw, and manual execution are providers behind adapters.

2. **Human review is first-class**
   Agent completion should usually move work to `review`, not straight to `done`.

3. **Observability over magic**
   Every dispatch should capture provider, command display, duration, exit code/error, stdout tail, stderr tail, and activity logs.

4. **Runtime config owns model choice**
   Mission Control should not pass per-agent model overrides. Hermes/OpenClaw profiles and defaults own model/provider selection.

5. **Telegram-safe communication**
   Messages sent to Telegram should use conservative Markdown: headings, bold labels, plain bullets, no tables, no blockquotes.

6. **Local-first and private**
   Data lives in local SQLite/files unless explicitly configured otherwise. Secrets are never displayed or logged.

7. **Small, testable slices**
   New behavior should be extracted into pure utilities where practical and tested with Vitest before UI/API wiring.

---

## 5. Current State

### 5.1 Built

- Nuxt 4 app with Nuxt UI and Tailwind.
- SQLite/Drizzle local database.
- Tasks Kanban with statuses: `todo`, `in_progress`, `review`, `done`.
- Human vs agent team members.
- Runtime providers: `hermes`, `openclaw`, `manual`.
- Runtime adapter boundary for dispatch.
- Hermes/OpenClaw runtime health endpoint and Settings cards.
- Activity log table and `/activity` page with filters by event type, actor, task ID, and limit.
- SSE-driven dashboard updates.
- Dispatcher output capture: duration, stdout/stderr tails, error/exit metadata.
- Task output drawer/modal with retry dispatch action for eligible agent tasks.
- Agent busy/idle state, usage count, success count.
- Telegram lifecycle notification utility, Settings toggles, and Activity logging for queued/failed notification attempts.
- Calendar, Memory, Office, Team, and placeholder Content pages.
- Vitest coverage for output summarization, notification formatting/metadata, activity filters, and retry eligibility.

### 5.2 Known Gaps

- Content Pipeline is mostly placeholder.
- Calendar is not yet a full scheduler management UI.
- Notifications currently send via Hermes prompt indirection; direct gateway targeting may be useful later.
- Local development cleanup removes `node_modules` and DB after major validation, so smoke-test task IDs are ephemeral.
- Docker Compose is not implemented.
- PRD and roadmap have historically lagged behind the actual implementation.

---

## 6. Core Workflows

### 6.1 Task Dispatch Workflow

1. User creates a task or moves a task to `todo`.
2. Mission Control checks whether the assignee is human or agent.
3. Human tasks stay queued for manual work.
4. Agent tasks move to `in_progress` immediately.
5. Dispatcher resolves the assignee runtime provider.
6. Runtime adapter builds a safe spawn plan: `command` + `args`, not shell string.
7. Mission Control spawns the runtime process.
8. Runtime output is captured and bounded.
9. Agent marks task `review` through API callback when finished.
10. User reviews captured output and moves task to `done` or back to work.

Acceptance criteria:

- Agent tasks dispatch within 1 second of entering `todo`.
- Human tasks never auto-dispatch.
- Failed dispatches revert to `todo` and emit activity.
- Successful runtime completion records an `agent_completed` activity entry.
- Output drawer shows newest runtime output for the task.

### 6.2 Review Workflow

1. User opens Tasks page.
2. User sees cards in Review column.
3. User clicks a task card.
4. Output drawer shows task details, runtime metadata, stdout/stderr, and timeline.
5. User accepts by moving to `done`, or sends back to `todo`/`in_progress` with updated instructions.

Acceptance criteria:

- Review queue is visually obvious.
- Inspecting a task requires one click.
- stdout/stderr empty state is clear.
- Task status transition updates through SSE without page reload.

### 6.3 Notification Workflow

1. User enables Telegram notifications in Settings.
2. User enables per-event toggles: review, failure, done.
3. Mission Control sends Telegram-safe messages for enabled events.
4. Message includes task title, assignee, runtime, and inspect URL.

Acceptance criteria:

- Notifications are disabled by default.
- Review/failure toggles default to enabled once global notifications are enabled.
- Done toggle defaults to disabled to avoid noise.
- Messages contain no Markdown tables or pipe characters.
- Failures include useful error detail without secrets.

### 6.4 Runtime Health Workflow

1. User opens Settings or future sidebar runtime status.
2. Mission Control probes Hermes and OpenClaw CLI availability.
3. OpenClaw gateway/session configuration is reported without leaking tokens.
4. UI shows ready, needs config, or unavailable state.

Acceptance criteria:

- Disabled optional gateway is not treated as fatal.
- Missing CLI is clearly explained.
- No config secrets are displayed.
- Health refresh is available manually and periodically.

---

## 7. Feature Areas

### 7.1 Tasks

Purpose: central board for work orchestration.

Must support:

- Create, edit, delete tasks.
- Drag/drop status transitions.
- Human/agent assignees.
- Priority and tags.
- Auto-dispatch for agents.
- Output inspection.
- Review-first lifecycle.

Future enhancements:

- Comments/activity inline on task drawer.
- Retry dispatch button.
- Duplicate task.
- Task templates.
- Blocks/dependencies.
- GitHub issue/PR references.

### 7.2 Team

Purpose: roster of humans and AI agents.

Must support:

- Human and agent member types.
- Runtime provider per agent: Hermes, OpenClaw, manual.
- Runtime profile/command/workdir metadata.
- Current task and status.
- Usage and success stats.
- CRUD endpoints.

Future enhancements:

- Agent templates.
- Direct test-dispatch button per agent.
- Runtime capability badges.
- Per-agent recent activity timeline.

### 7.3 Activity

Purpose: audit trail for system behavior.

Must support:

- Recent activity page.
- Event type, actor, message, taskId, metadata, createdAt.
- Runtime metadata display.
- SSE broadcasting.

Future enhancements:

- Filters by task/actor/type/date.
- Deep links to task output drawer.
- Infinite scroll.
- Export logs.

### 7.4 Runtime Health

Purpose: make runtime readiness obvious.

Must support:

- Hermes CLI probe.
- OpenClaw CLI probe.
- Gateway/session configuration status.
- Settings cards.

Future enhancements:

- Sidebar badges.
- Header warning banner when selected runtime is unavailable.
- One-click smoke tests.

### 7.5 Calendar

Purpose: view scheduled automation and upcoming work.

Current role:

- Calendar surface for cron/scheduled jobs.

Future enhancements:

- Hermes cron integration.
- OpenClaw cron integration where available.
- Create/edit/pause/resume jobs from UI.
- Run history and failure alerts.
- Topic/channel delivery awareness.

### 7.6 Memory

Purpose: browse local memory/workspace markdown files.

Future enhancements:

- Hermes memory awareness.
- Agent-specific workspaces.
- Render markdown.
- Diff view.
- Safe editing with backups.

### 7.7 Content Pipeline

Purpose: manage content creation workflows from idea to publication.

Target stages:

- Idea
- Script
- Thumbnail
- Filming
- Editing
- Published

Future enhancements:

- Assign stage owners.
- Generate briefs/scripts with agents.
- Store asset paths and published URLs.
- Trigger content tasks from pipeline cards.

### 7.8 Office

Purpose: gamified status overview.

Future enhancements:

- Show current task title.
- Show last completion time.
- Click agent to open profile/activity.
- Optional sound/visual completion cues.

---

## 8. Runtime Architecture

### 8.1 Provider Model

Runtime providers:

- `manual`: no process spawn, human/manual work.
- `hermes`: spawn Hermes CLI using configured profile/defaults.
- `openclaw`: spawn OpenClaw CLI and optional gateway integrations.

Mission Control owns:

- Task lifecycle.
- Dispatch prompt construction.
- Process spawning.
- Output capture.
- Activity records.
- UI state.

Runtime owns:

- Model/provider choice.
- Tool availability.
- Internal memory/session handling.
- Agent execution details.

### 8.2 Spawn Plan Contract

Runtime adapters should return:

- `command`: executable name/path.
- `args`: string array.
- `displayCommand`: redacted/safe display form.
- `cwd`: optional working directory.
- `env`: optional environment overrides.

Rules:

- Never use `sh -c` for prompt execution.
- Never include raw secrets in `displayCommand`.
- Never pass model overrides unless a future explicit product decision changes this.

### 8.3 Dispatch Metadata

Activity metadata for runtime completion/failure should include:

- provider
- command display
- durationMs
- exitCode or error
- stdoutTail
- stderrTail

---

## 9. Data Model

### 9.1 `tasks`

Important fields:

- `id`
- `title`
- `description`
- `status`
- `assignee`
- `priority`
- `tags`
- `sessionKey`
- `dispatchedAt`
- `createdAt`
- `updatedAt`
- `completedAt`

### 9.2 `team_members`

Important fields:

- `id`
- `name`
- `memberType`
- `emoji`
- `role`
- `specialties`
- `description`
- `status`
- `currentTaskId`
- `lastUsed`
- `runtimeProvider`
- `runtimeProfile`
- `runtimeCommand`
- `runtimeWorkdir`
- `openclawAgentId`
- `agentDir`
- `usageCount`
- `successCount`
- `createdAt`

### 9.3 `settings`

Current and expected keys include:

- `gateway_url`
- `gateway_token`
- `workspace_path`
- `main_session_id`
- `openclaw_main_session_id`
- `default_runtime_provider`
- `hermes_default_profile`
- `hermes_worktree_mode`
- `telegram_notifications_enabled`
- `notify_on_review`
- `notify_on_failure`
- `notify_on_done`
- `notification_hermes_profile`
- `dispatch_prompt_template`

### 9.4 `activity_log`

Important fields:

- `id`
- `type`
- `actor`
- `message`
- `taskId`
- `metadata`
- `createdAt`

Future consideration:

- Expand enum to include `team_updated`, `notification_sent`, `notification_failed`, and content-specific events if needed.

### 9.5 `content_items`

Current placeholder fields:

- `id`
- `title`
- `stage`
- `script`
- `thumbnailPath`
- `platforms`
- `createdAt`
- `updatedAt`
- `publishedAt`

Future fields likely needed:

- assignee
- priority
- tags
- source links
- published URLs
- related task ID

---

## 10. API Surface

### 10.1 Existing Core APIs

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/tasks/:id/output`
- `GET /api/team`
- `POST /api/team`
- `PATCH /api/team/:id`
- `DELETE /api/team/:id`
- `GET /api/activity`
- `GET /api/activity/stream`
- `GET /api/runtimes/health`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/calendar`
- `GET /api/memory`

### 10.2 Desired APIs

- `POST /api/tasks/:id/retry-dispatch`
- `POST /api/team/:id/smoke-test`
- `GET /api/status`
- `GET /api/notifications/test-message`
- `POST /api/content`
- `PATCH /api/content/:id`
- `DELETE /api/content/:id`
- `POST /api/calendar/jobs`
- `PATCH /api/calendar/jobs/:id`

---

## 11. UX Requirements

### 11.1 Navigation

Sidebar should include:

- Dashboard/Home
- Tasks
- Calendar
- Content
- Memory
- Team
- Office
- Activity
- Settings

Runtime readiness should eventually be visible outside Settings.

### 11.2 Tasks UX

Tasks page should emphasize:

- Review queue.
- Active agent work.
- Failed/retryable tasks.
- Quick inspection of output.

### 11.3 Settings UX

Settings should group:

- Runtime health.
- OpenClaw gateway.
- Workspace.
- Runtime providers.
- Telegram notifications.
- Dispatch prompt template.

Secrets must use password inputs and never be echoed in logs.

### 11.4 Telegram Message UX

Notification messages should follow this shape:

```markdown
🦅 **Task ready for review**
**Task:** Draft Lisbon plan
**Assignee:** HawkBot - Hermes
**Runtime:** hermes
**Inspect:** http://localhost:4000/tasks
```

Rules:

- No tables.
- No raw stack traces unless explicitly useful and short.
- No token/session values.
- Short enough for mobile scanning.

---

## 12. Roadmap

### P0 — Baseline Already Completed

- Runtime adapter foundation.
- Hermes/OpenClaw/manual providers.
- Runtime health endpoint/cards.
- Activity page.
- Task output drawer.
- Dispatcher output capture.
- Telegram lifecycle notifications.
- Vitest test foundation.

### P1 — PRD and Roadmap Alignment

Goal: make docs match product reality and create an implementation plan.

Deliverables:

- Updated PRD.
- Implementation roadmap plan.
- README cleanup for stale roadmap items.
- Optional reusable PRD skill.

### P2 — Operational Visibility Polish

Goal: make runtime/task health visible at a glance.

Shipped deliverables:

- Runtime health badges in sidebar/header.
- Activity filters.
- Retry dispatch action.
- Notification delivery logging.

Remaining candidates:

- Review/failure count badges.

### P3 — Content Pipeline MVP

Goal: turn placeholder content page into usable workflow.

Candidate deliverables:

- Content item CRUD.
- Content Kanban columns.
- Stage transitions.
- Link content items to tasks.
- Basic script/asset/published URL fields.

### P4 — Scheduler and Briefing Control

Goal: manage proactive workflows from the dashboard.

Candidate deliverables:

- Hermes cron job listing.
- Delivery target display.
- Run history.
- Pause/resume/run actions.
- Morning briefing configuration surface.

### P5 — Deployment and Packaging

Goal: make Mission Control easier to run consistently.

Candidate deliverables:

- Docker Compose.
- Production preview docs.
- Environment validation.
- Backup/restore notes for SQLite.

---

## 13. Success Metrics

Operational metrics:

- Time from task creation to dispatch under 1 second for available agent runtimes.
- Runtime failures visible in Activity within 1 second.
- Task output inspectable in one click from the board.
- Health checks complete within 5 seconds.

Quality metrics:

- `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass before each pushed feature.
- New pure utilities have Vitest coverage.
- Telegram-facing messages are checked for simple Markdown.

Product metrics:

- Eduardo can understand current agent state within 10 seconds of opening the app.
- Eduardo can identify tasks needing review without reading logs.
- At least one real daily workflow is managed end-to-end through Mission Control.

---

## 14. Risks and Tradeoffs

### 14.1 Runtime Coupling

Risk: UI accidentally becomes tied to Hermes or OpenClaw details.

Mitigation:

- Keep provider-specific logic in adapters and health utilities.
- Store generic runtime metadata in activity logs.

### 14.2 Notification Noise

Risk: Telegram alerts become spammy.

Mitigation:

- Default notifications off globally.
- Keep done notifications off by default.
- Add per-event toggles and possibly quiet hours later.

### 14.3 Local State Ephemerality

Risk: Cleanup removes DB state used for debugging.

Mitigation:

- Treat smoke-test task IDs as ephemeral.
- Use Activity/output evidence before cleanup.
- Consider optional export before cleanup for important sessions.

### 14.4 Long-Running Runtime Processes

Risk: Detached child processes outlive expected task state or fail silently.

Mitigation:

- Capture close/error events.
- Record duration and output tails.
- Add future process registry or heartbeat if needed.

---

## 15. Open Questions

1. Should notification delivery eventually use the Hermes gateway `send_message` equivalent directly instead of spawning `hermes chat`?
2. Should Mission Control manage Hermes cron jobs directly, or only display them?
3. Should content pipeline items be separate from tasks or become a specialized task type?
4. Should runtime health appear in the sidebar or dashboard home page first?
5. Should local SQLite state get export/import before cleanup?
6. Should PRD/planning workflows live in a dedicated Mission Control skill?

---

## 16. Implementation Method

Use this skill stack for future development:

- `agent-dashboard-development` for dashboard-specific patterns.
- `reporting` for structured PRD/report deliverables.
- `writing-plans` for implementation plans.
- `test-driven-development` for utility/API behavior changes.
- `subagent-driven-development` for executing plan tasks with review gates.
- `requesting-code-review` before final commit.
- `hermes-agent` for Hermes runtime/gateway/cron details.

Default execution policy:

1. Inspect current repo state.
2. Write/refresh PRD or plan.
3. Create bite-sized tasks.
4. Implement with tests first where practical.
5. Run `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
6. Smoke test runtime behavior when relevant.
7. Commit and push.
8. Clean local `node_modules` and SQLite DB files when requested.
