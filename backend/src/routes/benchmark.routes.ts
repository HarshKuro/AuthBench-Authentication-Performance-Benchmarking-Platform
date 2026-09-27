import { FastifyInstance } from 'fastify';
import { prisma } from '../db';
import { BenchmarkRunner, BenchmarkConfig } from '../benchmark/runner';

export async function benchmarkRoutes(fastify: FastifyInstance) {
  // List all experiments
  fastify.get('/api/v1/benchmark/experiments', async (request, reply) => {
    const experiments = await prisma.experiment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        benchmarkRuns: {
          orderBy: { trialNumber: 'asc' },
        },
      },
    });
    return reply.send(experiments);
  });

  // Create experiment
  fastify.post('/api/v1/benchmark/experiment', async (request, reply) => {
    const body = (request.body as any) || {};
    const code = body.code || `EXP-${Date.now().toString().slice(-4)}`;
    const experiment = await prisma.experiment.create({
      data: {
        code,
        title: body.title || `Benchmark for ${body.authMethod}`,
        description: body.description || 'Performance evaluation benchmark',
        hypothesis: body.hypothesis || 'H1: Method latency differs significantly under concurrency',
        authMethod: body.authMethod || 'PASSWORD',
        loadModel: body.loadModel || 'CLOSED_CONCURRENCY',
        targetVUs: parseInt(body.targetVUs || '10', 10),
        targetRate: body.targetRate ? parseFloat(body.targetRate) : null,
        durationSec: parseInt(body.durationSec || '10', 10),
        repetitions: parseInt(body.repetitions || '1', 10),
        networkProfile: body.networkProfile || 'LAN_0MS',
        addedLatencyMs: parseInt(body.addedLatencyMs || '0', 10),
        packetLossPct: parseFloat(body.packetLossPct || '0.0'),
        cacheEnabled: Boolean(body.cacheEnabled),
        status: 'CONFIGURED',
      },
    });
    return reply.code(201).send(experiment);
  });

  // Get single experiment
  fastify.get('/api/v1/benchmark/experiment/:id', async (request, reply) => {
    const { id } = request.params as any;
    const experiment = await prisma.experiment.findUnique({
      where: { id },
      include: {
        benchmarkRuns: {
          include: {
            resourceMetrics: {
              orderBy: { timestamp: 'asc' },
              take: 50,
            },
          },
        },
        statisticalResults: true,
      },
    });
    if (!experiment) return reply.code(404).send({ error: 'Experiment not found' });
    return reply.send(experiment);
  });

  // Trigger benchmark execution
  fastify.post('/api/v1/benchmark/run/:id', async (request, reply) => {
    const { id } = request.params as any;
    const exp = await prisma.experiment.findUnique({ where: { id } });
    if (!exp) return reply.code(404).send({ error: 'Experiment not found' });

    if (BenchmarkRunner.getActiveRunner(id)) {
      return reply.code(409).send({ error: 'Benchmark is already running for this experiment' });
    }

    const config: BenchmarkConfig = {
      experimentId: exp.id,
      code: exp.code,
      authMethod: exp.authMethod as any,
      loadModel: exp.loadModel as any,
      targetVUs: exp.targetVUs,
      targetRate: exp.targetRate || undefined,
      durationSec: exp.durationSec,
      repetitions: exp.repetitions,
      addedLatencyMs: exp.addedLatencyMs,
      packetLossPct: exp.packetLossPct,
      cacheEnabled: exp.cacheEnabled,
    };

    const runner = new BenchmarkRunner(config);
    // Execute asynchronously in background
    runner.execute().catch((err) => {
      console.error(`Runner error for experiment ${id}:`, err);
    });

    return reply.send({
      message: 'Benchmark execution started',
      experimentId: exp.id,
      status: 'RUNNING',
    });
  });

  // Abort running benchmark
  fastify.post('/api/v1/benchmark/abort/:id', async (request, reply) => {
    const { id } = request.params as any;
    const runner = BenchmarkRunner.getActiveRunner(id);
    if (!runner) {
      return reply.code(404).send({ error: 'No active benchmark runner for this experiment' });
    }
    runner.abort();
    return reply.send({ message: 'Abort signal dispatched' });
  });

  // Quick Automated Suite: Run baseline suite across all 4 methods
  fastify.post('/api/v1/benchmark/quick-suite', async (request, reply) => {
    const body = (request.body as any) || {};
    const vus = parseInt(body.targetVUs || '10', 10);
    const duration = parseInt(body.durationSec || '5', 10);

    const methods: ('PASSWORD' | 'OTP' | 'QR' | 'QR_OTP')[] = [
      'PASSWORD',
      'OTP',
      'QR',
      'QR_OTP',
    ];

    const createdIds: string[] = [];

    // Create experiments for each
    for (const m of methods) {
      const exp = await prisma.experiment.create({
        data: {
          code: `SUITE-${m}-${Date.now().toString().slice(-4)}`,
          title: `Automated Suite: ${m} at ${vus} VUs`,
          hypothesis: `Evaluate latency overhead of ${m} compared to password baseline`,
          authMethod: m,
          loadModel: 'CLOSED_CONCURRENCY',
          targetVUs: vus,
          durationSec: duration,
          repetitions: 1,
          networkProfile: 'LAN_0MS',
          addedLatencyMs: 0,
          status: 'CONFIGURED',
        },
      });
      createdIds.push(exp.id);
    }

    // Launch sequential runner in background
    (async () => {
      for (const id of createdIds) {
        const exp = await prisma.experiment.findUnique({ where: { id } });
        if (!exp) continue;
        const runner = new BenchmarkRunner({
          experimentId: exp.id,
          code: exp.code,
          authMethod: exp.authMethod as any,
          loadModel: exp.loadModel as any,
          targetVUs: exp.targetVUs,
          durationSec: exp.durationSec,
          repetitions: 1,
          addedLatencyMs: 0,
          packetLossPct: 0,
          cacheEnabled: false,
        });
        await runner.execute();
      }
    })().catch((err) => console.error('Quick suite execution error:', err));

    return reply.send({
      message: 'Quick benchmark suite queued for all 4 authentication methods',
      experimentIds: createdIds,
    });
  });
}
