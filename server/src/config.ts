import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.startsWith('__')) {
    throw new Error(`Missing or placeholder env var: ${name}`);
  }
  return value;
}

export const config = {
  a4uBaseUrl: required('A4U_API_BASE_URL').replace(/\/$/, ''),
  a4uApiKey: required('A4U_API_KEY'),
  authUsername: required('AUTH_USERNAME'),
  authPassword: required('AUTH_PASSWORD'),
  jwtSecret: required('JWT_SECRET'),
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  isProd: process.env.NODE_ENV === 'production',
} as const;

if (config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
