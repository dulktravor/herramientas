import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { addCalendarDays, calendarDifference, parseCalendarDate, resolveLocalTime, formatZonedInstant, availableTimeZones } from '../lib/date-tools.ts';

void test('calendario gregoriano valida bisiestos, siglos, límites y entradas inválidas', () => {
  assert.equal(parseCalendarDate('2000-02-29').day, 29);
  assert.equal(parseCalendarDate('0001-01-01').year, 1);
  for (const value of ['1900-02-29', '2023-02-29', '2026-04-31', '0000-01-01', '10000-01-01', '2026-13-01', '2026-01-00', '', '2026-1-1', '08/10/2026']) {
    assert.throws(() => parseCalendarDate(value));
  }
});

void test('diferencia distingue regla de extremos, fechas iguales y orden invertido', () => {
  assert.equal(calendarDifference('2024-02-28', '2024-03-01'), 2);
  assert.equal(calendarDifference('2024-02-28', '2024-03-01', true), 3);
  assert.equal(calendarDifference('2024-03-01', '2024-02-28'), -2);
  assert.equal(calendarDifference('2024-03-01', '2024-02-28', true), -3);
  assert.equal(calendarDifference('2026-10-08', '2026-10-08'), 0);
  assert.equal(calendarDifference('2026-10-08', '2026-10-08', true), 1);
  assert.equal(calendarDifference('2025-12-31', '2026-01-01'), 1);
});

void test('sumar y restar cruza fin de mes y año y conserva aritmética inversa', () => {
  assert.equal(addCalendarDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addCalendarDays('2024-03-01', -1), '2024-02-29');
  assert.equal(addCalendarDays('2025-12-31', 1), '2026-01-01');
  assert.equal(addCalendarDays('2026-01-01', -1), '2025-12-31');
  assert.equal(addCalendarDays('0099-12-31', 1), '0100-01-01');
  assert.equal(addCalendarDays('2026-01-01', 0), '2026-01-01');
  for (const days of [-100000, -30, 30, 100000]) {
    assert.equal(addCalendarDays(addCalendarDays('2026-10-08', days), -days), '2026-10-08');
  }
  assert.throws(() => addCalendarDays('0001-01-01', -1));
  assert.throws(() => addCalendarDays('9999-12-31', 1));
  for (const days of [0.5, Infinity, NaN, Number.MAX_SAFE_INTEGER]) assert.throws(() => addCalendarDays('2026-10-08', days));
});

void test('calendario no cambia por DST y la duración real puede ser de 23 o 25 horas', () => {
  for (const [start, end, hours] of [['2026-03-08', '2026-03-09', 23], ['2026-11-01', '2026-11-02', 25]]) {
    assert.equal(calendarDifference(start, end), 1);
    const a = resolveLocalTime(start, '00:00', 'America/New_York').instants[0];
    const b = resolveLocalTime(end, '00:00', 'America/New_York').instants[0];
    assert.equal((b - a) / 3600000, hours);
  }
});

void test('Bogotá, UTC y Tokio representan un instante con cruce de fecha', () => {
  const result = resolveLocalTime('2026-10-08', '23:30', 'America/Bogota');
  assert.equal(result.kind, 'unique');
  assert.equal(new Date(result.instants[0]).toISOString(), '2026-10-09T04:30:00.000Z');
  assert.equal(formatZonedInstant(result.instants[0], 'Asia/Tokyo'), '2026-10-09 13:30:00 Asia/Tokyo (UTC+09:00)');
  assert.equal(formatZonedInstant(result.instants[0], 'UTC'), '2026-10-09 04:30:00 UTC (UTC+00:00)');
});

void test('Nueva York rechaza hora inexistente y devuelve ambas ocurrencias sin elegir', () => {
  assert.deepEqual(resolveLocalTime('2026-03-08', '02:30', 'America/New_York'), { kind: 'nonexistent', instants: [] });
  const repeated = resolveLocalTime('2026-11-01', '01:30', 'America/New_York');
  assert.equal(repeated.kind, 'ambiguous');
  assert.deepEqual(repeated.instants.map(value => new Date(value).toISOString()), ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  assert.match(formatZonedInstant(repeated.instants[0], 'America/New_York'), /UTC-04:00/);
  assert.match(formatZonedInstant(repeated.instants[1], 'America/New_York'), /UTC-05:00/);
});

void test('Madrid resuelve ambos límites estacionales', () => {
  assert.equal(resolveLocalTime('2026-03-29', '02:30', 'Europe/Madrid').kind, 'nonexistent');
  const repeated = resolveLocalTime('2026-10-25', '02:30', 'Europe/Madrid');
  assert.equal(repeated.kind, 'ambiguous');
  assert.equal(repeated.instants[1] - repeated.instants[0], 3600000);
});

void test('Lord Howe maneja cambios de 30 minutos y Samoa un día eliminado', () => {
  assert.equal(resolveLocalTime('2026-10-04', '02:15', 'Australia/Lord_Howe').kind, 'nonexistent');
  const repeated = resolveLocalTime('2026-04-05', '01:45', 'Australia/Lord_Howe');
  assert.equal(repeated.kind, 'ambiguous');
  assert.equal(repeated.instants[1] - repeated.instants[0], 1800000);
  assert.equal(resolveLocalTime('2011-12-30', '12:00', 'Pacific/Apia').kind, 'nonexistent');
});

void test('India, segundos y medianoche se formatean sin hora 24', () => {
  const instant = resolveLocalTime('2026-10-08', '00:00:17', 'Asia/Kolkata').instants[0];
  assert.equal(new Date(instant).toISOString(), '2026-10-07T18:30:17.000Z');
  assert.equal(formatZonedInstant(instant, 'Asia/Kolkata'), '2026-10-08 00:00:17 Asia/Kolkata (UTC+05:30)');
});

void test('hora, zona y rango inválidos se explican', () => {
  for (const time of ['', '24:00', '12:60', '12:30:60', '1:00', '13:00abc']) assert.throws(() => resolveLocalTime('2026-10-08', time, 'UTC'));
  assert.throws(() => resolveLocalTime('2026-10-08', '12:00', 'Invalid/Zone'), /zona horaria/);
  for (const date of ['1899-12-31', '2101-01-01']) assert.throws(() => resolveLocalTime(date, '12:00', 'UTC'), /1900 y 2100/);
  for (const date of ['1900-01-01', '2100-12-31']) assert.equal(resolveLocalTime(date, '12:00', 'UTC').kind, 'unique');
});

void test('zonas disponibles incluyen UTC y Bogotá; resolución tiene trabajo acotado', () => {
  const zones = availableTimeZones();
  assert.ok(zones.includes('UTC')); assert.ok(zones.includes('America/Bogota'));
  assert.equal(new Set(zones).size, zones.length);
  const started = performance.now();
  for (let count = 0; count < 20; count++) resolveLocalTime('2026-11-01', '01:30', 'America/New_York');
  assert.ok(performance.now() - started < 2000, '20 conversiones deben completar en menos de 2 segundos en el entorno de prueba');
});
