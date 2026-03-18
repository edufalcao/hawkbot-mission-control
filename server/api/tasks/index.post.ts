import { useDb } from '../../db';
import { tasks, activityLog, teamMembers } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { broadcastToClients } from '../../utils/gateway';
import { dispatchTask } from '../../utils/dispatcher';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const body = await readBody(event);
  const now = new Date().toISOString();

  if (!body.assignee) {
    throw createError({ statusCode: 400, message: 'Assignee is required' });
  }

  const task = {
    id: uuidv4(),
    title: body.title,
    description: body.description || '',
    status: body.status || 'todo',
    assignee: body.assignee,
    priority: body.priority || 'none',
    tags: JSON.stringify(body.tags || []),
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  await db.insert(tasks).values(task);

  // Look up assignee for activity log actor
  const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, task.assignee)).limit(1);
  const actorName = member?.name || 'system';

  // Log activity
  const logEntry = {
    id: uuidv4(),
    type: 'task_created' as const,
    actor: actorName,
    message: `Task created: "${task.title}"`,
    taskId: task.id,
    metadata: JSON.stringify({}),
    createdAt: now
  };
  await db.insert(activityLog).values(logEntry);
  broadcastToClients({ event: 'task_created', task: { ...task, tags: body.tags || [] }, log: logEntry });

  // Dispatch immediately if the task starts as todo
  if (task.status === 'todo') {
    dispatchTask(task, db);
  }

  return { ...task, tags: body.tags || [] };
});
