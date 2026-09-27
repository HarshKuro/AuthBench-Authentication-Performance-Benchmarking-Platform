import os from 'os';
import { monitorEventLoopDelay, IntervalHistogram } from 'perf_hooks';
import { prisma } from '../db';

export interface SystemResourceSnapshot {
  timestamp: string;
  cpuPercent: number;
  memoryRssMb: number;
  memoryHeapMb: number;
  eventLoopLagMs: number;
  activeDbConns: number;
}

export class ResourceMonitor {
  private static instance: ResourceMonitor;
  private elHistogram: IntervalHistogram;
  private lastCpuUsage: NodeJS.CpuUsage;
  private lastCpuTime: number;
  private intervalTimer: NodeJS.Timeout | null = null;
  private activeBenchmarkRunId: string | null = null;
  private latestSnapshot: SystemResourceSnapshot;
  private listeners: ((snapshot: SystemResourceSnapshot) => void)[] = [];

  private constructor() {
    this.elHistogram = monitorEventLoopDelay({ resolution: 10 });
    this.elHistogram.enable();
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = Date.now();

    this.latestSnapshot = {
      timestamp: new Date().toISOString(),
      cpuPercent: 0,
      memoryRssMb: 0,
      memoryHeapMb: 0,
      eventLoopLagMs: 0,
      activeDbConns: 1,
    };

    this.startSampling();
  }

  public static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  public setActiveBenchmarkRun(runId: string | null) {
    this.activeBenchmarkRunId = runId;
  }

  public subscribe(listener: (snapshot: SystemResourceSnapshot) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getLatestSnapshot(): SystemResourceSnapshot {
    return this.latestSnapshot;
  }

  private startSampling() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
    this.intervalTimer = setInterval(async () => {
      try {
        const now = Date.now();
        const elapsedMs = now - this.lastCpuTime;
        const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
        this.lastCpuUsage = process.cpuUsage();
        this.lastCpuTime = now;

        const totalCpuMicros = currentCpuUsage.user + currentCpuUsage.system;
        const numCores = os.cpus().length || 1;
        const cpuPercent = parseFloat(
          Math.min(100, (totalCpuMicros / (elapsedMs * 1000 * numCores)) * 100).toFixed(1)
        );

        const mem = process.memoryUsage();
        const memoryRssMb = parseFloat((mem.rss / (1024 * 1024)).toFixed(2));
        const memoryHeapMb = parseFloat((mem.heapUsed / (1024 * 1024)).toFixed(2));

        const eventLoopLagMs = parseFloat(
          (this.elHistogram.mean / 1_000_000).toFixed(2)
        );
        this.elHistogram.reset();

        this.latestSnapshot = {
          timestamp: new Date().toISOString(),
          cpuPercent,
          memoryRssMb,
          memoryHeapMb,
          eventLoopLagMs,
          activeDbConns: 1,
        };

        for (const listener of this.listeners) {
          listener(this.latestSnapshot);
        }

        if (this.activeBenchmarkRunId) {
          await prisma.resourceMetric.create({
            data: {
              benchmarkRun: { connect: { id: this.activeBenchmarkRunId } },
              cpuPercent,
              memoryRssMb,
              memoryHeapMb,
              eventLoopLagMs,
              activeDbConns: 1,
            },
          });
        }
      } catch (err) {
        // Silently ignore transient sampling errors
      }
    }, 500);
  }

  public stop() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.elHistogram.disable();
  }
}
