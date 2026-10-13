// Todas las horas de la agenda se interpretan en la zona horaria de la consulta (Chile),
// sin importar la zona del servidor o del navegador.
export const TIME_ZONE = process.env.TIME_ZONE ?? 'America/Santiago';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  weekday: 'short',
});

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 = domingo
}

export function getZonedParts(date: Date): ZonedParts {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

function offsetMs(date: Date) {
  const p = getZonedParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convierte una fecha (YYYY-MM-DD) y hora (HH:mm) de Chile a un instante UTC. */
export function zonedToUtc(ymd: string, time: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let result = guess - offsetMs(new Date(guess));
  // Segunda pasada para los días de cambio de horario
  result = guess - offsetMs(new Date(result));
  return new Date(result);
}

/** Fecha (YYYY-MM-DD) en Chile de un instante. */
export function zonedYmd(date: Date): string {
  const p = getZonedParts(date);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Hora (HH:mm) en Chile de un instante. */
export function zonedTime(date: Date): string {
  const p = getZonedParts(date);
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/** Suma días a una fecha YYYY-MM-DD (calendario, sin zona horaria). */
export function addDays(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function weekdayOf(ymd: string): number {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function formatChile(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
