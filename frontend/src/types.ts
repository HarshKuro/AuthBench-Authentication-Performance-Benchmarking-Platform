export type AuthMethod = 'PASSWORD' | 'OTP' | 'QR' | 'QR_OTP';
export type LoadModel = 'CLOSED_CONCURRENCY' | 'OPEN_ARRIVAL_RATE';

export interface StageData {
  stageName: string;
  sequenceOrder: number;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  metadata?: any;
}

export interface TraceDTO {
  traceId: string;
  experimentId?: string;
  benchmarkRunId?: string;
  authMethod: AuthMethod;
  participantType: 'SYNTHETIC' | 'HUMAN';
  durationMs: number;
  statusCode: number;
  success: boolean;
  errorMessage?: string;
  isWarm: boolean;
  outlierClass: string;
  stages: StageData[];
}

export interface ResourceSnapshot {
  timestamp: string;
  cpuPercent: number;
  memoryRssMb: number;
  memoryHeapMb: number;
  eventLoopLagMs: number;
  activeDbConns: number;
}

export interface LiveProgress {
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

export interface MethodComparison {
  count: number;
  meanLatencyMs: number;
  medianLatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  successRatePct: number;
  latencyOverheadPct: number;
}

export interface BottleneckStage {
  stage: string;
  meanDurationMs: number;
  percentage: number;
}

export interface ScalabilityPoint {
  vus: number;
  latencyP95: number;
  throughputRps: number;
}
