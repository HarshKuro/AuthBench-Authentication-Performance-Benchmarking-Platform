import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { AuthenticationTracer } from '../instrumentation/tracer';
import { CONFIG } from '../config';

export class OtpAuthService {
  /**
   * Request OTP generation and mock delivery
   */
  public static async requestOtp(
    username: string,
    tracer: AuthenticationTracer
  ): Promise<{
    challengeToken: string;
    expiresAt: Date;
    mockCodeForTesting?: string; // Expose in test mode for automated benchmarking
  }> {
    // Stage 1: Lookup user
    const user = await tracer.measureStage('DB_QUERY', async () => {
      return prisma.user.findUnique({
        where: { username },
      });
    });

    if (!user) {
      tracer.finish(false, 404, 'User not found');
      throw new Error('User not found');
    }

    // Stage 2: OTP Generation (cryptographically secure random 6 digits)
    const { code, codeHash } = await tracer.measureStage('OTP_GEN', async () => {
      const randomBytes = crypto.randomBytes(4);
      const codeNum = (randomBytes.readUInt32BE(0) % 900000) + 100000;
      const codeStr = codeNum.toString();
      const hash = crypto.createHmac('sha256', CONFIG.JWT_SECRET).update(codeStr).digest('hex');
      return { code: codeStr, codeHash: hash };
    });

    // Stage 3: Mock Delivery Simulation (controlled reproducible telecom latency)
    await tracer.measureStage('OTP_DELIVERY_MOCK', async () => {
      // Deterministic slight jitter around configured mock delivery time
      const jitter = (Math.random() - 0.5) * 4;
      const delay = Math.max(5, CONFIG.MOCK_OTP_LATENCY_MS + jitter);
      return new Promise((resolve) => setTimeout(resolve, delay));
    });

    // Stage 4: Persist OTP challenge in database
    const challengeToken = `otp_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + CONFIG.OTP_EXPIRY_SECONDS * 1000);

    await tracer.measureStage('DB_QUERY', async () => {
      return prisma.otpChallenge.create({
        data: {
          challengeToken,
          userId: user.id,
          codeHash,
          expiresAt,
          maxAttempts: CONFIG.OTP_MAX_ATTEMPTS,
        },
      });
    });

    tracer.finish(true, 200);
    return {
      challengeToken,
      expiresAt,
      mockCodeForTesting: code,
    };
  }

  /**
   * Verify submitted OTP code
   */
  public static async verifyOtp(
    challengeToken: string,
    submittedCode: string,
    tracer: AuthenticationTracer
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    // Stage 1: Retrieve challenge
    const challenge = await tracer.measureStage('DB_QUERY', async () => {
      return prisma.otpChallenge.findUnique({
        where: { challengeToken },
        include: { user: true },
      });
    });

    if (!challenge) {
      tracer.finish(false, 404, 'Invalid OTP challenge token');
      return { success: false, error: 'Invalid challenge' };
    }

    // Stage 2: OTP Validation
    const validationResult = await tracer.measureStage('OTP_VAL', async () => {
      // Check expiration
      if (new Date() > challenge.expiresAt) {
        return { valid: false, reason: 'OTP expired' };
      }
      // Check status
      if (challenge.status !== 'PENDING') {
        return { valid: false, reason: 'Challenge already consumed or locked' };
      }
      // Check rate limiting / max attempts
      if (challenge.attempts >= challenge.maxAttempts) {
        return { valid: false, reason: 'Max attempts exceeded' };
      }

      // Constant-time hash verification
      const submittedHash = crypto
        .createHmac('sha256', CONFIG.JWT_SECRET)
        .update(submittedCode.trim())
        .digest('hex');

      const match = crypto.timingSafeEqual(
        Buffer.from(submittedHash, 'hex'),
        Buffer.from(challenge.codeHash, 'hex')
      );

      return { valid: match, reason: match ? undefined : 'Incorrect OTP code' };
    });

    if (!validationResult.valid) {
      // Increment attempt counter in DB
      await tracer.measureStage('DB_QUERY', async () => {
        return prisma.otpChallenge.update({
          where: { id: challenge.id },
          data: {
            attempts: { increment: 1 },
            status: challenge.attempts + 1 >= challenge.maxAttempts ? 'LOCKED' : 'PENDING',
          },
        });
      });
      tracer.finish(false, 401, validationResult.reason);
      return { success: false, error: validationResult.reason };
    }

    // Stage 3: Mark challenge verified and issue session
    await tracer.measureStage('DB_QUERY', async () => {
      return prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
    });

    const session = await tracer.measureStage('SESSION_CREATE', async () => {
      const token = `sess_${uuidv4().replace(/-/g, '')}`;
      return prisma.session.create({
        data: {
          token,
          userId: challenge.userId!,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });

    tracer.finish(true, 200);
    return { success: true, token: session.token };
  }
}
