import { runWatcherCycle } from '../../plugins/taskWatcher'

export default defineEventHandler(async () => {
  await runWatcherCycle()
  return { ok: true, timestamp: new Date().toISOString() }
})
