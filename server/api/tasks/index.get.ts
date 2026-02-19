import { useDb } from '../../db'
import { tasks } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const query = getQuery(event)

  let result = db.select().from(tasks).orderBy(desc(tasks.createdAt))

  if (query.status) {
    result = db.select().from(tasks)
      .where(eq(tasks.status, query.status as string))
      .orderBy(desc(tasks.createdAt))
  }

  if (query.assignee) {
    result = db.select().from(tasks)
      .where(eq(tasks.assignee, query.assignee as string))
      .orderBy(desc(tasks.createdAt))
  }

  const rows = await result
  return rows.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]')
  }))
})
