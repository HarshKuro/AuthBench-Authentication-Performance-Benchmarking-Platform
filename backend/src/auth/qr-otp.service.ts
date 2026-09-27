import crypto from 'crypto';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { AuthenticationTracer } from '../instrumentation/tracer';
import { CONFIG } from '../config';

export class QrOtpAuthService {
  /**
   * Initiate Combined QR + OTP Authentication Challenge
   */
  public static async initiate(
    username: string,
    tracer: AuthenticationTracer
  ): Promise<{
    qrChallengeToken: string;
    otpChallengeToken: string;
    qrDataUrl: string;
    expiresAt: Date;
    mockOtpCodeForTesting?: string;
  }> {
    // Stage 1: User lookup
    const user = await tracer.measureStage('DB_QUERY', async () => {
      return prisma.user.findUnique({
        where: { username },
      });
    });

    if (!user) {
      tracer.finish(false, 404, 'User not found');
      throw new Error('User not found');
    }

    // Stage 2: QR Token Generation
    const qrChallengeToken = await tracer.measureStage('QR_GEN', async () => {
      return `qrotp_${crypto.randomBytes(16).toString('hex')}_${Date.now()}`;
    });

    const expiresAt = new Date(Date.now() + CONFIG.QR_EXPIRY_SECONDS * 1000);

    // Stage 3: Render QR Matrix
    const qrDataUrl = await tracer.measureStage('QR_RENDER', async () => {
      const payload = JSON.stringify({
        qt: qrChallengeToken,
        u: user.username,
        e: expiresAt.getTime(),
      });
      return QRCode.toDataURL(payload, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        margin: 2,
        width: 256,
      });
    });

    // Stage 4: Generate OTP token
    const { code, codeHash } = await tracer.measureStage('OTP_GEN', async () => {
      const randomBytes = crypto.randomBytes(4);
      const codeNum = (randomBytes.readUInt32BE(0) % 900000) + 100000;
      const codeStr = codeNum.toString();
      const hash = crypto.createHmac('sha256', CONFIG.JWT_SECRET).update(codeStr).digest('hex');
      return { code: codeStr, codeHash: hash };
    });

    // Stage 5: Mock OTP Delivery Simulation
    await tracer.measureStage('OTP_DELIVERY_MOCK', async () => {
      const jitter = (Math.random() - 0.5) * 4;
      const delay = Math.max(5, CONFIG.MOCK_OTP_LATENCY_MS + jitter);
      return new Promise((resolve) => setTimeout(resolve, delay));
    });

    // Stage 6: Database atomic persistence
    const otpChallengeToken = `otpc_${uuidv4()}`;
    await tracer.measureStage('DB_QUERY', async () => {
      return prisma.$transaction([
        prisma.qrChallenge.create({
          data: {
            challengeToken: qrChallengeToken,
            userId: user.id,
            expiresAt,
            status: 'PENDING',
          },
        }),
        prisma.otpChallenge.create({
          data: {
            challengeToken: otpChallengeToken,
            userId: user.id,
            codeHash,
            expiresAt,
            maxAttempts: CONFIG.OTP_MAX_ATTEMPTS,
            status: 'PENDING',
          },
        }),
      ]);
    });

    tracer.finish(true, 200);
    return {
      qrChallengeToken,
      otpChallengeToken,
      qrDataUrl,
      expiresAt,
      mockOtpCodeForTesting: code,
    };
  }

  /**
   * Verify Dual-Factor QR + OTP Submission
   */
  public static async verify(
    qrChallengeToken: string,
    otpChallengeToken: string,
    submittedCode: string,
    deviceSignature: string,
    tracer: AuthenticationTracer
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    // Stage 1: Retrieve challenges
    const [qrChallenge, otpChallenge] = await tracer.measureStage('DB_QUERY', async () => {
      return Promise.all([
        prisma.qrChallenge.findUnique({
          where: { challengeToken: qrChallengeToken },
          include: { user: true },
        }),
        prisma.otpChallenge.findUnique({
          where: { challengeToken: otpChallengeToken },
        }),
      ]);
    });

    if (!qrChallenge || !otpChallenge) {
      tracer.finish(false, 404, 'Challenge records not found');
      return { success: false, error: 'Challenge records not found' };
    }

    // Stage 2: QR Validation
    const qrResult = await tracer.measureStage('QR_VAL', async () => {
      if (new Date() > qrChallenge.expiresAt) return { valid: false, reason: 'QR expired' };
      if (qrChallenge.status !== 'PENDING') return { valid: false, reason: 'QR already consumed' };
      if (!deviceSignature || deviceSignature.length < 8) return { valid: false, reason: 'Invalid device signature' };
      return { valid: true };
    });

    if (!qrResult.valid) {
      tracer.finish(false, 401, qrResult.reason);
      return { success: false, error: qrResult.reason };
    }

    // Stage 3: OTP Validation
    const otpResult = await tracer.measureStage('OTP_VAL', async () => {
      if (new Date() > otpChallenge.expiresAt) return { valid: false, reason: 'OTP expired' };
      if (otpChallenge.status !== 'PENDING') return { valid: false, reason: 'OTP already consumed' };
      if (otpChallenge.attempts >= otpChallenge.maxAttempts) return { valid: false, reason: 'Max attempts exceeded' };

      const submittedHash = crypto
        .createHmac('sha256', CONFIG.JWT_SECRET)
        .update(submittedCode.trim())
        .digest('hex');

      const match = crypto.timingSafeEqual(
        Buffer.from(submittedHash, 'hex'),
        Buffer.from(otpChallenge.codeHash, 'hex')
      );
      return { valid: match, reason: match ? undefined : 'Incorrect OTP code' };
    });

    if (!otpResult.valid) {
      await tracer.measureStage('DB_QUERY', async () => {
        return prisma.otpChallenge.update({
          where: { id: otpChallenge.id },
          data: { attempts: { increment: 1 } },
        });
      });
      tracer.finish(false, 401, otpResult.reason);
      return { success: false, error: otpResult.reason };
    }

    // Stage 4: Mark both challenges consumed atomically
    await tracer.measureStage('DB_QUERY', async () => {
      return prisma.$transaction([
        prisma.qrChallenge.update({
          where: { id: qrChallenge.id },
          data: {
            status: 'VERIFIED',
            scannedAt: new Date(),
            verifiedAt: new Date(),
            deviceSignature,
          },
        }),
        prisma.otpChallenge.update({
          where: { id: otpChallenge.id },
          data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
          },
        }),
      ]);
    });

    // Stage 5: Session Creation
    const session = await tracer.measureStage('SESSION_CREATE', async () => {
      const token = `sess_${uuidv4().replace(/-/g, '')}`;
      return prisma.session.create({
        data: {
          token,
          userId: qrChallenge.userId!,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    });

    tracer.finish(true, 200);
    return { success: true, token: session.token };
  }
}
