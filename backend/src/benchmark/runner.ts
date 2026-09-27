import { prisma } from '../db';
import { AuthenticationTracer } from '../instrumentation/tracer';
import { TelemetryBuffer } from '../instrumentation/telemetry-buffer';
import { PasswordAuthService } from '../auth/password.service';
import { OtpAuthService } from '../auth/otp.service';
import { QrAuthService } from '../auth/qr.service';
import { QrOtpAuthService } from '../auth/qr-otp.service';
import { ResourceMonitor } from '../monitor/resource-monitor';

export interface BenchmarkConfig {
  experimentId: string;
  code: string;
  authMethod: 'PASSWORD' | 'OTP' | 'QR' | 'QR_OTP';
  loadModel: 'CLOSED_CONCURRENCY' | 'OPEN_ARRIVAL_RATE';
  targetVUs: number;
  targetRate?: number;
  durationSec: number;
  repetitions: number;
  addedLatencyMs: number;
  packetLossPct: number;
  cacheEnabled: boolean;
}

export interface LiveBenchmarkProgress {
  experimentId: string;
  runId: string;
  trialNumber: number;
  elapsedSec: number;
  durationSec: number;
  activeVUs: number;
  currentRps: number;
  completedRequests: number;
  successfulAuths: number;
  failedAuths: number;
  currentMedianLatencyMs: number;
  currentP95LatencyMs: number;
  currentP99LatencyMs: number;
  status: 'WARMING' | 'RUNNING' | 'COMPLETED' | 'ABORTED';
}

export class BenchmarkRunner {
  private static activeRunners: Map<string, BenchmarkRunner> = new Map();
  private isAborted: boolean = false;
  private latencies: number[] = [];
  private completedCount: number = 0;
  private successCount: number = 0;
  private failureCount: number = 0;
  private timeoutCount: number = 0;
  private liveListeners: ((progress: LiveBenchmarkProgress) => void)[] = [];

  constructor(private config: BenchmarkConfig) {}

  public static getActiveRunner(experimentId: string): BenchmarkRunner | undefined {
    return this.activeRunners.get(experimentId);
  }

  public subscribe(listener: (progress: LiveBenchmarkProgress) => void) {
    this.liveListeners.push(listener);
    return () => {
      this.liveListeners = this.liveListeners.filter((l) => l !== listener);
    };
  }

  private notifyProgress(progress: LiveBenchmarkProgress) {
    for (const l of this.liveListeners) {
      l(progress);
    }
  }

  public abort() {
    this.isAborted = true;
  }

  /**
   * Execute the full experimental protocol across all configured trials/repetitions
   */
  public async execute(): Promise<void> {
    BenchmarkRunner.activeRunners.set(this.config.experimentId, this);

    try {
      // Update experiment status
      await prisma.experiment.update({
        where: { id: this.config.experimentId },
        data: { status: 'RUNNING' },
      });

      const reps = Math.max(1, this.config.repetitions);
      for (let trial = 1; trial <= reps; trial++) {
        if (this.isAborted) break;
        await this.runSingleTrial(trial);
      }

      // Final telemetry flush
      await TelemetryBuffer.getInstance().flush();

      // Update experiment status
      await prisma.experiment.update({
        where: { id: this.config.experimentId },
        data: { status: this.isAborted ? 'FAILED' : 'COMPLETED' },
      });
    } catch (err) {
      console.error('Benchmark execution error:', err);
      await prisma.experiment.update({
        where: { id: this.config.experimentId },
        data: { status: 'FAILED' },
      });
    } finally {
      BenchmarkRunner.activeRunners.delete(this.config.experimentId);
    }
  }

  /**
   * Execute a single benchmark trial
   */
  private async runSingleTrial(trialNumber: number): Promise<void> {
    this.latencies = [];
    this.completedCount = 0;
    this.successCount = 0;
    this.failureCount = 0;
    this.timeoutCount = 0;

    // Create BenchmarkRun record
    const run = await prisma.benchmarkRun.create({
      data: {
        experimentId: this.config.experimentId,
        trialNumber,
        runStatus: 'WARMING',
      },
    });

    const resourceMonitor = ResourceMonitor.getInstance();
    resourceMonitor.setActiveBenchmarkRun(run.id);

    // Warm-up phase (50 warmup executions to stabilize JIT and DB connection pool)
    this.notifyProgress({
      experimentId: this.config.experimentId,
      runId: run.id,
      trialNumber,
      elapsedSec: 0,
      durationSec: this.config.durationSec,
      activeVUs: 1,
      currentRps: 0,
      completedRequests: 0,
      successfulAuths: 0,
      failedAuths: 0,
      currentMedianLatencyMs: 0,
      currentP95LatencyMs: 0,
      currentP99LatencyMs: 0,
      status: 'WARMING',
    });

    await this.executeWarmup(run.id);

    if (this.isAborted) {
      resourceMonitor.setActiveBenchmarkRun(null);
      return;
    }

    // Steady-state benchmark run
    await prisma.benchmarkRun.update({
      where: { id: run.id },
      data: { runStatus: 'RUNNING' },
    });

    const startTime = Date.now();
    const durationMs = this.config.durationSec * 1000;
    const endTime = startTime + durationMs;

    // Periodic telemetry emitter
    const progressTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const rps = elapsed > 0 ? parseFloat((this.completedCount / elapsed).toFixed(1)) : 0;
      const sorted = [...this.latencies].sort((a, b) => a - b);
      const median = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0;
      const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
      const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;

      this.notifyProgress({
        experimentId: this.config.experimentId,
        runId: run.id,
        trialNumber,
        elapsedSec: elapsed,
        durationSec: this.config.durationSec,
        activeVUs: this.config.targetVUs,
        currentRps: rps,
        completedRequests: this.completedCount,
        successfulAuths: this.successCount,
        failedAuths: this.failureCount,
        currentMedianLatencyMs: parseFloat(median.toFixed(2)),
        currentP95LatencyMs: parseFloat(p95.toFixed(2)),
        currentP99LatencyMs: parseFloat(p99.toFixed(2)),
        status: 'RUNNING',
      });
    }, 500);

    // Launch Virtual Users according to Closed or Open Model
    if (this.config.loadModel === 'CLOSED_CONCURRENCY') {
      const vuPromises: Promise<void>[] = [];
      const numVUs = Math.max(1, this.config.targetVUs);
      for (let vu = 1; vu <= numVUs; vu++) {
        vuPromises.push(this.runVirtualUser(run.id, vu, endTime));
      }
      await Promise.all(vuPromises);
    } else {
      // OPEN_ARRIVAL_RATE model
      const rate = this.config.targetRate || 10;
      const intervalMs = 1000 / rate;
      const arrivalPromises: Promise<void>[] = [];

      while (Date.now() < endTime && !this.isAborted) {
        arrivalPromises.push(this.executeAuthWorkflow(run.id, 1, true));
        await new Promise((res) => setTimeout(res, intervalMs));
      }
      await Promise.all(arrivalPromises);
    }

    clearInterval(progressTimer);
    resourceMonitor.setActiveBenchmarkRun(null);

    // Calculate final metrics for this trial
    const totalDurationSec = (Date.now() - startTime) / 1000;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const mean = this.latencies.length
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;
    const median = sorted.length ? sorted[Math.floor(sorted.length * 0.5)] : 0;
    const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0;
    const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
    const p99 = sorted.length ? sorted[Math.floor(sorted.length * 0.99)] : 0;
    const max = sorted.length ? sorted[sorted.length - 1] : 0;
    const throughput = totalDurationSec > 0 ? this.successCount / totalDurationSec : 0;

    await prisma.benchmarkRun.update({
      where: { id: run.id },
      data: {
        runStatus: this.isAborted ? 'FAILED' : 'COMPLETED',
        endTime: new Date(),
        totalRequests: this.completedCount,
        successfulAuths: this.successCount,
        failedAuths: this.failureCount,
        timeouts: this.timeoutCount,
        meanLatencyMs: parseFloat(mean.toFixed(2)),
        medianLatencyMs: parseFloat(median.toFixed(2)),
        p90LatencyMs: parseFloat(p90.toFixed(2)),
        p95LatencyMs: parseFloat(p95.toFixed(2)),
        p99LatencyMs: parseFloat(p99.toFixed(2)),
        maxLatencyMs: parseFloat(max.toFixed(2)),
        throughputRps: parseFloat(throughput.toFixed(2)),
      },
    });

    this.notifyProgress({
      experimentId: this.config.experimentId,
      runId: run.id,
      trialNumber,
      elapsedSec: this.config.durationSec,
      durationSec: this.config.durationSec,
      activeVUs: 0,
      currentRps: parseFloat(throughput.toFixed(1)),
      completedRequests: this.completedCount,
      successfulAuths: this.successCount,
      failedAuths: this.failureCount,
      currentMedianLatencyMs: parseFloat(median.toFixed(2)),
      currentP95LatencyMs: parseFloat(p95.toFixed(2)),
      currentP99LatencyMs: parseFloat(p99.toFixed(2)),
      status: this.isAborted ? 'ABORTED' : 'COMPLETED',
    });
  }

  /**
   * Run warmup phase
   */
  private async executeWarmup(runId: string): Promise<void> {
    const warmupCount = 15;
    for (let i = 0; i < warmupCount; i++) {
      if (this.isAborted) break;
      await this.executeAuthWorkflow(runId, 0, false);
    }
  }

  /**
   * Closed-loop virtual user loop
   */
  private async runVirtualUser(runId: string, vuId: number, endTime: number): Promise<void> {
    while (Date.now() < endTime && !this.isAborted) {
      await this.executeAuthWorkflow(runId, vuId, true);
      // Stochastic think time: 50ms to 150ms
      const thinkTime = 50 + Math.random() * 100;
      await new Promise((resolve) => setTimeout(resolve, thinkTime));
    }
  }

  /**
   * Execute complete end-to-end multi-stage authentication workflow
   */
  private async executeAuthWorkflow(
    runId: string,
    vuId: number,
    isWarm: boolean
  ): Promise<void> {
    // Network latency simulation
    if (this.config.addedLatencyMs > 0) {
      const halfRtt = this.config.addedLatencyMs / 2;
      await new Promise((res) => setTimeout(res, halfRtt));
    }

    // Packet loss simulation
    if (this.config.packetLossPct > 0 && Math.random() * 100 < this.config.packetLossPct) {
      this.completedCount++;
      this.failureCount++;
      this.timeoutCount++;
      return;
    }

    const tracer = new AuthenticationTracer({
      experimentId: this.config.experimentId,
      benchmarkRunId: runId,
      authMethod: this.config.authMethod,
      participantType: 'SYNTHETIC',
      isWarm,
    });

    const username = vuId > 0 && vuId <= 20 ? `benchmark_user_${vuId}` : 'benchmark_user';

    try {
      switch (this.config.authMethod) {
        case 'PASSWORD': {
          const res = await PasswordAuthService.authenticate(
            username,
            'ResearchBenchmark2026!',
            tracer
          );
          if (res.success) this.successCount++;
          else this.failureCount++;
          break;
        }

        case 'OTP': {
          const reqRes = await OtpAuthService.requestOtp(username, tracer);
          const verifyRes = await OtpAuthService.verifyOtp(
            reqRes.challengeToken,
            reqRes.mockCodeForTesting || '123456',
            tracer
          );
          if (verifyRes.success) this.successCount++;
          else this.failureCount++;
          break;
        }

        case 'QR': {
          const genRes = await QrAuthService.generateChallenge(username, tracer);
          const verifyRes = await QrAuthService.verifyScan(
            genRes.challengeToken,
            'device_sig_android_pixel_8_pro_test',
            tracer
          );
          if (verifyRes.success) this.successCount++;
          else this.failureCount++;
          break;
        }

        case 'QR_OTP': {
          const initRes = await QrOtpAuthService.initiate(username, tracer);
          const verifyRes = await QrOtpAuthService.verify(
            initRes.qrChallengeToken,
            initRes.otpChallengeToken,
            initRes.mockOtpCodeForTesting || '123456',
            'device_sig_android_pixel_8_pro_test',
            tracer
          );
          if (verifyRes.success) this.successCount++;
          else this.failureCount++;
          break;
        }
      }

      this.completedCount++;
      if (isWarm) {
        this.latencies.push(tracer.durationMs);
      }
      TelemetryBuffer.getInstance().push(tracer);
    } catch (err: any) {
      this.completedCount++;
      this.failureCount++;
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
    }
  }
}
