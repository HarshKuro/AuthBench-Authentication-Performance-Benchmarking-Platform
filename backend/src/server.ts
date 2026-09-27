import Fastify from 'fastify';
import cors from '@fastify/cors';
import { CONFIG } from './config';
import { authRoutes } from './routes/auth.routes';
import { benchmarkRoutes } from './routes/benchmark.routes';
import { analyticsRoutes } from './routes/analytics.routes';
import { sseRoutes } from './routes/sse.routes';
import { ResourceMonitor } from './monitor/resource-monitor';
import { TelemetryBuffer } from './instrumentation/telemetry-buffer';

async function bootstrap() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'test' ? 'error' : 'info',
    },
  });

  // Enable Cross-Origin Resource Sharing
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Register API route modules
  await fastify.register(authRoutes);
  await fastify.register(benchmarkRoutes);
  await fastify.register(analyticsRoutes);
  await fastify.register(sseRoutes);

  // Health check endpoint
  fastify.get('/health', async () => {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      uptime: process.uptime(),
      resourceSnapshot: ResourceMonitor.getInstance().getLatestSnapshot(),
    };
  });

  // Start background resource sampler
  ResourceMonitor.getInstance();

  // Graceful shutdown handling
  const shutdown = async () => {
    fastify.log.info('Shutting down server gracefully...');
    ResourceMonitor.getInstance().stop();
    await TelemetryBuffer.getInstance().flush();
    TelemetryBuffer.getInstance().stop();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    const address = await fastify.listen({ port: CONFIG.PORT, host: CONFIG.HOST });
    fastify.log.info(`Research Benchmarking Platform backend running at ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
