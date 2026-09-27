import crypto from 'crypto';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { AuthenticationTracer } from '../instrumentation/tracer';
import { CONFIG } from '../config';

export class QrAuthService {
  /**
   * Generate QR challenge and render QR code matrix
   */
  public static async generateChallenge(
    username: string,
    tracer: AuthenticationTracer
  ): Promise<{
    challengeToken: string;
    qrDataUrl: string;
    expiresAt: Date;
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

    // Stage 2: Cryptographic challenge token generation (128-bit random nonce)
    const challengeToken = await tracer.measureStage('QR_GEN', async () => {
      return `qr_${crypto.randomBytes(16).toString('hex')}_${Date.now()}`;
    });

    const expiresAt = new Date(Date.now() + CONFIG.QR_EXPIRY_SECONDS * 1000);

    // Stage 3: Render QR code matrix into SVG / Data URL
    const qrDataUrl = await tracer.measureStage('QR_RENDER', async () => {
      const payload = JSON.stringify({
        t: challengeToken,
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

    // Stage 4: Persist in database
    await tracer.measureStage('DB_QUERY', async () => {
      return prisma.qrChallenge.create({
        data: {
          challengeToken,
          userId: user.id,
          expiresAt,
          status: 'PENDING',
        },
      });
    });

    tracer.finish(true, 200);
    return {
      challengeToken,
      qrDataUrl,
      expiresAt,
    };
  }

  /**
   * Verify mobile scan of QR challenge
   */
  public static async verifyScan(
    challengeToken: string,
    deviceSignature: string,
    tracer: AuthenticationTracer
  ): Promise<{ success: boolean; token?: string; error?: string }> {
    // Stage 1: Retrieve challenge
    const challenge = await tracer.measureStage('DB_QUERY', async () => {
      return prisma.qrChallenge.findUnique({
        where: { challengeToken },
        include: { user: true },
      });
    });

    if (!challenge) {
      tracer.finish(false, 404, 'Invalid QR challenge');
      return { success: false, error: 'Challenge not found' };
    }

    // Stage 2: QR Validation
    const validation = await tracer.measureStage('QR_VAL', async () => {
      if (new Date() > challenge.expiresAt) {
        return { valid: false, reason: 'QR challenge expired' };
      }
      if (challenge.status !== 'PENDING') {
        return { valid: false, reason: 'QR challenge already consumed' };
      }
      if (!deviceSignature || deviceSignature.length < 8) {
        return { valid: false, reason: 'Invalid device signature' };
      }
      return { valid: true };
    });

    if (!validation.valid) {
      tracer.finish(false, 401, validation.reason);
      return { success: false, error: validation.reason };
    }

    // Stage 3: Update challenge state
    await tracer.measureStage('DB_QUERY', async () => {
      return prisma.qrChallenge.update({
        where: { id: challenge.id },
        data: {
          status: 'VERIFIED',
          scannedAt: new Date(),
          verifiedAt: new Date(),
          deviceSignature,
        },
      });
    });

    // Stage 4: Session creation
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

  /**
   * Poll status of QR challenge (for web browser waiting for mobile scan)
   */
  public static async pollStatus(
    challengeToken: string
  ): Promise<{ status: string; token?: string }> {
    const challenge = await prisma.qrChallenge.findUnique({
      where: { challengeToken },
      include: {
        user: {
          include: {
            sessions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!challenge) return { status: 'NOT_FOUND' };
    if (new Date() > challenge.expiresAt) return { status: 'EXPIRED' };

    if (challenge.status === 'VERIFIED') {
      const latestSession = challenge.user?.sessions[0];
      return {
        status: 'VERIFIED',
        token: latestSession?.token,
      };
    }

    return { status: challenge.status };
  }
}
