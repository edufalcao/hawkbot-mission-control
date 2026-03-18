import { useDb } from '../../db';
import { tasks, activityLog, teamMembers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { broadcastToClients } from '../../utils/gateway';
import { dispatchTask } from '../../utils/dispatcher';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updatedAt: now };

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === 'done') updates.completedAt = now;
  }
  if (body.assignee !== undefined) updates.assignee = body.assignee;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags);

  await db.update(tasks).set(updates).where(eq(tasks.id, id));

  const [updated] = await db.select().from(tasks).where(eq(tasks.id, id));

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Task not found' });
  }

  // Look up assignee for activity log actor
  const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, updated.assignee)).limit(1);
  const actorName = member?.name || 'system';

  // Log activity
  const logEntry = {
    id: uuidv4(),
    type: body.status === 'done' ? 'task_completed' as const : 'task_updated' as const,
    actor: actorName,
    message: body.status
      ? `Task "${updated.title}" moved to ${body.status}`
      : `Task "${updated.title}" updated`,
    taskId: id,
    metadata: JSON.stringify({ changes: body }),
    createdAt: now
  };
  await db.insert(activityLog).values(logEntry);
  broadcastToClients({ event: 'task_updated', task: { ...updated, tags: JSON.parse(updated.tags || '[]') }, log: logEntry });

  // Dispatch if task was moved (back) to todo
  if (body.status === 'todo') {
    dispatchTask(updated, db);
  }

  return { ...updated, tags: JSON.parse(updated.tags || '[]') };
});
