import { FastifyInstance } from 'fastify';
import { PasswordAuthService } from '../auth/password.service';
import { OtpAuthService } from '../auth/otp.service';
import { QrAuthService } from '../auth/qr.service';
import { QrOtpAuthService } from '../auth/qr-otp.service';
import { AuthenticationTracer } from '../instrumentation/tracer';
import { TelemetryBuffer } from '../instrumentation/telemetry-buffer';
import { prisma } from '../db';

export async function authRoutes(fastify: FastifyInstance) {
  // Method A: Password Login
  fastify.post('/api/v1/auth/password', async (request, reply) => {
    const { username, password } = (request.body as any) || {};
    if (!username || !password) {
      return reply.code(400).send({ error: 'Username and password required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'PASSWORD',
      participantType: 'HUMAN',
    });

    try {
      const result = await PasswordAuthService.authenticate(username, password, tracer);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(result.success ? 200 : 401).send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Method B: OTP Request
  fastify.post('/api/v1/auth/otp/request', async (request, reply) => {
    const { username } = (request.body as any) || {};
    if (!username) {
      return reply.code(400).send({ error: 'Username required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'OTP',
      participantType: 'HUMAN',
    });

    try {
      const result = await OtpAuthService.requestOtp(username, tracer);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Method B: OTP Verify
  fastify.post('/api/v1/auth/otp/verify', async (request, reply) => {
    const { challengeToken, code } = (request.body as any) || {};
    if (!challengeToken || !code) {
      return reply.code(400).send({ error: 'challengeToken and code required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'OTP',
      participantType: 'HUMAN',
    });

    try {
      const result = await OtpAuthService.verifyOtp(challengeToken, code, tracer);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(result.success ? 200 : 401).send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Method C: QR Generate
  fastify.post('/api/v1/auth/qr/generate', async (request, reply) => {
    const { username } = (request.body as any) || {};
    if (!username) {
      return reply.code(400).send({ error: 'Username required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'QR',
      participantType: 'HUMAN',
    });

    try {
      const result = await QrAuthService.generateChallenge(username, tracer);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Method C: QR Scan Verify
  fastify.post('/api/v1/auth/qr/scan-verify', async (request, reply) => {
    const { challengeToken, deviceSignature } = (request.body as any) || {};
    if (!challengeToken) {
      return reply.code(400).send({ error: 'challengeToken required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'QR',
      participantType: 'HUMAN',
    });

    try {
      const result = await QrAuthService.verifyScan(
        challengeToken,
        deviceSignature || 'device_mobile_scanner',
        tracer
      );
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(result.success ? 200 : 401).send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Method C: QR Poll Status
  fastify.get('/api/v1/auth/qr/poll-status/:challengeToken', async (request, reply) => {
    const { challengeToken } = request.params as any;
    const result = await QrAuthService.pollStatus(challengeToken);
    return reply.send(result);
  });

  // Method D: QR + OTP Initiate
  fastify.post('/api/v1/auth/qr-otp/initiate', async (request, reply) => {
    const { username } = (request.body as any) || {};
    if (!username) {
      return reply.code(400).send({ error: 'Username required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'QR_OTP',
      participantType: 'HUMAN',
    });

    try {
      const result = await QrOtpAuthService.initiate(username, tracer);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Method D: QR + OTP Verify
  fastify.post('/api/v1/auth/qr-otp/verify', async (request, reply) => {
    const { qrChallengeToken, otpChallengeToken, code, deviceSignature } =
      (request.body as any) || {};

    if (!qrChallengeToken || !otpChallengeToken || !code) {
      return reply.code(400).send({ error: 'qrChallengeToken, otpChallengeToken, and code required' });
    }

    const tracer = new AuthenticationTracer({
      authMethod: 'QR_OTP',
      participantType: 'HUMAN',
    });

    try {
      const result = await QrOtpAuthService.verify(
        qrChallengeToken,
        otpChallengeToken,
        code,
        deviceSignature || 'device_mobile_scanner',
        tracer
      );
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(result.success ? 200 : 401).send({
        ...result,
        trace: tracer.toDTO(),
      });
    } catch (err: any) {
      tracer.finish(false, 500, err?.message);
      TelemetryBuffer.getInstance().push(tracer);
      return reply.code(500).send({ error: err?.message });
    }
  });

  // Human Interaction Trial Logging
  fastify.post('/api/v1/auth/human-trial', async (request, reply) => {
    const {
      participantId,
      authMethod,
      qrScanDurationMs,
      otpEntryDurationMs,
      totalHumanDurationMs,
      retries,
      success,
    } = (request.body as any) || {};

    const trial = await prisma.humanInteractionTrial.create({
      data: {
        participantId: participantId || 'P01',
        authMethod: authMethod || 'QR_OTP',
        qrScanDurationMs: qrScanDurationMs || null,
        otpEntryDurationMs: otpEntryDurationMs || null,
        totalHumanDurationMs: totalHumanDurationMs || 0,
        retries: retries || 0,
        success: success !== undefined ? success : true,
      },
    });

    return reply.send({ success: true, trialId: trial.id });
  });
}
