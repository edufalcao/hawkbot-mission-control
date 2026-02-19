import { connectGateway } from '../utils/gateway'
import { seedDefaultTeam } from '../utils/seed'

export default defineNitroPlugin(async () => {
  console.log('[startup] HawkBot Mission Control initializing...')

  // Connect to OpenClaw Gateway
  connectGateway()

  // Seed default team members if empty
  await seedDefaultTeam()

  console.log('[startup] Ready ✅')
  console.log('[startup] Task watcher will run every 60s for @hawkbot tasks')
})
