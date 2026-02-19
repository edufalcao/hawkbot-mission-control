import WebSocket from 'ws'

let _ws: WebSocket | null = null
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null

export function getGatewayWs(): WebSocket | null {
  return _ws
}

export function connectGateway() {
  const config = useRuntimeConfig()
  const url = config.gatewayUrl
  const token = config.gatewayToken

  if (!url) {
    console.warn('[gateway] OPENCLAW_GATEWAY_URL not set, skipping connection')
    return
  }

  console.log(`[gateway] Connecting to ${url}...`)

  _ws = new WebSocket(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })

  _ws.on('open', () => {
    console.log('[gateway] Connected ✅')
    if (_reconnectTimer) {
      clearTimeout(_reconnectTimer)
      _reconnectTimer = null
    }
  })

  _ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      // Broadcast to SSE clients
      broadcastToClients(msg)
    }
    catch {
      // ignore parse errors
    }
  })

  _ws.on('error', (err) => {
    console.error('[gateway] WebSocket error:', err.message)
  })

  _ws.on('close', () => {
    console.warn('[gateway] Disconnected. Reconnecting in 5s...')
    _ws = null
    _reconnectTimer = setTimeout(connectGateway, 5000)
  })
}

// SSE client registry for live feed
type SseClient = { id: string, write: (data: string) => void }
const sseClients = new Map<string, SseClient>()

export function registerSseClient(id: string, write: (data: string) => void) {
  sseClients.set(id, { id, write })
}

export function unregisterSseClient(id: string) {
  sseClients.delete(id)
}

export function broadcastToClients(data: unknown) {
  const msg = `data: ${JSON.stringify(data)}\n\n`
  for (const client of sseClients.values()) {
    try {
      client.write(msg)
    }
    catch {
      sseClients.delete(client.id)
    }
  }
}
