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
  // Connessione al PostgreSQL locale della piattaforma a4u (sola lettura).
  databaseUrl: required('DATABASE_URL'),
  // Base URL pubblica da cui OVH serve i PDF (= OVH_PUBLIC_BASE_URL di a4u).
  mediaBaseUrl: required('MEDIA_BASE_URL').replace(/\/$/, ''),
  // Nome dell'organizzazione di cui mostrare i corsi.
  orgName: process.env.A4U_ORG_NAME || 'SSML',
  // File SQLite locale per lo stato delle approvazioni (creato al boot).
  approvalsDbPath: process.env.APPROVALS_DB_PATH || './data/approvals.db',
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
