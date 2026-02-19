import { useDb } from '../db'
import { tasks, activityLog } from '../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { execSync } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'

// Statuses that need work: any hawkbot task not yet done or in review
const ACTIONABLE_STATUSES = ['todo', 'in_progress']

// How long before we consider an in_progress task "stalled" (ms)
const STALL_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

let _watcherTimer: ReturnType<typeof setInterval> | null = null

export default defineNitroPlugin(() => {
  console.log('[taskWatcher] Starting...')

  // Run immediately on startup, then every 60s
  runWatcherCycle()
  _watcherTimer = setInterval(runWatcherCycle, 60 * 1000)
})

export async function runWatcherCycle() {
  const db = useDb()

  try {
    // Find all hawkbot tasks that are not done/review
    const pending = await db.select().from(tasks).where(
      and(
        eq(tasks.assignee, 'hawkbot'),
        inArray(tasks.status, ACTIONABLE_STATUSES)
      )
    )

    if (!pending.length) return

    console.log(`[taskWatcher] Found ${pending.length} hawkbot task(s) to check`)

    for (const task of pending) {
      if (task.status === 'todo') {
        await dispatchTask(task)
      }
      else if (task.status === 'in_progress') {
        await checkStalledTask(task)
      }
    }
  }
  catch (err) {
    console.error('[taskWatcher] Cycle error:', err)
  }
}

async function dispatchTask(task: typeof tasks.$inferSelect) {
  const db = useDb()
  const now = new Date().toISOString()

  console.log(`[taskWatcher] Dispatching task "${task.title}" (${task.id})`)

  const prompt = buildPrompt(task)

  try {
    // Send message to main HawkBot session via CLI
    sendToMainSession(prompt)

    // Update task status to in_progress
    await db.update(tasks).set({
      status: 'in_progress',
      dispatchedAt: now,
      updatedAt: now
    }).where(eq(tasks.id, task.id))

    // Log activity
    await db.insert(activityLog).values({
      id: uuidv4(),
      type: 'agent_started',
      actor: 'hawkbot',
      message: `HawkBot started working on: "${task.title}"`,
      taskId: task.id,
      metadata: JSON.stringify({}),
      createdAt: now
    })

    console.log(`[taskWatcher] ✅ Task "${task.title}" dispatched → message sent to HawkBot main session`)
  }
  catch (err) {
    console.error(`[taskWatcher] Failed to dispatch task "${task.title}":`, err)
  }
}

async function checkStalledTask(task: typeof tasks.$inferSelect) {
  if (!task.dispatchedAt) return

  const dispatchedMs = new Date(task.dispatchedAt).getTime()
  const stalledMs = Date.now() - dispatchedMs

  if (stalledMs < STALL_TIMEOUT_MS) return

  // Task has been "in_progress" for too long without update
  // Reset to todo so it gets re-dispatched
  console.log(`[taskWatcher] Task "${task.title}" stalled for ${Math.round(stalledMs / 60000)}min → resetting to todo`)

  await useDb().update(tasks).set({
    status: 'todo',
    dispatchedAt: null,
    updatedAt: new Date().toISOString()
  }).where(eq(tasks.id, task.id))
}

function sendToMainSession(message: string) {
  // Escape message for CLI
  const escapedMessage = message.replace(/"/g, '\\"')
  const cmd = `openclaw agent --session-id agent:main:main --message "${escapedMessage}" --timeout 300`

  console.log(`[taskWatcher] Sending to main session: ${cmd.slice(0, 80)}...`)

  execSync(cmd, {
    encoding: 'utf-8',
    timeout: 120000, // 2 min timeout
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function buildPrompt(task: typeof tasks.$inferSelect): string {
  const tags = JSON.parse(task.tags || '[]') as string[]
  const lines = [
    `Nova task atribuída a você no Mission Control:`,
    ``,
    `**Título:** ${task.title}`,
  ]

  if (task.description) {
    lines.push(`**Descrição:** ${task.description}`)
  }

  if (tags.length) {
    lines.push(`**Tags:** ${tags.join(', ')}`)
  }

  lines.push(``, `Quando terminar, atualize o status da task para "review" usando:`)
  lines.push(`curl -X PATCH http://localhost:4000/api/tasks/${task.id} -H "Content-Type: application/json" -d '{"status": "review"}'`)
  lines.push(``, `Trabalhe de forma autônoma e entregue o resultado.`)

  return lines.join('\n')
}
