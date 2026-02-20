import { useDb } from '../db';
import { tasks } from '../db/schema';
import { eq } from 'drizzle-orm';
import { dispatchTask, isDispatching } from '../utils/dispatcher';

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export default defineNitroPlugin(() => {
  console.log('[sweeper] Starting task sweeper (every 5m)...');

  // Run first cycle after a short delay (let startup finish)
  setTimeout(() => runSweeperCycle(), 5000);

  // Then run every 5 minutes
  setInterval(runSweeperCycle, INTERVAL_MS);
});

async function runSweeperCycle() {
  try {
    const db = useDb();
    const todoTasks = await db.select().from(tasks).where(eq(tasks.status, 'todo'));

    if (!todoTasks.length) return;

    console.log(`[sweeper] Found ${todoTasks.length} undispatched task(s)`);

    for (const task of todoTasks) {
      if (!isDispatching(task.id)) {
        dispatchTask(task, db);
      }
    }
  } catch (err) {
    console.error('[sweeper] Error:', err);
  }
}
