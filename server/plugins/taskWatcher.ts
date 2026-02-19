import { useDb } from '../db'
import { tasks, activityLog } from '../db/schema'
import { eq, and, ne, inArray } from 'drizzle-orm'
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

async function runWatcherCycle() {
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
  const sessionKey = `task:${task.id}`
  const now = new Date().toISOString()

  console.log(`[taskWatcher] Dispatching task "${task.title}" (${task.id})`)

  const prompt = buildPrompt(task)

  try {
    // Dispatch to OpenClaw Gateway as an isolated agent session
    dispatchToGateway(sessionKey, prompt)

    // Update task status to in_progress
    await db.update(tasks).set({
      status: 'in_progress',
      sessionKey,
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
      metadata: JSON.stringify({ sessionKey }),
      createdAt: now
    })

    console.log(`[taskWatcher] ✅ Task "${task.title}" dispatched → session ${sessionKey}`)
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

  // Task has been "in_progress" for too long — check if session is still alive
  console.log(`[taskWatcher] Task "${task.title}" has been running for ${Math.round(stalledMs / 60000)}min, checking session...`)

  const sessionAlive = task.sessionKey ? isSessionAlive(task.sessionKey) : false

  if (!sessionAlive) {
    console.log(`[taskWatcher] Session for "${task.title}" is gone — re-dispatching`)
    // Reset to todo so it gets re-dispatched on next cycle
    await useDb().update(tasks).set({
      status: 'todo',
      sessionKey: null,
      dispatchedAt: null,
      updatedAt: new Date().toISOString()
    }).where(eq(tasks.id, task.id))
  }
}

function isSessionAlive(sessionKey: string): boolean {
  try {
    const output = execSync(
      `openclaw gateway call sessions.list --json --timeout 3000`,
      { encoding: 'utf-8', timeout: 4000 }
    )
    const data = JSON.parse(output)
    const sessions = data.sessions || []
    return sessions.some((s: { key: string }) => s.key === sessionKey)
  }
  catch {
    return false
  }
}

function dispatchToGateway(sessionKey: string, message: string) {
  // Use the OpenClaw CLI to dispatch an agent turn to an isolated session
  const escapedMessage = message.replace(/'/g, "'\\''")
  execSync(
    `openclaw gateway call agent.turn --params '{"sessionKey":"${sessionKey}","message":"${escapedMessage}","isolated":true}' --timeout 5000`,
    { encoding: 'utf-8', timeout: 6000 }
  )
}

function buildPrompt(task: typeof tasks.$inferSelect): string {
  const tags = JSON.parse(task.tags || '[]') as string[]
  const lines = [
    `You have been assigned a task in Mission Control. Please complete it.`,
    ``,
    `**Task:** ${task.title}`,
  ]

  if (task.description) {
    lines.push(`**Description:** ${task.description}`)
  }

  if (tags.length) {
    lines.push(`**Tags:** ${tags.join(', ')}`)
  }

  lines.push(``, `When finished, update the task status to "review" via the Mission Control API:`)
  lines.push(`PATCH http://localhost:4000/api/tasks/${task.id} → { "status": "review" }`)
  lines.push(``, `Work autonomously and deliver the result.`)

  return lines.join('\\n')
}
