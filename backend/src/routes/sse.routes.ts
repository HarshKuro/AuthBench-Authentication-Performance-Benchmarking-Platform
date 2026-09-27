import { FastifyInstance } from 'fastify';
import { ResourceMonitor } from '../monitor/resource-monitor';

export async function sseRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/sse/live', (request, reply) => {
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial snapshot
    const initialSnapshot = ResourceMonitor.getInstance().getLatestSnapshot();
    reply.raw.write(`data: ${JSON.stringify({ type: 'RESOURCE_METRIC', data: initialSnapshot })}\n\n`);

    // Subscribe to resource metrics
    const unsubscribeResource = ResourceMonitor.getInstance().subscribe((snapshot) => {
      reply.raw.write(`data: ${JSON.stringify({ type: 'RESOURCE_METRIC', data: snapshot })}\n\n`);
    });

    // Keepalive heartbeat
    const heartbeat = setInterval(() => {
      reply.raw.write(': heartbeat\n\n');
    }, 15000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      unsubscribeResource();
    });
  });
}
