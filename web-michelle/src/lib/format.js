// Todas las fechas se muestran en hora de Chile, sin importar la zona del navegador.
export const TIME_ZONE = 'America/Santiago';

export function formatDate(value, options = {}) {
  return new Date(value).toLocaleDateString('es-CL', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('es-CL', {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
}

export function formatDateTime(value) {
  return `${formatDate(value, { weekday: 'short' })} · ${formatTime(value)}`;
}

/** Formatea una fecha de calendario YYYY-MM-DD (sin hora). */
export function formatYmd(ymd, options) {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-CL', { timeZone: 'UTC', ...options });
}

/** Fecha YYYY-MM-DD de hoy en Chile. */
export function todayYmd() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date());
}

export function ymdOf(value) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(value));
}

export const STATUS_LABELS = {
  PENDING: 'Por confirmar',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Realizada',
};

export const STATUS_STYLES = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',
  COMPLETED: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function isOpenAppointment(appointment) {
  return appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
}

export function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
