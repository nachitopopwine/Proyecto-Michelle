const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const TOKEN_KEY = 'accessToken';

export function getToken() {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    // Limpia la clave antigua que usaba la versión anterior
    window.localStorage.removeItem('userRole');
  } catch {
    // Sin almacenamiento (modo privado): la sesión dura hasta recargar
  }
}

async function parseError(response) {
  const payload = await response.json().catch(() => null);
  const message = Array.isArray(payload?.message)
    ? payload.message.join(', ')
    : payload?.message ?? 'No fue posible completar la solicitud';
  const error = new Error(message);
  error.status = response.status;
  return error;
}

export async function apiRequest(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers ?? {}),
      },
    });
  } catch {
    throw new Error('No hay conexión con el servidor. Intenta nuevamente.');
  }

  if (!response.ok) throw await parseError(response);
  return response.json().catch(() => null);
}

/** Petición con el token guardado. Si el token venció, avisa a la app para cerrar sesión. */
export async function authenticatedRequest(path, options = {}) {
  try {
    return await apiRequest(path, {
      ...options,
      headers: { ...(options.headers ?? {}), Authorization: `Bearer ${getToken()}` },
    });
  } catch (error) {
    if (error.status === 401) window.dispatchEvent(new Event('session-expired'));
    throw error;
  }
}

export function jsonBody(data) {
  return JSON.stringify(data);
}

/** Descarga un archivo protegido (PDF, pautas) y lo guarda en el equipo. */
export async function downloadFile(path, fallbackName = 'archivo') {
  let response;
  try {
    response = await fetch(`${apiUrl}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  } catch {
    throw new Error('No hay conexión con el servidor. Intenta nuevamente.');
  }
  if (!response.ok) throw await parseError(response);

  const disposition = response.headers.get('Content-Disposition') ?? '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
  const plain = disposition.match(/filename="([^"]+)"/)?.[1];
  const filename = encoded ? decodeURIComponent(encoded) : plain ?? fallbackName;

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
