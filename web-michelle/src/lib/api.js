const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ?? 'No fue posible completar la solicitud';
    throw new Error(message);
  }

  return payload;
}

export function authenticatedRequest(path, token, options = {}) {
  return apiRequest(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
