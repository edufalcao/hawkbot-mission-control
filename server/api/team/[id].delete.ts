import { useDb } from '../../db';
import { teamMembers, activityLog } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { broadcastToClients } from '../../utils/gateway';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const id = getRouterParam(event, 'id')!;
  const now = new Date().toISOString();

  // Fetch member before deleting (for log message)
  const [existing] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Team member not found' });
  }

  await db.delete(teamMembers).where(eq(teamMembers.id, id));

  // Log activity
  const logEntry = {
    id: uuidv4(),
    type: 'task_updated' as const,
    actor: 'system',
    message: `Team member removed: "${existing.name}" (${existing.memberType})`,
    taskId: null,
    metadata: JSON.stringify({ memberId: id }),
    createdAt: now
  };
  await db.insert(activityLog).values(logEntry);
  broadcastToClients({ event: 'team_updated', memberId: id, action: 'deleted', log: logEntry });

  return { success: true };
});
