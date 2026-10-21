import { existsSync } from 'node:fs';
import { join } from 'node:path';

// npm y los servicios de despliegue arrancan el backend desde su carpeta.
// Las variables definidas por el entorno tienen prioridad sobre el archivo local.
const envFile = join(process.cwd(), '.env');
if (existsSync(envFile) && process.env.NODE_ENV !== 'test') {
  process.loadEnvFile(envFile);
}

const DEV_JWT_SECRET = 'super_secreto_desarrollo';

export function mongodbUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri || uri.includes('<db_password>')) {
    throw new Error('Configura MONGODB_URI con la URI completa de MongoDB Atlas');
  }
  return uri;
}

/** En producción exige un JWT_SECRET real para no firmar tokens con un secreto público. */
export function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.length < 32 || secret === 'change-this-secret')) {
    throw new Error('JWT_SECRET debe estar configurado (mínimo 32 caracteres) en producción');
  }
  return secret || DEV_JWT_SECRET;
}

export function frontendUrl(): string {
  return process.env.FRONTEND_URL ?? 'http://localhost:3001';
}
