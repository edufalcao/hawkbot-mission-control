import { useDb } from '../../../db';
import { activityLog, tasks } from '../../../db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { summarizeTaskOutput, type TaskOutputLog } from '../../../utils/taskOutput';

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'id');
  if (!taskId) throw createError({ statusCode: 400, message: 'Task id is required' });

  const db = useDb();
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) throw createError({ statusCode: 404, message: 'Task not found' });

  const logs = await db.select().from(activityLog)
    .where(and(eq(activityLog.taskId, taskId)))
    .orderBy(desc(activityLog.createdAt))
    .limit(100);

  const parsedLogs: TaskOutputLog[] = logs.map(log => ({
    id: log.id,
    type: log.type,
    actor: log.actor,
    message: log.message,
    createdAt: log.createdAt,
    metadata: JSON.parse(log.metadata || '{}')
  }));

  return {
    task: {
      ...task,
      tags: JSON.parse(task.tags || '[]')
    },
    output: summarizeTaskOutput(parsedLogs),
    logs: parsedLogs
  };
});
