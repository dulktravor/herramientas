/**
 * Calendar arithmetic uses a UTC day index solely as a Gregorian calendar axis;
 * it never interprets a calendar date as local midnight or a 24-hour duration.
 * Intl follows ECMA-402 and the browser's bundled zone database:
 * https://tc39.es/ecma402/#sec-intl.datetimeformat
 * Local/instant ambiguity model: https://tc39.es/proposal-temporal/docs/timezone.html
 * No dependency, network lookup, persistence, or private input logging is used.
 */
export const CALENDAR_MIN = '0001-01-01';
export const CALENDAR_MAX = '9999-12-31';
export const ZONE_DATE_MIN = '1900-01-01';
export const ZONE_DATE_MAX = '2100-12-31';
const DAY_MS = 86_400_000;

export type CalendarDate = { year: number; month: number; day: number };
export type ZonedTime = CalendarDate & { hour: number; minute: number; second: number };
export type LocalTimeResolution = { kind: 'unique' | 'ambiguous' | 'nonexistent'; instants: number[] };

function asUtc(parts: CalendarDate, hour = 0, minute = 0, second = 0) {
  const date = new Date(0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

export function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Introduce una fecha completa con formato AAAA-MM-DD.');
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(asUtc(parts));
  if (parts.year < 1 || parts.year > 9999 || date.getUTCFullYear() !== parts.year ||
      date.getUTCMonth() + 1 !== parts.month || date.getUTCDate() !== parts.day) {
    throw new Error('La fecha no existe. Revisa el día, el mes y el año (0001 a 9999).');
  }
  return parts;
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0');
export function formatCalendarDate(parts: CalendarDate) {
  return `${pad(parts.year, 4)}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function calendarDifference(start: string, end: string, includeBoth = false) {
  const days = (asUtc(parseCalendarDate(end)) - asUtc(parseCalendarDate(start))) / DAY_MS;
  return includeBoth ? days + (days < 0 ? -1 : 1) : days;
}

export function addCalendarDays(value: string, amount: number) {
  if (!Number.isSafeInteger(amount)) throw new Error('La cantidad de días debe ser un número entero.');
  const result = asUtc(parseCalendarDate(value)) + amount * DAY_MS;
  if (!Number.isSafeInteger(result) || result < asUtc(parseCalendarDate(CALENDAR_MIN)) ||
      result > asUtc(parseCalendarDate(CALENDAR_MAX))) {
    throw new Error('El resultado debe estar entre los años 0001 y 9999. Reduce la cantidad de días.');
  }
  const date = new Date(result);
  return formatCalendarDate({ year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() });
}

function zoneFormatter(zone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
      timeZone: zone, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  } catch {
    throw new Error('Esta zona horaria no está disponible en tu navegador. Elige otra zona.');
  }
}

function partsAt(instant: number, formatter: Intl.DateTimeFormat): ZonedTime {
  const fields: Record<string, number> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (['year', 'month', 'day', 'hour', 'minute', 'second'].includes(part.type)) fields[part.type] = Number(part.value);
  }
  const parts = fields as ZonedTime;
  if (!['year', 'month', 'day', 'hour', 'minute', 'second'].every(key => Number.isFinite(fields[key])) || parts.hour > 23) {
    throw new Error('El navegador no puede interpretar esta zona con precisión. Prueba un navegador actualizado.');
  }
  return parts;
}

export function zonedParts(instant: number, zone: string) {
  if (!Number.isFinite(instant)) throw new Error('El instante no es válido.');
  return partsAt(instant, zoneFormatter(zone));
}

export function resolveLocalTime(dateValue: string, timeValue: string, zone: string): LocalTimeResolution {
  const date = parseCalendarDate(dateValue);
  if (dateValue < ZONE_DATE_MIN || dateValue > ZONE_DATE_MAX) {
    throw new Error('La conversión horaria admite fechas entre 1900 y 2100.');
  }
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(timeValue);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || Number(match[3] ?? 0) > 59) {
    throw new Error('Introduce una hora válida de 00:00 a 23:59 (segundos opcionales).');
  }
  const target = asUtc(date, Number(match[1]), Number(match[2]), Number(match[3] ?? 0));
  const formatter = zoneFormatter(zone);
  const offsets = new Set<number>();
  // Probe both sides of a transition, including non-hour shifts and skipped
  // calendar days. Bound: 193 formatToParts calls, independent of user values.
  for (let step = -96; step <= 96; step++) {
    const probe = target + step * 30 * 60_000;
    const local = partsAt(probe, formatter);
    offsets.add(asUtc(local, local.hour, local.minute, local.second) - probe);
  }
  const instants = [...offsets].map(offset => target - offset).filter(instant => {
    const local = partsAt(instant, formatter);
    return asUtc(local, local.hour, local.minute, local.second) === target;
  }).sort((a, b) => a - b);
  return { kind: instants.length === 0 ? 'nonexistent' : instants.length === 1 ? 'unique' : 'ambiguous', instants };
}

export function formatZonedInstant(instant: number, zone: string) {
  const parts = zonedParts(instant, zone);
  const seconds = (asUtc(parts, parts.hour, parts.minute, parts.second) - Math.floor(instant / 1000) * 1000) / 1000;
  const sign = seconds < 0 ? '-' : '+';
  const absolute = Math.abs(seconds);
  const offset = `${sign}${pad(Math.floor(absolute / 3600))}:${pad(Math.floor(absolute % 3600 / 60))}${absolute % 60 ? `:${pad(absolute % 60)}` : ''}`;
  return `${formatCalendarDate(parts)} ${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)} ${zone} (UTC${offset})`;
}

export const DEFAULT_ZONES = [
  'UTC', 'America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Caracas',
  'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/New_York', 'America/Los_Angeles',
  'Europe/Madrid', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Kolkata',
  'Asia/Shanghai', 'Australia/Sydney', 'Australia/Lord_Howe', 'Pacific/Auckland', 'Pacific/Apia',
] as const;

export function availableTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  const candidates = [...DEFAULT_ZONES];
  try {
    const detected = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const supported = intl.supportedValuesOf?.('timeZone') ?? [];
    return [...new Set(['UTC', detected, ...candidates, ...supported])].filter(zone => {
      try { zoneFormatter(zone); return true; } catch { return false; }
    }).sort();
  } catch {
    return candidates.filter(zone => { try { zoneFormatter(zone); return true; } catch { return false; } });
  }
}
