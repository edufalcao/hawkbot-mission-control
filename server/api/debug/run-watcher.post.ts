import { useDb } from '../../db'
import { tasks, activityLog } from '../../db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { spawn } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'

const ACTIONABLE_STATUSES = ['todo', 'in_progress']
const MAIN_SESSION_ID = 'f2b711cf-c351-4d1e-8a70-38d0a0700c21'

// In-memory set to prevent double-dispatch within the same cycle
const _dispatching = new Set<string>()

export default defineEventHandler(async () => {
  const db = useDb()

  // Find all hawkbot tasks that are not done/review
  const pending = await db.select().from(tasks).where(
    and(
      eq(tasks.assignee, 'hawkbot'),
      inArray(tasks.status, ACTIONABLE_STATUSES)
    )
  )

  console.log(`[watcher] Found ${pending.length} hawkbot task(s)`)

  for (const task of pending) {
    if (task.status === 'todo') {
      // Skip if already being dispatched in this cycle
      if (_dispatching.has(task.id)) {
        console.log(`[watcher] Skipping ${task.title} — already dispatching`)
        continue
      }
      
      _dispatching.add(task.id)
      console.log(`[watcher] Dispatching: ${task.title}`)
      
      const prompt = buildPrompt(task)
      
      // Run in background, don't wait
      dispatchTaskAsync(task, prompt, () => _dispatching.delete(task.id))
    }
  }

  return { queued: pending.length }
})

function dispatchTaskAsync(task: any, prompt: string, onDone?: () => void) {
  const escaped = prompt.replace(/"/g, '\\"')
  const cmd = `openclaw agent --session-id ${MAIN_SESSION_ID} --message "${escaped}"`
  
  console.log(`[watcher] Running: ${cmd.slice(0, 60)}...`)
  
  const child = spawn('sh', ['-c', cmd], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  })
  
  let stdout = ''
  let stderr = ''
  
  child.stdout?.on('data', (d) => { stdout += d })
  child.stderr?.on('data', (d) => { stderr += d })
  
  child.on('close', async (code) => {
    onDone?.()
    const db = useDb()
    const now = new Date().toISOString()
    
    if (code === 0) {
      console.log(`[watcher] ✅ Success: ${task.title}`)
      
      await db.update(tasks).set({
        status: 'in_progress',
        dispatchedAt: now,
        updatedAt: now
      }).where(eq(tasks.id, task.id))
      
      await db.insert(activityLog).values({
        id: uuidv4(),
        type: 'agent_started',
        actor: 'hawkbot',
        message: `HawkBot started: "${task.title}"`,
        taskId: task.id,
        metadata: '{}',
        createdAt: now
      })
    }
    else {
      console.error(`[watcher] ❌ Failed: ${task.title}`, stderr || stdout)
    }
  })
  
  // Unref so parent can exit
  child.unref()
}

function buildPrompt(task: any): string {
  const lines = [
    `Nova task no Mission Control:`,
    `**${task.title}**`,
  ]
  if (task.description) lines.push(task.description)
  lines.push(``, `Quando terminar: curl -X PATCH http://localhost:4000/api/tasks/${task.id} -H "Content-Type: application/json" -d '{"status":"review"}'`)
  return lines.join('\n')
}
