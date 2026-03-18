import { useDb } from '../../db';
import { teamMembers, activityLog } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { broadcastToClients } from '../../utils/gateway';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler(async (event) => {
  const db = useDb();
  const body = await readBody(event);
  const now = new Date().toISOString();

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'Name is required' });
  }

  if (!body.memberType || !['human', 'agent'].includes(body.memberType)) {
    throw createError({ statusCode: 400, message: 'memberType must be "human" or "agent"' });
  }

  // Validate openclawAgentId uniqueness if provided
  if (body.openclawAgentId) {
    const [existing] = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.openclawAgentId, body.openclawAgentId))
      .limit(1);
    if (existing) {
      throw createError({ statusCode: 409, message: `Agent with openclawAgentId "${body.openclawAgentId}" already exists` });
    }
  }

  const member = {
    id: uuidv4(),
    name: body.name,
    memberType: body.memberType as 'human' | 'agent',
    emoji: body.emoji || (body.memberType === 'human' ? '👤' : '🤖'),
    role: body.role || (body.memberType === 'human' ? 'member' : 'assistant'),
    model: body.model || null,
    specialties: JSON.stringify(body.specialties || []),
    description: body.description || '',
    status: 'idle' as const,
    currentTaskId: null,
    lastUsed: null,
    openclawAgentId: body.openclawAgentId || null,
    agentDir: body.agentDir || null,
    usageCount: 0,
    successCount: 0,
    createdAt: now
  };

  await db.insert(teamMembers).values(member);

  // Log activity
  const logEntry = {
    id: uuidv4(),
    type: 'task_updated' as const,
    actor: 'system',
    message: `Team member added: "${member.name}" (${member.memberType})`,
    taskId: null,
    metadata: JSON.stringify({ memberId: member.id }),
    createdAt: now
  };
  await db.insert(activityLog).values(logEntry);
  broadcastToClients({ event: 'team_updated', member: { ...member, specialties: body.specialties || [] }, log: logEntry });

  return { ...member, specialties: body.specialties || [] };
});
