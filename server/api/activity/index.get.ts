import { useDb } from '../../db';
import { activityLog } from '../../db/schema';
import { and, desc, eq, like } from 'drizzle-orm';
import { parseActivityFilters } from '../../utils/activityFilters';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const filters = parseActivityFilters(getQuery(event));
  const conditions = [];

  if (filters.type) conditions.push(eq(activityLog.type, filters.type as typeof activityLog.type.enumValues[number]));
  if (filters.taskId) conditions.push(eq(activityLog.taskId, filters.taskId));
  if (filters.actor) conditions.push(like(activityLog.actor, `%${filters.actor}%`));

  const logs = await db.select().from(activityLog)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(filters.limit);

  return logs.map(l => ({
    ...l,
    metadata: JSON.parse(l.metadata || '{}')
  }));
});
