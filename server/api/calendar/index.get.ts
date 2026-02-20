import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface CalendarEvent {
  id: string
  title: string
  type: 'cron_job' | 'reminder' | 'milestone'
  scheduledAt: string | null
  recurring: string | null
  cronExpr: string | null
  jobId: string | null
  status: string
  lastRun: string | null
  nextRun: string | null
}

export default defineEventHandler(async () => {
  const events: CalendarEvent[] = []

  // Try to load from workspace calendar.json
  const config = useRuntimeConfig()
  const calendarPath = join(config.workspacePath, 'memory', 'calendar.json')

  if (existsSync(calendarPath)) {
    try {
      const data = JSON.parse(readFileSync(calendarPath, 'utf-8'))
      return data
    } catch {
      // fall through to gateway fetch
    }
  }

  // Try to fetch cron jobs from gateway via CLI
  try {
    const output = execSync('openclaw gateway call cron.list --json --timeout 5000', {
      encoding: 'utf-8',
      timeout: 6000
    })
    const data = JSON.parse(output)
    const jobs = data.jobs || []

    for (const job of jobs) {
      events.push({
        id: job.id,
        title: job.name || 'Unnamed Job',
        type: 'cron_job',
        scheduledAt: null,
        recurring: job.schedule?.kind || null,
        cronExpr: job.schedule?.expr || null,
        jobId: job.id,
        status: job.enabled ? 'scheduled' : 'disabled',
        lastRun: job.lastRun || null,
        nextRun: job.nextRun || null
      })
    }
  } catch {
    // Gateway not available
  }

  return { events, lastSync: new Date().toISOString() }
})
