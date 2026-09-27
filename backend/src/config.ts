import path from 'path';

export const CONFIG = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  DATABASE_URL: process.env.DATABASE_URL || 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET || 'super-research-secret-key-32-chars-minimum',
  MOCK_OTP_LATENCY_MS: parseInt(process.env.MOCK_OTP_LATENCY_MS || '25', 10),
  QR_EXPIRY_SECONDS: 60,
  OTP_EXPIRY_SECONDS: 120,
  OTP_MAX_ATTEMPTS: 5,
};
