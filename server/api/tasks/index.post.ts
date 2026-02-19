import { useDb } from '../../db'
import { tasks, activityLog } from '../../db/schema'
import { broadcastToClients } from '../../utils/gateway'
import { v4 as uuidv4 } from 'uuid'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const body = await readBody(event)
  const now = new Date().toISOString()

  const task = {
    id: uuidv4(),
    title: body.title,
    description: body.description || '',
    status: body.status || 'todo',
    assignee: body.assignee || 'eduardo',
    priority: body.priority || 'none',
    tags: JSON.stringify(body.tags || []),
    createdAt: now,
    updatedAt: now,
    completedAt: null
  }

  await db.insert(tasks).values(task)

  // Log activity
  const logEntry = {
    id: uuidv4(),
    type: 'task_created' as const,
    actor: body.assignee === 'hawkbot' ? 'hawkbot' : 'eduardo',
    message: `Task created: "${task.title}"`,
    taskId: task.id,
    metadata: JSON.stringify({}),
    createdAt: now
  }
  await db.insert(activityLog).values(logEntry)
  broadcastToClients({ event: 'task_created', task: { ...task, tags: body.tags || [] }, log: logEntry })

  return { ...task, tags: body.tags || [] }
})
