import { useDb } from '../../db';
import { teamMembers, activityLog } from '../../db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { broadcastToClients } from '../../utils/gateway';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const id = getRouterParam(event, 'id')!;
  const body = await readBody(event);

  // Verify member exists
  const [existing] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
  if (!existing) {
    throw createError({ statusCode: 404, message: 'Team member not found' });
  }

  // Validate memberType if provided
  if (body.memberType !== undefined && !['human', 'agent'].includes(body.memberType)) {
    throw createError({ statusCode: 400, message: 'memberType must be "human" or "agent"' });
  }

  // Validate openclawAgentId uniqueness if changing it
  if (body.openclawAgentId !== undefined && body.openclawAgentId !== null) {
    const [duplicate] = await db.select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.openclawAgentId, body.openclawAgentId),
        ne(teamMembers.id, id)
      ))
      .limit(1);
    if (duplicate) {
      throw createError({ statusCode: 409, message: `Agent with openclawAgentId "${body.openclawAgentId}" already exists` });
    }
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.memberType !== undefined) updates.memberType = body.memberType;
  if (body.emoji !== undefined) updates.emoji = body.emoji;
  if (body.role !== undefined) updates.role = body.role;
  if (body.model !== undefined) updates.model = body.model;
  if (body.specialties !== undefined) updates.specialties = JSON.stringify(body.specialties);
  if (body.description !== undefined) updates.description = body.description;
  if (body.status !== undefined) updates.status = body.status;
  if (body.openclawAgentId !== undefined) updates.openclawAgentId = body.openclawAgentId;
  if (body.agentDir !== undefined) updates.agentDir = body.agentDir;

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' });
  }

  await db.update(teamMembers).set(updates).where(eq(teamMembers.id, id));

  const [updated] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
  if (!updated) {
    throw createError({ statusCode: 404, message: 'Team member not found after update' });
  }
  const now = new Date().toISOString();

  // Log activity
  const logEntry = {
    id: uuidv4(),
    type: 'task_updated' as const,
    actor: 'system',
    message: `Team member updated: "${updated.name}"`,
    taskId: null,
    metadata: JSON.stringify({ memberId: id, changes: body }),
    createdAt: now
  };
  await db.insert(activityLog).values(logEntry);
  broadcastToClients({ event: 'team_updated', member: { ...updated, specialties: JSON.parse(updated.specialties || '[]') }, log: logEntry });

  return { ...updated, specialties: JSON.parse(updated.specialties || '[]') };
});
