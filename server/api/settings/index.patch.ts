import { useDb } from '../../db';
import { settings } from '../../db/schema';
import { eq } from 'drizzle-orm';

const ALLOWED_KEYS = [
  'gateway_url',
  'gateway_token',
  'workspace_path',
  'main_session_id'
];

export default defineEventHandler(async (event) => {
  const db = useDb();
  const body = await readBody(event);

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Request body must be an object of key-value pairs' });
  }

  const now = new Date().toISOString();
  const updated: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.includes(key)) {
      throw createError({ statusCode: 400, message: `Unknown setting key: "${key}"` });
    }
    if (typeof value !== 'string') {
      throw createError({ statusCode: 400, message: `Setting value for "${key}" must be a string` });
    }

    // Upsert: try update first, insert if not exists
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      await db.update(settings).set({ value, updatedAt: now }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value, updatedAt: now });
    }
    updated[key] = value;
  }

  // Return all settings after update
  const rows = await db.select().from(settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
});
