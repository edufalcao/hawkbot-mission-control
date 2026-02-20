import { useDb } from '../../db';
import { teamMembers } from '../../db/schema';

export default defineEventHandler(async () => {
  const db = useDb();
  const members = await db.select().from(teamMembers);
  return members.map(m => ({
    ...m,
    specialties: JSON.parse(m.specialties || '[]')
  }));
});
