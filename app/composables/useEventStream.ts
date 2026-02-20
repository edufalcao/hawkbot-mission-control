import { onMounted, onUnmounted } from 'vue';

type EventHandler = (data: Record<string, unknown>) => void;
type EventMap = Record<string, EventHandler>;

let eventSource: EventSource | null = null;
let refCount = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<EventHandler>>();

function connect() {
  if (eventSource) return;

  eventSource = new EventSource('/api/activity/stream');

  eventSource.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      const eventName = data.event;
      if (eventName && listeners.has(eventName)) {
        for (const handler of listeners.get(eventName)!) {
          handler(data);
        }
      }
    } catch {
      // ignore parse errors
    }
  };

  eventSource.onerror = () => {
    if (eventSource?.readyState === EventSource.CLOSED) {
      eventSource = null;
      reconnectTimer = setTimeout(() => {
        if (refCount > 0) connect();
      }, 5000);
    }
  };
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  eventSource?.close();
  eventSource = null;
}

export function useEventStream(events: EventMap) {
  if (import.meta.server) return;

  onMounted(() => {
    refCount++;

    for (const [eventName, handler] of Object.entries(events)) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, new Set());
      }
      listeners.get(eventName)!.add(handler);
    }

    if (refCount === 1) {
      connect();
    }
  });

  onUnmounted(() => {
    refCount--;

    for (const [eventName, handler] of Object.entries(events)) {
      listeners.get(eventName)?.delete(handler);
      if (listeners.get(eventName)?.size === 0) {
        listeners.delete(eventName);
      }
    }

    if (refCount <= 0) {
      refCount = 0;
      disconnect();
    }
  });
}
