import { v4 as uuidv4 } from 'uuid';

export type StageName =
  | 'REQUEST_RECEIVED'
  | 'AUTH_METHOD_SELECTED'
  | 'PASSWORD_HASH_VERIFY'
  | 'QR_GEN'
  | 'QR_RENDER'
  | 'QR_SCAN_EVENT'
  | 'QR_VAL'
  | 'OTP_GEN'
  | 'OTP_DELIVERY_MOCK'
  | 'OTP_VAL'
  | 'DB_QUERY'
  | 'SESSION_CREATE'
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILED';

export interface StageSpan {
  stageName: StageName;
  sequenceOrder: number;
  startNano: bigint;
  endNano: bigint;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT';
  metadata?: Record<string, any>;
}

export class AuthenticationTracer {
  public readonly traceId: string;
  public readonly experimentId?: string;
  public readonly benchmarkRunId?: string;
  public readonly authMethod: string;
  public readonly participantType: 'SYNTHETIC' | 'HUMAN';
  public readonly isWarm: boolean;
  public readonly startNano: bigint;
  public endNano: bigint = 0n;
  public durationMs: number = 0;
  public statusCode: number = 200;
  public success: boolean = true;
  public errorMessage?: string;
  public outlierClass: 'VALID' | 'SYSTEM_SPIKE' | 'INVALID' = 'VALID';

  private stages: StageSpan[] = [];
  private sequenceCounter: number = 0;

  constructor(options: {
    traceId?: string;
    experimentId?: string;
    benchmarkRunId?: string;
    authMethod: string;
    participantType?: 'SYNTHETIC' | 'HUMAN';
    isWarm?: boolean;
  }) {
    this.traceId = options.traceId || `TRC-${uuidv4().substring(0, 8)}`;
    this.experimentId = options.experimentId;
    this.benchmarkRunId = options.benchmarkRunId;
    this.authMethod = options.authMethod;
    this.participantType = options.participantType || 'SYNTHETIC';
    this.isWarm = options.isWarm !== undefined ? options.isWarm : true;
    this.startNano = process.hrtime.bigint();
  }

  /**
   * Instrument an asynchronous code block with high-resolution monotonic timing
   */
  public async measureStage<T>(
    stageName: StageName,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const stageStart = process.hrtime.bigint();
    const seq = ++this.sequenceCounter;
    try {
      const result = await fn();
      const stageEnd = process.hrtime.bigint();
      const durMs = Number(stageEnd - stageStart) / 1_000_000;
      this.stages.push({
        stageName,
        sequenceOrder: seq,
        startNano: stageStart,
        endNano: stageEnd,
        durationMs: durMs,
        status: 'SUCCESS',
        metadata: this.sanitizeMetadata(metadata),
      });
      return result;
    } catch (err: any) {
      const stageEnd = process.hrtime.bigint();
      const durMs = Number(stageEnd - stageStart) / 1_000_000;
      this.stages.push({
        stageName,
        sequenceOrder: seq,
        startNano: stageStart,
        endNano: stageEnd,
        durationMs: durMs,
        status: 'FAILED',
        metadata: { error: err?.message || 'Unknown error' },
      });
      throw err;
    }
  }

  /**
   * Complete the trace and compute overall transaction duration
   */
  public finish(success: boolean, statusCode: number = 200, errorMessage?: string) {
    this.endNano = process.hrtime.bigint();
    this.durationMs = Number(this.endNano - this.startNano) / 1_000_000;
    this.success = success;
    this.statusCode = statusCode;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
  }

  public getStages(): StageSpan[] {
    return this.stages;
  }

  public toDTO() {
    return {
      traceId: this.traceId,
      experimentId: this.experimentId,
      benchmarkRunId: this.benchmarkRunId,
      authMethod: this.authMethod,
      participantType: this.participantType,
      durationMs: parseFloat(this.durationMs.toFixed(3)),
      statusCode: this.statusCode,
      success: this.success,
      errorMessage: this.errorMessage,
      isWarm: this.isWarm,
      outlierClass: this.outlierClass,
      stages: this.stages.map((s) => ({
        stageName: s.stageName,
        sequenceOrder: s.sequenceOrder,
        durationMs: parseFloat(s.durationMs.toFixed(3)),
        status: s.status,
        metadata: s.metadata,
      })),
    };
  }

  /**
   * Strip any sensitive tokens, secrets, or passwords
   */
  private sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;
    const sanitized = { ...meta };
    const forbidden = ['password', 'otp', 'code', 'token', 'secret', 'hash', 'signature'];
    for (const key of Object.keys(sanitized)) {
      if (forbidden.some((f) => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
