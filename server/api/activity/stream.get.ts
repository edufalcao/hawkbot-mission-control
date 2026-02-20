import { registerSseClient, unregisterSseClient } from '../../utils/gateway';
import { v4 as uuidv4 } from 'uuid';

export default defineEventHandler((event) => {
  const clientId = uuidv4();

  setHeader(event, 'Content-Type', 'text/event-stream');
  setHeader(event, 'Cache-Control', 'no-cache');
  setHeader(event, 'Connection', 'keep-alive');
  setHeader(event, 'X-Accel-Buffering', 'no');

  const stream = sendStream(event, new ReadableStream({
    start(controller) {
      const write = (data: string) => controller.enqueue(new TextEncoder().encode(data));

      // Send initial connection event
      write(`data: ${JSON.stringify({ event: 'connected', clientId })}\n\n`);

      // Register client for broadcasts
      registerSseClient(clientId, write);

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          write(': heartbeat\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on disconnect
      event.node.req.on('close', () => {
        clearInterval(heartbeat);
        unregisterSseClient(clientId);
        controller.close();
      });
    }
  }));

  return stream;
});
