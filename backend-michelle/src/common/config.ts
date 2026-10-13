const DEV_JWT_SECRET = 'super_secreto_desarrollo';

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
