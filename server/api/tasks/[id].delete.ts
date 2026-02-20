import { useDb } from '../../db'
import { tasks, activityLog } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { broadcastToClients } from '../../utils/gateway'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = getRouterParam(event, 'id')!
  const now = new Date().toISOString()

  // Fetch task before deleting (for log message)
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id))

  await db.delete(tasks).where(eq(tasks.id, id))

  // Log activity and broadcast
  if (existing) {
    const logEntry = {
      id: uuidv4(),
      type: 'task_updated' as const,
      actor: 'eduardo',
      message: `Task deleted: "${existing.title}"`,
      taskId: id,
      metadata: JSON.stringify({}),
      createdAt: now
    }
    await db.insert(activityLog).values(logEntry)
    broadcastToClients({ event: 'task_deleted', taskId: id, log: logEntry })
  }

  return { success: true }
})
