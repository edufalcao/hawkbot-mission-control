import { useDb } from '../../db';
import { settings } from '../../db/schema';

export default defineEventHandler(async () => {
  const db = useDb();
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
});
