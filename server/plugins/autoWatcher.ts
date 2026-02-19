import { useDb } from '../db'
import { tasks } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { spawn } from 'node:child_process'

const MAIN_SESSION_ID = 'f2b711cf-c351-4d1e-8a70-38d0a0700c21'
const ACTIONABLE_STATUSES = ['todo', 'in_progress']
const INTERVAL_MS = 60 * 1000 // 60 seconds

// Track dispatching state in memory
const _dispatching = new Set<string>()
let _intervalId: ReturnType<typeof setInterval> | null = null

export default defineNitroPlugin(() => {
  console.log('[autoWatcher] Starting automatic task watcher (every 60s)...')

  // Run first cycle after 10 seconds
  setTimeout(runWatcherCycle, 10 * 1000)

  // Then run every 60 seconds
  _intervalId = setInterval(runWatcherCycle, INTERVAL_MS)
})

async function runWatcherCycle() {
  const db = useDb()

  try {
    // Find hawkbot tasks that need work
    const pending = await db.select().from(tasks).where(
      and(
        eq(tasks.assignee, 'hawkbot'),
        inArray(tasks.status, ACTIONABLE_STATUSES)
      )
    )

    if (!pending.length) return

    console.log(`[autoWatcher] Found ${pending.length} task(s) needing dispatch`)

    for (const task of pending) {
      if (task.status === 'todo') {
        // Skip if already being dispatched
        if (_dispatching.has(task.id)) {
          console.log(`[autoWatcher] Skipping ${task.title} — already dispatching`)
          continue
        }

        _dispatching.add(task.id)

        // Update status immediately to prevent re-dispatch
        await db.update(tasks).set({
          status: 'in_progress',
          dispatchedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).where(eq(tasks.id, task.id))

        console.log(`[autoWatcher] Dispatching: ${task.title}`)
        dispatchBackground(task)
      }
    }
  }
  catch (err) {
    console.error('[autoWatcher] Error:', err)
  }
}

function dispatchBackground(task: any) {
  const prompt = buildPrompt(task)
  const escaped = prompt.replace(/"/g, '\\"')
  const cmd = `openclaw agent --session-id ${MAIN_SESSION_ID} --message "${escaped}"`

  const child = spawn('sh', ['-c', cmd], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  })

  child.unref()

  child.on('close', (code) => {
    _dispatching.delete(task.id)

    if (code === 0) {
      console.log(`[autoWatcher] ✅ Success: ${task.title}`)
    }
    else {
      console.error(`[autoWatcher] ❌ Failed: ${task.title} (code ${code})`)
      // Revert to todo on failure
      const db = useDb()
      db.update(tasks).set({
        status: 'todo',
        dispatchedAt: null,
        updatedAt: new Date().toISOString()
      }).where(eq(tasks.id, task.id))
    }
  })
}

function buildPrompt(task: any): string {
  return `Nova task no Mission Control:

**${task.title}**
${task.description || ''}

Quando terminar: curl -X PATCH http://localhost:4000/api/tasks/${task.id} -H "Content-Type: application/json" -d '{"status":"review"}'`
}
