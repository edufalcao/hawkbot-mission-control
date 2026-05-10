import { spawn } from 'node:child_process';
import { eq, sql } from 'drizzle-orm';
import { tasks, teamMembers, activityLog, settings } from '../db/schema';
import type { useDb } from '../db';
import { broadcastToClients } from './gateway';
import { getRuntimeAdapter } from './runtimes';
import { sendTaskNotification } from './notifications';
import type { RuntimeAgent, RuntimeProvider, RuntimeSettings } from './runtimes/types';
import { v4 as uuidv4 } from 'uuid';

type Db = ReturnType<typeof useDb>;

// Track dispatching state in memory
const _dispatching = new Set<string>();

function getSettings(db: Db): RuntimeSettings {
  const rows = db.select().from(settings).all();
  const result: RuntimeSettings = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}

interface TaskRow {
  id: string,
  title: string,
  description: string | null,
  assignee: string,
  status: string
}

export function isDispatching(taskId: string): boolean {
  return _dispatching.has(taskId);
}

function getRuntimeProvider(agent: RuntimeAgent, settingsMap: RuntimeSettings): RuntimeProvider {
  const provider = agent.runtimeProvider || settingsMap.default_runtime_provider || 'openclaw';
  if (provider === 'openclaw' || provider === 'hermes' || provider === 'manual') return provider;
  return 'openclaw';
}

export function dispatchTask(task: TaskRow, db: Db) {
  console.log(`[dispatcher] dispatchTask called for "${task.title}" (assignee: ${task.assignee})`);

  // Look up assignee by team member ID to check member type
  const [member] = db.select().from(teamMembers).where(eq(teamMembers.id, task.assignee)).limit(1).all();

  console.log(`[dispatcher] Member lookup result:`, member ? `${member.name} (${member.memberType})` : 'NOT FOUND');

  // Only auto-dispatch tasks assigned to agents, not human users
  if (!member || member.memberType === 'human') return;

  const settingsMap = getSettings(db);
  const provider = getRuntimeProvider(member, settingsMap);
  if (provider === 'manual') {
    console.log(`[dispatcher] Skipping "${task.title}" — agent runtime is manual`);
    return;
  }

  if (_dispatching.has(task.id)) {
    console.log(`[dispatcher] Skipping "${task.title}" — already dispatching`);
    return;
  }

  _dispatching.add(task.id);
  const now = new Date().toISOString();

  // Update status to in_progress immediately
  db.update(tasks).set({
    status: 'in_progress',
    dispatchedAt: now,
    updatedAt: now
  }).where(eq(tasks.id, task.id)).run();

  // Broadcast so the dashboard updates instantly
  const logEntry = {
    id: uuidv4(),
    type: 'task_updated' as const,
    actor: 'system',
    message: `Task "${task.title}" dispatched to ${provider} agent`,
    taskId: task.id,
    metadata: JSON.stringify({ provider }),
    createdAt: now
  };
  db.insert(activityLog).values(logEntry).run();
  broadcastToClients({ event: 'task_updated', task: { ...task, status: 'in_progress' }, log: logEntry });

  console.log(`[dispatcher] Dispatching: "${task.title}" via ${provider}`);

  spawnAgent(task, member, settingsMap, provider, db);
}

function revertDispatch(task: TaskRow, db: Db, message: string, metadata: Record<string, unknown>) {
  const now = new Date().toISOString();

  db.update(tasks).set({
    status: 'todo',
    dispatchedAt: null,
    updatedAt: now
  }).where(eq(tasks.id, task.id)).run();

  const logEntry = {
    id: uuidv4(),
    type: 'task_updated' as const,
    actor: 'system',
    message,
    taskId: task.id,
    metadata: JSON.stringify(metadata),
    createdAt: now
  };
  db.insert(activityLog).values(logEntry).run();
  broadcastToClients({ event: 'task_updated', task: { ...task, status: 'todo' }, log: logEntry });
}

function spawnAgent(task: TaskRow, agent: RuntimeAgent, settingsMap: RuntimeSettings, provider: RuntimeProvider, db: Db) {
  const prompt = buildPrompt(task, agent, db);
  let spawnPlan;

  try {
    const adapter = getRuntimeAdapter(provider);
    spawnPlan = adapter.buildSpawnPlan({ task, agent, prompt, settings: settingsMap });
  } catch (err) {
    _dispatching.delete(task.id);
    const message = err instanceof Error ? err.message : 'Unknown runtime adapter error';
    console.error(`[dispatcher] Failed to build spawn plan for "${task.title}": ${message}`);
    revertDispatch(task, db, `Task "${task.title}" dispatch failed before spawn`, { provider, error: message });
    sendTaskNotification({ event: 'failure', taskTitle: task.title, taskId: task.id, assigneeName: agent.name, provider, error: message }, settingsMap, db);
    return;
  }

  if (!spawnPlan) {
    _dispatching.delete(task.id);
    console.log(`[dispatcher] Skipping "${task.title}" — runtime adapter returned no spawn plan`);
    revertDispatch(task, db, `Task "${task.title}" skipped because runtime is manual`, { provider });
    return;
  }

  const startedAt = Date.now();
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  db.update(teamMembers).set({
    status: 'busy',
    currentTaskId: task.id,
    lastUsed: new Date(startedAt).toISOString(),
    usageCount: sql`${teamMembers.usageCount} + 1`
  }).where(eq(teamMembers.id, agent.id)).run();

  const child = spawn(spawnPlan.command, spawnPlan.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    cwd: spawnPlan.cwd,
    env: { ...process.env, ...spawnPlan.env }
  });

  child.stdout?.on('data', data => appendOutput(stdoutChunks, data));
  child.stderr?.on('data', data => appendOutput(stderrChunks, data));

  child.unref();

  child.on('error', (err) => {
    _dispatching.delete(task.id);
    resetAgentAfterDispatch(agent.id, db, false);
    console.error(`[dispatcher] Spawn error for "${task.title}" via ${provider}: ${err.message}`);
    revertDispatch(task, db, `Task "${task.title}" dispatch failed via ${provider}, reverted to todo`, {
      provider,
      command: spawnPlan.displayCommand,
      error: err.message,
      durationMs: Date.now() - startedAt,
      stdoutTail: tailOutput(stdoutChunks),
      stderrTail: tailOutput(stderrChunks)
    });
    sendTaskNotification({ event: 'failure', taskTitle: task.title, taskId: task.id, assigneeName: agent.name, provider, error: err.message }, settingsMap, db);
  });

  child.on('close', (code) => {
    _dispatching.delete(task.id);
    const durationMs = Date.now() - startedAt;
    const stdoutTail = tailOutput(stdoutChunks);
    const stderrTail = tailOutput(stderrChunks);

    if (code === 0) {
      resetAgentAfterDispatch(agent.id, db, true);
      console.log(`[dispatcher] Success: "${task.title}" via ${provider}`);
      const logEntry = {
        id: uuidv4(),
        type: 'agent_completed' as const,
        actor: agent.name,
        message: `Task "${task.title}" completed by ${provider} runtime`,
        taskId: task.id,
        metadata: JSON.stringify({
          provider,
          command: spawnPlan.displayCommand,
          durationMs,
          stdoutTail,
          stderrTail
        }),
        createdAt: new Date().toISOString()
      };
      db.insert(activityLog).values(logEntry).run();
      broadcastToClients({ event: 'agent_completed', task, log: logEntry });
    } else {
      resetAgentAfterDispatch(agent.id, db, false);
      console.error(`[dispatcher] Failed: "${task.title}" via ${provider} (code ${code})`);
      revertDispatch(task, db, `Task "${task.title}" dispatch failed via ${provider}, reverted to todo`, {
        provider,
        command: spawnPlan.displayCommand,
        exitCode: code,
        durationMs,
        stdoutTail,
        stderrTail
      });
      sendTaskNotification({ event: 'failure', taskTitle: task.title, taskId: task.id, assigneeName: agent.name, provider, error: `Exited with status ${code}` }, settingsMap, db);
    }
  });
}

function appendOutput(chunks: string[], data: Buffer | string) {
  chunks.push(data.toString());
  while (chunks.join('').length > 8000) chunks.shift();
}

function tailOutput(chunks: string[]) {
  const output = chunks.join('').trim();
  if (!output) return '';
  return output.slice(-4000);
}

function resetAgentAfterDispatch(agentId: string, db: Db, succeeded: boolean) {
  db.update(teamMembers).set({
    status: 'idle',
    currentTaskId: null,
    ...(succeeded ? { successCount: sql`${teamMembers.successCount} + 1` } : {})
  }).where(eq(teamMembers.id, agentId)).run();
}

const DEFAULT_DISPATCH_PROMPT = `New task from Mission Control:

📋 **Agent:** {{agent_emoji}} {{agent_name}}
🎯 **Specialties:** {{agent_specialties}}

**{{task_title}}**
{{task_description}}

When finished: curl -X PATCH http://localhost:4000/api/tasks/{{task_id}} -H "Content-Type: application/json" -d '{"status":"review"}'`;

function getDispatchPromptTemplate(db: Db): string {
  const [row] = db.select().from(settings).where(eq(settings.key, 'dispatch_prompt_template')).limit(1).all();
  return row?.value || DEFAULT_DISPATCH_PROMPT;
}

function buildPrompt(task: TaskRow, agent: RuntimeAgent, db: Db): string {
  const rawSpecialties = agent.specialties;
  const parsedSpecialties = Array.isArray(rawSpecialties)
    ? rawSpecialties
    : (() => {
        try {
          return JSON.parse(rawSpecialties as string);
        } catch {
          return [rawSpecialties];
        }
      })();

  const template = getDispatchPromptTemplate(db);

  return template
    .replace(/\{\{agent_emoji\}\}/g, String(agent.emoji || '🤖'))
    .replace(/\{\{agent_name\}\}/g, String(agent.name || 'Agent'))
    .replace(/\{\{agent_specialties\}\}/g, parsedSpecialties.join(', '))
    .replace(/\{\{task_title\}\}/g, task.title)
    .replace(/\{\{task_description\}\}/g, task.description || '')
    .replace(/\{\{task_id\}\}/g, task.id);
}
