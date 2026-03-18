import { randomUUID } from 'crypto';
import WebSocket from 'ws';

let _ws: WebSocket | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _pingInterval: ReturnType<typeof setInterval> | null = null;
let _connected = false;

export function isGatewayConnected(): boolean {
  return _connected;
}

export function getGatewayWs(): WebSocket | null {
  return _ws;
}

function clearTimers() {
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
  if (_pingInterval) {
    clearInterval(_pingInterval);
    _pingInterval = null;
  }
}

function handleGatewayMessage(data: WebSocket.RawData, token: string) {
  try {
    const msg = JSON.parse(data.toString());

    // Respond to the gateway handshake challenge
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      const connectReq = {
        type: 'req',
        id: randomUUID(),
        method: 'connect',
        params: {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: 'gateway-client',
            displayName: 'HawkBot Mission Control',
            version: '1.0.0',
            platform: 'node',
            mode: 'backend'
          },
          role: 'operator',
          scopes: [],
          auth: { token }
        }
      };
      _ws?.send(JSON.stringify(connectReq));
      return;
    }

    // Handle successful handshake response
    if (msg.type === 'res' && msg.ok && msg.payload?.type === 'hello-ok') {
      _connected = true;
      console.log(`[gateway] Handshake complete (protocol ${msg.payload.protocol}, server ${msg.payload.server?.version})`);
      return;
    }

    // Broadcast all other messages to SSE clients
    broadcastToClients(msg);
  } catch {
    // ignore parse errors
  }
}

export function connectGateway() {
  const config = useRuntimeConfig();
  const url = config.gatewayUrl;
  const token = config.gatewayToken;

  if (!url) {
    console.warn('[gateway] OPENCLAW_GATEWAY_URL not set, skipping connection');
    return;
  }

  // Prevent duplicate connection attempts
  if (_ws && (_ws.readyState === WebSocket.CONNECTING || _ws.readyState === WebSocket.OPEN)) {
    return;
  }

  clearTimers();

  console.log(`[gateway] Connecting to ${url}...`);

  _ws = new WebSocket(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  _ws.on('open', () => {
    console.log('[gateway] Connected, awaiting handshake...');
    clearTimers();

    // Send ping every 30s to keep the connection alive
    _pingInterval = setInterval(() => {
      if (_ws?.readyState === WebSocket.OPEN) {
        _ws.ping();
      }
    }, 30_000);
  });

  _ws.on('message', data => handleGatewayMessage(data, token));

  _ws.on('error', (err) => {
    console.error('[gateway] WebSocket error:', err.message);
  });

  _ws.on('close', (code, reason) => {
    const wasConnected = _connected;
    _connected = false;
    _ws = null;
    clearTimers();

    if (code === 1000 && wasConnected) {
      console.log('[gateway] Disconnected cleanly. Reconnecting in 5s...');
    } else {
      console.warn(`[gateway] Disconnected (code=${code}, reason="${reason?.toString() || 'none'}"). Reconnecting in 5s...`);
    }

    _reconnectTimer = setTimeout(connectGateway, 5000);
  });
}

// SSE client registry for live feed
type SseClient = { id: string, write: (data: string) => void };
const sseClients = new Map<string, SseClient>();

export function registerSseClient(id: string, write: (data: string) => void) {
  sseClients.set(id, { id, write });
}

export function unregisterSseClient(id: string) {
  sseClients.delete(id);
}

export function broadcastToClients(data: unknown) {
  const msg = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients.values()) {
    try {
      client.write(msg);
    } catch {
      sseClients.delete(client.id);
    }
  }
}
