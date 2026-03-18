import { spawn } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { tasks, teamMembers, activityLog, settings } from '../db/schema';
import type { useDb } from '../db';
import { broadcastToClients } from './gateway';
import { v4 as uuidv4 } from 'uuid';

type Db = ReturnType<typeof useDb>;

// Track dispatching state in memory
const _dispatching = new Set<string>();

function getMainSessionId(db: Db): string | null {
  const [row] = db.select().from(settings).where(eq(settings.key, 'main_session_id')).limit(1).all();
  return row?.value ?? null;
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

export function dispatchTask(task: TaskRow, db: Db) {
  console.log(`[dispatcher] dispatchTask called for "${task.title}" (assignee: ${task.assignee})`);

  // Look up assignee by team member ID to check member type
  const [member] = db.select().from(teamMembers).where(eq(teamMembers.id, task.assignee)).limit(1).all();

  console.log(`[dispatcher] Member lookup result:`, member ? `${member.name} (${member.memberType})` : 'NOT FOUND');

  // Only auto-dispatch tasks assigned to agents, not human users
  if (!member || member.memberType === 'human') return;

  const sessionId = getMainSessionId(db);
  if (!sessionId) {
    console.warn(`[dispatcher] Skipping "${task.title}" — main_session_id not configured in settings. Set it via the Settings page.`);
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
    message: `Task "${task.title}" dispatched to agent`,
    taskId: task.id,
    metadata: JSON.stringify({}),
    createdAt: now
  };
  db.insert(activityLog).values(logEntry).run();
  broadcastToClients({ event: 'task_updated', task: { ...task, status: 'in_progress' }, log: logEntry });

  console.log(`[dispatcher] Dispatching: "${task.title}"`);

  spawnAgent(task, member, sessionId, db);
}

function spawnAgent(task: TaskRow, agent: Record<string, unknown>, sessionId: string, db: Db) {
  const prompt = buildPrompt(task, agent, db);
  const escaped = prompt.replace(/"/g, '\\"');
  const cmd = `openclaw agent --session-id ${sessionId} --message "${escaped}"`;

  const child = spawn('sh', ['-c', cmd], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  child.unref();

  child.on('close', (code) => {
    _dispatching.delete(task.id);

    if (code === 0) {
      console.log(`[dispatcher] Success: "${task.title}"`);
    } else {
      console.error(`[dispatcher] Failed: "${task.title}" (code ${code})`);
      const now = new Date().toISOString();

      // Revert to todo on failure
      db.update(tasks).set({
        status: 'todo',
        dispatchedAt: null,
        updatedAt: now
      }).where(eq(tasks.id, task.id)).run();

      // Broadcast the revert
      const logEntry = {
        id: uuidv4(),
        type: 'task_updated' as const,
        actor: 'system',
        message: `Task "${task.title}" dispatch failed, reverted to todo`,
        taskId: task.id,
        metadata: JSON.stringify({ exitCode: code }),
        createdAt: now
      };
      db.insert(activityLog).values(logEntry).run();
      broadcastToClients({ event: 'task_updated', task: { ...task, status: 'todo' }, log: logEntry });
    }
  });
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

function buildPrompt(task: TaskRow, agent: Record<string, unknown>, db: Db): string {
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
