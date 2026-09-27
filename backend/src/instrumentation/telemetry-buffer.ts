import { prisma } from '../db';
import { AuthenticationTracer } from './tracer';

export class TelemetryBuffer {
  private static instance: TelemetryBuffer;
  private queue: AuthenticationTracer[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private readonly BATCH_SIZE = 100;

  private constructor() {
    this.startPeriodicFlush();
  }

  public static getInstance(): TelemetryBuffer {
    if (!TelemetryBuffer.instance) {
      TelemetryBuffer.instance = new TelemetryBuffer();
    }
    return TelemetryBuffer.instance;
  }

  public push(tracer: AuthenticationTracer): void {
    this.queue.push(tracer);
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush().catch((err) => {
        console.error('Error auto-flushing telemetry batch:', err);
      });
    }
  }

  public async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;

    const batch = this.queue.splice(0, this.BATCH_SIZE);
    try {
      for (const tracer of batch) {
        // Create AuthenticationTrace record
        const createdTrace = await prisma.authenticationTrace.create({
          data: {
            traceId: tracer.traceId,
            benchmarkRunId: tracer.benchmarkRunId || null,
            authMethod: tracer.authMethod,
            participantType: tracer.participantType,
            startNano: tracer.startNano.toString(),
            endNano: tracer.endNano.toString(),
            durationMs: tracer.durationMs,
            statusCode: tracer.statusCode,
            success: tracer.success,
            errorMessage: tracer.errorMessage || null,
            isWarm: tracer.isWarm,
            outlierClass: tracer.outlierClass,
            stages: {
              create: tracer.getStages().map((stage) => ({
                stageName: stage.stageName,
                sequenceOrder: stage.sequenceOrder,
                startNano: stage.startNano.toString(),
                endNano: stage.endNano.toString(),
                durationMs: stage.durationMs,
                status: stage.status,
                metadataJson: stage.metadata ? JSON.stringify(stage.metadata) : null,
              })),
            },
          },
        });
      }
    } catch (error) {
      console.error('Failed to flush telemetry batch to database:', error);
      // Re-queue on failure so data isn't lost
      this.queue.unshift(...batch);
    } finally {
      this.isFlushing = false;
    }
  }

  private startPeriodicFlush(): void {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flushInterval = setInterval(() => {
      this.flush().catch((err) => console.error('Periodic flush failed:', err));
    }, 1000);
  }

  public stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}
