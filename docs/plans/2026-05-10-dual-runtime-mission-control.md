# Dual Runtime Mission Control Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Make HawkBot Mission Control orchestrate tasks through either OpenClaw or Hermes while preserving the existing dashboard experience and adding clear runtime visibility.

**Architecture:** Introduce a runtime adapter layer behind the existing dispatcher. Mission Control keeps one task/team/activity data model, while each agent selects a runtime provider (`openclaw`, `hermes`, or `manual`) and provider-specific command settings. The first implementation should use CLI-based adapters because both OpenClaw and Hermes can be driven from shell commands today; later we can add native API adapters without changing UI/task flows.

**Tech Stack:** Nuxt 4, Nitro server routes, TypeScript strict mode, SQLite/better-sqlite3, Drizzle ORM, existing SSE activity feed, child_process spawn, pnpm.

---

## Answer: can it support both OpenClaw and Hermes?

Yes. The clean approach is **not** to fork the app into “OpenClaw mode” and “Hermes mode”. Instead, Mission Control should become runtime-agnostic:

- Tasks stay the same: title, description, status, assignee, priority, tags.
- Team members gain a runtime provider and provider-specific fields.
- Dispatcher calls a common `AgentRuntimeAdapter` interface.
- OpenClaw and Hermes are two implementations of that interface.
- The UI lets each agent choose its runtime.

Recommended provider mapping:

- `openclaw`: current behavior, uses `openclaw agent --session-id ... --message ...`.
- `hermes`: new behavior, uses `hermes chat -q ...` for one-shot tasks, or optionally `tmux`/profile/worktree mode later for long-running agents.
- `manual`: no spawn; task remains assigned to a human or non-runnable entity.

This keeps OpenClaw working while letting Hermes become the default path over time.

---

## Current repo observations

- Existing dispatcher is in `server/utils/dispatcher.ts`.
- Existing dispatch command is hardcoded to OpenClaw:
  - `openclaw agent --session-id {{main_session_id}} --message "..."`
- Existing settings are generic-ish but named around OpenClaw:
  - `gateway_url`
  - `gateway_token`
  - `workspace_path`
  - `main_session_id`
  - `dispatch_prompt_template`
- Existing team schema already has useful fields:
  - `member_type`
  - `openclaw_agent_id`
  - `agent_dir`
- There are no test files currently. Verification should start with `pnpm lint`, `pnpm typecheck`, and `pnpm build`, then add focused unit-like tests if/when a test runner is introduced.
- Current dirty repo state before this plan: `ralph-once.sh` has an uncommitted change adding `--print --verbose` to the Claude command. Do not overwrite or revert it unless Eduardo explicitly asks.

---

## Design principles

1. **Adapter boundary first:** keep provider-specific shell commands out of the dispatcher.
2. **Backwards compatible defaults:** existing OpenClaw settings should continue to work.
3. **Hermes as a peer, not a replacement:** the dashboard supports both providers per agent.
4. **Observable dispatch:** every spawn should produce enough metadata to debug failures.
5. **No secret leakage:** never write gateway tokens or command env secrets into activity messages.
6. **YAGNI:** start with CLI adapters, not a full plugin system.

---

## Proposed data model

### Team member runtime fields

Add these columns to `team_members`:

- `runtime_provider`: `openclaw | hermes | manual`, default `openclaw` for backward compatibility.
- `runtime_profile`: string nullable. For Hermes this can be a profile name; for OpenClaw this can stay empty.
- `runtime_command`: string nullable. Optional command override for advanced agents.
- `runtime_workdir`: string nullable. Optional working directory for spawned agent commands.

Keep existing `openclaw_agent_id` for compatibility, but treat it as provider-specific legacy metadata.

### Runtime settings

Add these settings keys:

- `default_runtime_provider`: default `hermes` eventually, but start as `openclaw` to avoid surprising existing behavior.
- `hermes_default_profile`: optional Hermes profile name.
- `hermes_default_model`: optional model override.
- `hermes_worktree_mode`: string boolean, default `false`.
- `openclaw_main_session_id`: new explicit name for OpenClaw session ID.

Keep `main_session_id` as a backward-compatible alias for OpenClaw until migration is complete.

---

## Target adapter interface

Create `server/utils/runtimes/types.ts`:

```ts
export type RuntimeProvider = 'openclaw' | 'hermes' | 'manual';

export interface RuntimeAgent {
  id: string,
  name: string,
  emoji?: string | null,
  specialties?: string | null,
  runtimeProvider?: RuntimeProvider | null,
  runtimeProfile?: string | null,
  runtimeCommand?: string | null,
  runtimeWorkdir?: string | null,
  openclawAgentId?: string | null,
  agentDir?: string | null
}

export interface RuntimeTask {
  id: string,
  title: string,
  description: string | null,
  assignee: string,
  status: string
}

export interface RuntimeSettings {
  [key: string]: string | undefined
}

export interface SpawnPlan {
  provider: RuntimeProvider,
  command: string,
  args: string[],
  cwd?: string,
  env?: Record<string, string>,
  displayCommand: string
}

export interface AgentRuntimeAdapter {
  provider: RuntimeProvider,
  buildSpawnPlan(input: {
    task: RuntimeTask,
    agent: RuntimeAgent,
    prompt: string,
    settings: RuntimeSettings
  }): SpawnPlan | null
}
```

Notes:

- Use `spawn(command, args)` instead of shell string concatenation where possible.
- `displayCommand` must be redacted/safe for activity logs.
- `manual` returns `null` and dispatcher skips spawn.

---

## Task 1: Add runtime fields to schema and migrations

**Objective:** Persist runtime provider configuration per team member.

**Files:**

- Modify: `server/db/schema.ts`
- Modify: `server/db/index.ts`

**Step 1: Update Drizzle schema**

In `server/db/schema.ts`, extend `teamMembers`:

```ts
  runtimeProvider: text('runtime_provider', { enum: ['openclaw', 'hermes', 'manual'] }).notNull().default('openclaw'),
  runtimeProfile: text('runtime_profile'),
  runtimeCommand: text('runtime_command'),
  runtimeWorkdir: text('runtime_workdir'),
```

Place these near the existing provider-specific fields (`openclawAgentId`, `agentDir`).

**Step 2: Update create-table SQL**

In `server/db/index.ts`, add the same columns to the `CREATE TABLE IF NOT EXISTS team_members` block:

```sql
      runtime_provider TEXT NOT NULL DEFAULT 'openclaw',
      runtime_profile TEXT,
      runtime_command TEXT,
      runtime_workdir TEXT,
```

**Step 3: Add additive migrations**

Append to `alterations`:

```ts
    'ALTER TABLE team_members ADD COLUMN runtime_provider TEXT NOT NULL DEFAULT \'openclaw\'',
    'ALTER TABLE team_members ADD COLUMN runtime_profile TEXT',
    'ALTER TABLE team_members ADD COLUMN runtime_command TEXT',
    'ALTER TABLE team_members ADD COLUMN runtime_workdir TEXT'
```

**Step 4: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

Expected: both pass or only show pre-existing unrelated failures.

**Step 5: Commit**

```bash
git add server/db/schema.ts server/db/index.ts
git commit -m "feat: add agent runtime fields"
```

---

## Task 2: Allow runtime fields through Team API

**Objective:** Team create/update endpoints can read and write runtime provider settings.

**Files:**

- Modify: `server/api/team/index.post.ts`
- Modify: `server/api/team/[id].patch.ts`
- Inspect: `server/api/team/index.get.ts`

**Step 1: Read current endpoint behavior**

Open:

```bash
sed -n '1,220p' server/api/team/index.post.ts
sed -n '1,220p' server/api/team/[id].patch.ts
sed -n '1,160p' server/api/team/index.get.ts
```

Do not use raw `sed` if implementing through Hermes tools; use `read_file` instead.

**Step 2: Validate runtime provider**

Add a local helper near request parsing in both post/patch endpoints:

```ts
const RUNTIME_PROVIDERS = ['openclaw', 'hermes', 'manual'] as const;
type RuntimeProvider = typeof RUNTIME_PROVIDERS[number];

function normalizeRuntimeProvider(value: unknown): RuntimeProvider | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !RUNTIME_PROVIDERS.includes(value as RuntimeProvider)) {
    throw createError({ statusCode: 400, message: 'Invalid runtime provider' });
  }
  return value as RuntimeProvider;
}
```

**Step 3: Persist fields**

When building insert/update values, include:

```ts
runtimeProvider: normalizeRuntimeProvider(body.runtimeProvider) ?? 'openclaw',
runtimeProfile: typeof body.runtimeProfile === 'string' ? body.runtimeProfile : null,
runtimeCommand: typeof body.runtimeCommand === 'string' ? body.runtimeCommand : null,
runtimeWorkdir: typeof body.runtimeWorkdir === 'string' ? body.runtimeWorkdir : null,
```

For PATCH, only include fields that are present in the body.

**Step 4: Verify API shape**

Because Drizzle returns schema fields directly, `index.get.ts` should include the new fields automatically. Confirm no response mapping strips them.

**Step 5: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 6: Commit**

```bash
git add server/api/team/index.post.ts server/api/team/[id].patch.ts server/api/team/index.get.ts
git commit -m "feat: expose agent runtime fields in team API"
```

---

## Task 3: Expand settings API for dual runtime config

**Objective:** Settings page and backend accept both OpenClaw and Hermes runtime settings.

**Files:**

- Modify: `server/api/settings/index.patch.ts`
- Modify: `app/pages/settings.vue`

**Step 1: Add allowed setting keys**

In `server/api/settings/index.patch.ts`, extend `ALLOWED_KEYS`:

```ts
  'default_runtime_provider',
  'hermes_default_profile',
  'hermes_default_model',
  'hermes_worktree_mode',
  'openclaw_main_session_id'
```

Keep existing keys for backward compatibility.

**Step 2: Add settings form fields**

In `app/pages/settings.vue`, extend `form`:

```ts
  default_runtime_provider: 'openclaw',
  hermes_default_profile: '',
  hermes_default_model: '',
  hermes_worktree_mode: 'false',
  openclaw_main_session_id: ''
```

**Step 3: Populate and reset fields**

In the `watch(data, ...)` and `resetForm()` blocks, map defaults:

```ts
form.default_runtime_provider = val.default_runtime_provider || 'openclaw';
form.hermes_default_profile = val.hermes_default_profile || '';
form.hermes_default_model = val.hermes_default_model || '';
form.hermes_worktree_mode = val.hermes_worktree_mode || 'false';
form.openclaw_main_session_id = val.openclaw_main_session_id || val.main_session_id || '';
```

**Step 4: Save fields**

Add these keys to the PATCH body:

```ts
        default_runtime_provider: form.default_runtime_provider,
        hermes_default_profile: form.hermes_default_profile,
        hermes_default_model: form.hermes_default_model,
        hermes_worktree_mode: form.hermes_worktree_mode,
        openclaw_main_session_id: form.openclaw_main_session_id,
```

**Step 5: Add minimal UI section**

Add a new “Runtime Providers” section above “Task Dispatch” with:

- Default Runtime Provider: `USelect` or simple `UInput` initially if Nuxt UI select typing is annoying.
- Hermes Default Profile.
- Hermes Default Model.
- Hermes Worktree Mode.
- OpenClaw Main Session ID.

Do not remove the existing `main_session_id` field yet; mark it as legacy if duplicate.

**Step 6: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 7: Commit**

```bash
git add server/api/settings/index.patch.ts app/pages/settings.vue
git commit -m "feat: add dual runtime settings"
```

---

## Task 4: Create runtime adapter types and registry

**Objective:** Add the provider-neutral adapter boundary without changing dispatch behavior yet.

**Files:**

- Create: `server/utils/runtimes/types.ts`
- Create: `server/utils/runtimes/index.ts`
- Create: `server/utils/runtimes/manual.ts`

**Step 1: Add types**

Create `server/utils/runtimes/types.ts` using the interface shown in the “Target adapter interface” section.

**Step 2: Add manual adapter**

Create `server/utils/runtimes/manual.ts`:

```ts
import type { AgentRuntimeAdapter } from './types';

export const manualRuntimeAdapter: AgentRuntimeAdapter = {
  provider: 'manual',
  buildSpawnPlan: () => null
};
```

**Step 3: Add registry skeleton**

Create `server/utils/runtimes/index.ts`:

```ts
import type { AgentRuntimeAdapter, RuntimeProvider } from './types';
import { manualRuntimeAdapter } from './manual';

const adapters = new Map<RuntimeProvider, AgentRuntimeAdapter>([
  ['manual', manualRuntimeAdapter]
]);

export function registerRuntimeAdapter(adapter: AgentRuntimeAdapter) {
  adapters.set(adapter.provider, adapter);
}

export function getRuntimeAdapter(provider: RuntimeProvider): AgentRuntimeAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) {
    throw new Error(`No runtime adapter registered for provider: ${provider}`);
  }
  return adapter;
}
```

**Step 4: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 5: Commit**

```bash
git add server/utils/runtimes
git commit -m "feat: add runtime adapter boundary"
```

---

## Task 5: Implement OpenClaw runtime adapter

**Objective:** Move current OpenClaw command generation into an adapter.

**Files:**

- Create: `server/utils/runtimes/openclaw.ts`
- Modify: `server/utils/runtimes/index.ts`

**Step 1: Create adapter**

Create `server/utils/runtimes/openclaw.ts`:

```ts
import type { AgentRuntimeAdapter } from './types';

function getOpenClawSessionId(settings: Record<string, string | undefined>) {
  return settings.openclaw_main_session_id || settings.main_session_id || null;
}

export const openClawRuntimeAdapter: AgentRuntimeAdapter = {
  provider: 'openclaw',
  buildSpawnPlan({ prompt, settings }) {
    const sessionId = getOpenClawSessionId(settings);
    if (!sessionId) {
      throw new Error('OpenClaw session ID is not configured. Set openclaw_main_session_id or legacy main_session_id.');
    }

    return {
      provider: 'openclaw',
      command: 'openclaw',
      args: ['agent', '--session-id', sessionId, '--message', prompt],
      displayCommand: 'openclaw agent --session-id [redacted] --message [prompt]'
    };
  }
};
```

**Step 2: Register adapter**

In `server/utils/runtimes/index.ts`:

```ts
import { openClawRuntimeAdapter } from './openclaw';

const adapters = new Map<RuntimeProvider, AgentRuntimeAdapter>([
  ['manual', manualRuntimeAdapter],
  ['openclaw', openClawRuntimeAdapter]
]);
```

**Step 3: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 4: Commit**

```bash
git add server/utils/runtimes/openclaw.ts server/utils/runtimes/index.ts
git commit -m "refactor: move openclaw dispatch into runtime adapter"
```

---

## Task 6: Implement Hermes runtime adapter

**Objective:** Add Hermes CLI dispatch support.

**Files:**

- Create: `server/utils/runtimes/hermes.ts`
- Modify: `server/utils/runtimes/index.ts`

**Step 1: Create prompt strategy**

Hermes should initially use one-shot CLI mode:

```bash
hermes chat -q "<prompt>"
```

Optionally include:

- `--profile <profile>` when `agent.runtimeProfile` or `settings.hermes_default_profile` is set.
- `--model <model>` when `settings.hermes_default_model` is set.
- `--worktree` when `settings.hermes_worktree_mode === 'true'`.

**Step 2: Create adapter**

Create `server/utils/runtimes/hermes.ts`:

```ts
import type { AgentRuntimeAdapter } from './types';

export const hermesRuntimeAdapter: AgentRuntimeAdapter = {
  provider: 'hermes',
  buildSpawnPlan({ agent, prompt, settings }) {
    const args = ['chat'];

    const profile = agent.runtimeProfile || settings.hermes_default_profile;
    if (profile) args.push('--profile', profile);

    const model = settings.hermes_default_model;
    if (model) args.push('--model', model);

    if (settings.hermes_worktree_mode === 'true') args.push('--worktree');

    args.push('-q', prompt);

    return {
      provider: 'hermes',
      command: agent.runtimeCommand || 'hermes',
      args,
      cwd: agent.runtimeWorkdir || agent.agentDir || undefined,
      displayCommand: `hermes ${args.filter((arg) => arg !== prompt).join(' ')} [prompt]`
    };
  }
};
```

**Step 3: Register adapter**

In `server/utils/runtimes/index.ts`:

```ts
import { hermesRuntimeAdapter } from './hermes';

const adapters = new Map<RuntimeProvider, AgentRuntimeAdapter>([
  ['manual', manualRuntimeAdapter],
  ['openclaw', openClawRuntimeAdapter],
  ['hermes', hermesRuntimeAdapter]
]);
```

**Step 4: Verify command syntax**

Run manually outside the app:

```bash
hermes chat -q "Reply with OK from Mission Control adapter smoke test"
```

Expected: Hermes replies with a short OK-like response.

**Step 5: Verify app**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 6: Commit**

```bash
git add server/utils/runtimes/hermes.ts server/utils/runtimes/index.ts
git commit -m "feat: add hermes runtime adapter"
```

---

## Task 7: Refactor dispatcher to use runtime adapters

**Objective:** Replace hardcoded OpenClaw shell command with provider adapter selection.

**Files:**

- Modify: `server/utils/dispatcher.ts`

**Step 1: Add settings loader**

Replace the narrow `getMainSessionId()` helper with a generic settings loader:

```ts
function getSettings(db: Db): Record<string, string> {
  const rows = db.select().from(settings).all();
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}
```

**Step 2: Determine provider**

Add helper:

```ts
function getRuntimeProvider(agent: Record<string, unknown>, settingsMap: Record<string, string>) {
  const provider = String(agent.runtimeProvider || settingsMap.default_runtime_provider || 'openclaw');
  if (provider === 'openclaw' || provider === 'hermes' || provider === 'manual') return provider;
  return 'openclaw';
}
```

**Step 3: Import adapter registry**

```ts
import { getRuntimeAdapter } from './runtimes';
```

**Step 4: Use spawn(command, args)**

In `spawnAgent`, build the prompt as today, then:

```ts
const settingsMap = getSettings(db);
const provider = getRuntimeProvider(agent, settingsMap);
const adapter = getRuntimeAdapter(provider);
const spawnPlan = adapter.buildSpawnPlan({
  task,
  agent: agent as any,
  prompt,
  settings: settingsMap
});

if (!spawnPlan) {
  console.log(`[dispatcher] Skipping spawn for manual runtime: "${task.title}"`);
  _dispatching.delete(task.id);
  return;
}

const child = spawn(spawnPlan.command, spawnPlan.args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  cwd: spawnPlan.cwd,
  env: { ...process.env, ...spawnPlan.env }
});
```

Avoid the old `const escaped = ...` and `spawn('sh', ['-c', cmd])` path. This reduces shell quoting risk.

**Step 5: Improve logs safely**

When dispatch starts, log provider in metadata, not secrets:

```ts
metadata: JSON.stringify({ provider, command: spawnPlan.displayCommand })
```

**Step 6: Preserve failure behavior**

Keep current behavior:

- On non-zero exit, revert task to `todo`.
- Insert activity log entry.
- Broadcast SSE update.

Add captured stderr tail later in Task 11, not now.

**Step 7: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 8: Commit**

```bash
git add server/utils/dispatcher.ts
git commit -m "refactor: dispatch tasks through runtime adapters"
```

---

## Task 8: Update Team UI for runtime provider selection

**Objective:** Users can choose OpenClaw, Hermes, or Manual per team member.

**Files:**

- Modify: `app/components/TeamMemberModal.vue`
- Modify: `app/pages/team.vue` if member cards need display updates

**Step 1: Inspect current modal props/form**

Read `app/components/TeamMemberModal.vue` and identify the form object and submit payload.

**Step 2: Add form fields**

Add:

```ts
runtimeProvider: 'openclaw',
runtimeProfile: '',
runtimeCommand: '',
runtimeWorkdir: ''
```

Populate them from the selected member when editing.

**Step 3: Add UI controls**

Add a “Runtime” section:

- Runtime Provider: OpenClaw / Hermes / Manual.
- Runtime Profile: optional, helper text “Hermes profile name or provider-specific profile”.
- Runtime Command: optional, helper text “Advanced override. Defaults to `hermes` or `openclaw`.”
- Runtime Workdir: optional working directory.

If `USelect` causes typing friction, use a native `<select>` styled with Tailwind for the first pass.

**Step 4: Submit fields**

Include the new fields in POST/PATCH body.

**Step 5: Show provider on team cards**

In `app/pages/team.vue`, display a small badge:

- `Hermes`
- `OpenClaw`
- `Manual`

**Step 6: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 7: Commit**

```bash
git add app/components/TeamMemberModal.vue app/pages/team.vue
git commit -m "feat: configure agent runtime in team UI"
```

---

## Task 9: Add gateway/runtime health endpoint

**Objective:** The UI can tell whether OpenClaw and Hermes are available.

**Files:**

- Create or modify: `server/api/gateway/health.get.ts`
- Optionally create: `server/utils/runtimeHealth.ts`

**Step 1: Inspect existing health endpoint**

Read `server/api/gateway/health.get.ts`.

**Step 2: Add command checks**

Use `spawnSync` or `execFileSync` with short timeout to check:

```bash
openclaw --version
hermes --version
```

Return a safe object:

```ts
{
  openclaw: { available: boolean, version?: string, error?: string },
  hermes: { available: boolean, version?: string, error?: string }
}
```

Do not include env vars or tokens.

**Step 3: Surface in Settings UI**

In `app/pages/settings.vue`, optionally fetch `/api/gateway/health` and show runtime availability badges.

**Step 4: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 5: Commit**

```bash
git add server/api/gateway/health.get.ts app/pages/settings.vue
git commit -m "feat: show runtime availability health"
```

---

## Task 10: Add dispatch prompt templates per runtime

**Objective:** Hermes and OpenClaw can receive optimized prompts without duplicating dispatcher logic.

**Files:**

- Modify: `server/utils/dispatcher.ts`
- Modify: `server/api/settings/index.patch.ts`
- Modify: `app/pages/settings.vue`

**Step 1: Add setting keys**

Add allowed keys:

```ts
'openclaw_dispatch_prompt_template',
'hermes_dispatch_prompt_template'
```

Keep `dispatch_prompt_template` as global fallback.

**Step 2: Adjust prompt template selection**

Change `getDispatchPromptTemplate(db)` into:

```ts
function getDispatchPromptTemplate(settingsMap: Record<string, string>, provider: string): string {
  if (provider === 'hermes' && settingsMap.hermes_dispatch_prompt_template) {
    return settingsMap.hermes_dispatch_prompt_template;
  }
  if (provider === 'openclaw' && settingsMap.openclaw_dispatch_prompt_template) {
    return settingsMap.openclaw_dispatch_prompt_template;
  }
  return settingsMap.dispatch_prompt_template || DEFAULT_DISPATCH_PROMPT;
}
```

Update `buildPrompt` to accept `settingsMap` and `provider`.

**Step 3: Hermes default prompt**

Use a Hermes-friendly default prompt. It should tell Hermes how to report completion:

```md
New task from Mission Control:

Agent: {{agent_emoji}} {{agent_name}}
Specialties: {{agent_specialties}}

Task: {{task_title}}
{{task_description}}

When finished, update the task to review:
curl -X PATCH http://localhost:4000/api/tasks/{{task_id}} -H "Content-Type: application/json" -d '{"status":"review"}'

If blocked, leave a concise explanation in your final response and do not mark review.
```

**Step 4: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 5: Commit**

```bash
git add server/utils/dispatcher.ts server/api/settings/index.patch.ts app/pages/settings.vue
git commit -m "feat: support runtime-specific dispatch prompts"
```

---

## Task 11: Add basic dispatch run observability

**Objective:** Make agent dispatch failures debuggable from the activity feed.

**Files:**

- Modify: `server/db/schema.ts`
- Modify: `server/db/index.ts`
- Modify: `server/utils/dispatcher.ts`
- Optionally create: `server/api/tasks/[id]/runs.get.ts`

**Step 1: Add minimal task runtime metadata**

Add columns to `tasks`:

- `runtime_provider`: nullable text.
- `last_dispatch_exit_code`: nullable integer.
- `last_dispatch_error`: nullable text.

This is simpler than a full `task_runs` table and enough for first-pass debugging.

**Step 2: Add migration SQL**

Add `ALTER TABLE tasks ADD COLUMN ...` statements in `server/db/index.ts`.

**Step 3: Capture stderr tail**

In `spawnAgent`, collect limited stderr:

```ts
let stderrTail = '';
child.stderr?.on('data', (chunk) => {
  stderrTail = (stderrTail + chunk.toString()).slice(-2000);
});
```

Do not store unlimited output.

**Step 4: Update task on success/failure**

On spawn start:

```ts
runtimeProvider: provider
```

On failure:

```ts
lastDispatchExitCode: code,
lastDispatchError: stderrTail || null
```

On success:

```ts
lastDispatchExitCode: 0,
lastDispatchError: null
```

Use actual Drizzle field names after schema update.

**Step 5: Show concise failure in activity metadata**

Activity message should stay short:

```ts
message: `Task "${task.title}" dispatch failed via ${provider}, reverted to todo`
```

Metadata may include redacted stderr tail.

**Step 6: Verify**

Run:

```bash
pnpm typecheck
pnpm lint
```

**Step 7: Commit**

```bash
git add server/db/schema.ts server/db/index.ts server/utils/dispatcher.ts
git commit -m "feat: record dispatch runtime failures"
```

---

## Task 12: Documentation update

**Objective:** Make the dual-runtime model obvious for future Eduardo/HawkBot sessions.

**Files:**

- Modify: `README.md`
- Modify: `CLAUDE.md`
- Optionally create: `docs/runtime-adapters.md`

**Step 1: Update README stack/feature language**

Change wording from OpenClaw-only to dual runtime:

- “Agent management dashboard for OpenClaw” → “Agent management dashboard for OpenClaw and Hermes”.
- “connected to OpenClaw Gateway” → “runtime adapter support for OpenClaw and Hermes”.

**Step 2: Add runtime configuration section**

Document:

- OpenClaw provider requirements.
- Hermes provider requirements.
- Per-agent provider selection.
- Common troubleshooting.

**Step 3: Update CLAUDE.md project overview**

Make future agents aware that both runtimes are supported.

**Step 4: Verify docs only**

Run:

```bash
pnpm lint
```

**Step 5: Commit**

```bash
git add README.md CLAUDE.md docs/runtime-adapters.md
git commit -m "docs: document dual runtime mission control"
```

---

## Task 13: End-to-end smoke test

**Objective:** Verify both runtimes can be configured and dispatched without breaking existing behavior.

**Files:**

- No required code changes unless bugs are found.

**Step 1: Start dev server**

```bash
pnpm dev
```

Expected: Nuxt starts on `http://localhost:4000`.

**Step 2: Configure one manual/human member**

In Team UI:

- Ensure Eduardo is `manual` or human.
- Create a test task assigned to Eduardo.

Expected: no agent is spawned.

**Step 3: Configure OpenClaw agent**

If OpenClaw is installed and available:

- Set runtime provider to `openclaw`.
- Configure OpenClaw session ID.
- Create a small test task.

Expected: task transitions to `in_progress`; spawn metadata shows `openclaw`; no secrets in activity feed.

**Step 4: Configure Hermes agent**

Set runtime provider to `hermes`.

Create a tiny task:

```text
Reply with a one-line summary and then PATCH this task to review.
```

Expected:

- task transitions to `in_progress`;
- `hermes chat -q` process starts;
- on completion, task becomes `review` if the prompt curl succeeds;
- failures revert to `todo` with readable error metadata.

**Step 5: Final quality gates**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all pass.

**Step 6: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix: polish dual runtime dispatch smoke test"
```

---

## Non-goals for this pass

- Full native Hermes gateway API integration.
- Live streaming token output from spawned agents.
- Multi-agent dependency graphs.
- Remote worker pools.
- Full task run history table.
- Replacing Hermes Kanban internals.

Those are good later upgrades after the CLI adapter proves the model.

---

## Risks and mitigations

- **Risk:** Shell quoting bugs with long prompts.
  - **Mitigation:** use `spawn(command, args)` and avoid `sh -c`.

- **Risk:** Hermes one-shot processes run too long.
  - **Mitigation:** add timeout/kill behavior in a later task if needed; start with current detached behavior.

- **Risk:** OpenClaw session setting migration breaks current dispatch.
  - **Mitigation:** keep `main_session_id` as fallback.

- **Risk:** Activity feed leaks sensitive command details.
  - **Mitigation:** use `displayCommand` and redact session IDs/prompts/tokens.

- **Risk:** Agents mark tasks incorrectly.
  - **Mitigation:** keep existing curl-based completion instruction for both providers; later replace with authenticated task-run callbacks.

---

## Recommended execution order

1. Tasks 1-3: data/settings foundation.
2. Tasks 4-7: adapter layer and dispatcher refactor.
3. Tasks 8-10: UI and runtime-specific prompts.
4. Task 11: observability.
5. Task 12: docs.
6. Task 13: end-to-end smoke test.

If time is tight, stop after Task 7. At that point the backend can dispatch to both OpenClaw and Hermes, even if the UI is still rough.
