import { useDb } from '../db'
import { tasks, team } from '../db/schema'
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

  // Run first cycle immediately (but async to not block startup)
  Promise.resolve().then(() => runWatcherCycle())

  // Then run every 60 seconds
  _intervalId = setInterval(runWatcherCycle, INTERVAL_MS)
})

async function runWatcherCycle() {
  console.log('[autoWatcher] Running cycle...')

  try {
    const db = useDb()
    // Find any tasks that need work (assignee can be any agent name)
    const pending = await db.select().from(tasks).where(
      inArray(tasks.status, ACTIONABLE_STATUSES)
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

        // Look up agent info from team table
        const agent = await db.select().from(team).where(eq(team.name, task.assignee)).limit(1)
        dispatchBackground(task, agent[0] || null)
      }
    }
  }
  catch (err) {
    console.error('[autoWatcher] Error:', err)
  }
}

function dispatchBackground(task: any, agent: any) {
  const prompt = buildPrompt(task, agent)
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

function buildPrompt(task: any, agent: any): string {
  const agentInfo = agent ? `\n📋 **Agente:** ${agent.emoji} ${agent.name}\n🎯 **Especialidades:** ${agent.specialties.join(', ')}` : ''

  return `Nova task no Mission Control:${agentInfo}

**${task.title}**
${task.description || ''}

Quando terminar: curl -X PATCH http://localhost:4000/api/tasks/${task.id} -H "Content-Type: application/json" -d '{"status":"review"}'`
}
