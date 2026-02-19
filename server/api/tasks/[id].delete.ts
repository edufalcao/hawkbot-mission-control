import { useDb } from '../../db'
import { tasks } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = useDb()
  const id = getRouterParam(event, 'id')!

  await db.delete(tasks).where(eq(tasks.id, id))
  return { success: true }
})
