import { useDb } from '../../db'
import { activityLog } from '../../db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  const logs = await db.select().from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(50)

  return logs.map(l => ({
    ...l,
    metadata: JSON.parse(l.metadata || '{}')
  }))
})
