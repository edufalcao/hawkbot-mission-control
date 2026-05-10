import { useDb } from '../../db';
import { settings } from '../../db/schema';
import { getRuntimeHealth } from '../../utils/runtimeHealth';

export default defineEventHandler(async () => {
  const db = useDb();
  const rows = await db.select().from(settings);
  const settingsMap: Record<string, string> = {};
  for (const row of rows) settingsMap[row.key] = row.value;
  return getRuntimeHealth(settingsMap);
});
