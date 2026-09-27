import { PasswordAuthService } from './src/auth/password.service';
import { OtpAuthService } from './src/auth/otp.service';
import { QrAuthService } from './src/auth/qr.service';
import { QrOtpAuthService } from './src/auth/qr-otp.service';
import { AuthenticationTracer } from './src/instrumentation/tracer';
import { TelemetryBuffer } from './src/instrumentation/telemetry-buffer';
import { prisma } from './src/db';

async function runTests() {
  console.log('--- STARTING E2E AUTHENTICATION VERIFICATION ---');

  // Test Method A: Password
  console.log('\n[1/4] Testing Method A (Password)...');
  const tracerA = new AuthenticationTracer({ authMethod: 'PASSWORD' });
  const resA = await PasswordAuthService.authenticate('benchmark_user', 'ResearchBenchmark2026!', tracerA);
  console.log('Method A result:', resA.success ? 'SUCCESS' : 'FAILED', `Duration: ${tracerA.durationMs.toFixed(2)}ms`);
  console.log('Stages:', tracerA.getStages().map((s) => `${s.stageName} (${s.durationMs.toFixed(2)}ms)`).join(' -> '));
  TelemetryBuffer.getInstance().push(tracerA);

  // Test Method B: OTP
  console.log('\n[2/4] Testing Method B (OTP)...');
  const tracerB = new AuthenticationTracer({ authMethod: 'OTP' });
  const reqOtp = await OtpAuthService.requestOtp('benchmark_user', tracerB);
  const verifyOtp = await OtpAuthService.verifyOtp(reqOtp.challengeToken, reqOtp.mockCodeForTesting!, tracerB);
  console.log('Method B result:', verifyOtp.success ? 'SUCCESS' : 'FAILED', `Duration: ${tracerB.durationMs.toFixed(2)}ms`);
  console.log('Stages:', tracerB.getStages().map((s) => `${s.stageName} (${s.durationMs.toFixed(2)}ms)`).join(' -> '));
  TelemetryBuffer.getInstance().push(tracerB);

  // Test Method C: QR
  console.log('\n[3/4] Testing Method C (QR)...');
  const tracerC = new AuthenticationTracer({ authMethod: 'QR' });
  const genQr = await QrAuthService.generateChallenge('benchmark_user', tracerC);
  const verifyQr = await QrAuthService.verifyScan(genQr.challengeToken, 'device_test_sig', tracerC);
  console.log('Method C result:', verifyQr.success ? 'SUCCESS' : 'FAILED', `Duration: ${tracerC.durationMs.toFixed(2)}ms`);
  console.log('Stages:', tracerC.getStages().map((s) => `${s.stageName} (${s.durationMs.toFixed(2)}ms)`).join(' -> '));
  TelemetryBuffer.getInstance().push(tracerC);

  // Test Method D: QR + OTP
  console.log('\n[4/4] Testing Method D (QR + OTP)...');
  const tracerD = new AuthenticationTracer({ authMethod: 'QR_OTP' });
  const initQrOtp = await QrOtpAuthService.initiate('benchmark_user', tracerD);
  const verifyQrOtp = await QrOtpAuthService.verify(
    initQrOtp.qrChallengeToken,
    initQrOtp.otpChallengeToken,
    initQrOtp.mockOtpCodeForTesting!,
    'device_test_sig',
    tracerD
  );
  console.log('Method D result:', verifyQrOtp.success ? 'SUCCESS' : 'FAILED', `Duration: ${tracerD.durationMs.toFixed(2)}ms`);
  console.log('Stages:', tracerD.getStages().map((s) => `${s.stageName} (${s.durationMs.toFixed(2)}ms)`).join(' -> '));
  TelemetryBuffer.getInstance().push(tracerD);

  console.log('\nFlushing telemetry buffer to database...');
  await TelemetryBuffer.getInstance().flush();
  TelemetryBuffer.getInstance().stop();

  const traceCount = await prisma.authenticationTrace.count();
  const stageCount = await prisma.authenticationStage.count();
  console.log(`Verification completed! Stored Traces: ${traceCount}, Stored Stages: ${stageCount}`);

  await prisma.$disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
