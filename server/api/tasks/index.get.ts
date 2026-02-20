import { useDb } from '../../db';
import { tasks } from '../../db/schema';
import { eq, desc, type SQL } from 'drizzle-orm';

type TaskStatus = typeof tasks.status.enumValues[number];
type TaskAssignee = typeof tasks.assignee.enumValues[number];

export default defineEventHandler(async (event) => {
  const db = useDb();
  const query = getQuery(event);

  let condition: SQL | undefined;

  if (query.status) {
    condition = eq(tasks.status, query.status as TaskStatus);
  } else if (query.assignee) {
    condition = eq(tasks.assignee, query.assignee as TaskAssignee);
  }

  const rows = await db.select().from(tasks)
    .where(condition)
    .orderBy(desc(tasks.createdAt));

  return rows.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]')
  }));
});
