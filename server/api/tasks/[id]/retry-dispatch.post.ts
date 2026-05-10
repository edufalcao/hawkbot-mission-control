import { useDb } from '../../../db';
import { activityLog, tasks, teamMembers } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { dispatchTask, isDispatching } from '../../../utils/dispatcher';
import { broadcastToClients } from '../../../utils/gateway';
import { getTaskRetryDecision } from '../../../utils/taskRetry';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, message: 'Task id is required' });

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  if (!task) throw createError({ statusCode: 404, message: 'Task not found' });

  const [assignee] = await db.select().from(teamMembers).where(eq(teamMembers.id, task.assignee)).limit(1);
  const decision = getTaskRetryDecision({ task, assignee, isDispatching: isDispatching(id) });
  if (!decision.retryable) {
    throw createError({ statusCode: 409, message: decision.reason });
  }

  const now = new Date().toISOString();
  const updatedTask = {
    ...task,
    status: 'todo',
    dispatchedAt: null,
    updatedAt: now
  };

  await db.update(tasks).set({
    status: 'todo',
    dispatchedAt: null,
    updatedAt: now
  }).where(eq(tasks.id, id));

  const logEntry = {
    id: uuidv4(),
    type: 'task_updated' as const,
    actor: 'system',
    message: `Task "${task.title}" manually retried`,
    taskId: id,
    metadata: JSON.stringify({
      action: 'retry_dispatch',
      provider: assignee?.runtimeProvider || 'unknown',
      assigneeId: assignee?.id,
      assigneeName: assignee?.name,
      previousStatus: task.status
    }),
    createdAt: now
  };
  await db.insert(activityLog).values(logEntry);
  broadcastToClients({ event: 'task_updated', task: { ...updatedTask, tags: JSON.parse(task.tags || '[]') }, log: logEntry });

  dispatchTask(updatedTask, db);

  return { ...updatedTask, tags: JSON.parse(task.tags || '[]') };
});
