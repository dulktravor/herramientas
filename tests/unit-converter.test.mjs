import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { UNIT_FAMILIES, convertUnitAmount, formatUnitAmount, parseUnitAmount } from '../lib/unit-converter.ts';

const close = (actual, expected, absolute = 0) => assert.ok(Math.abs(actual - expected) <= Math.max(absolute, Math.abs(expected) * 2e-12), `${actual} != ${expected}`);

void test('referencias NIST de longitud y masa, con factores exactos', () => {
  close(convertUnitAmount(1, 'length', 'in', 'cm'), 2.54);
  close(convertUnitAmount(1, 'length', 'ft', 'm'), 0.3048);
  close(convertUnitAmount(1, 'length', 'mi', 'km'), 1.609344);
  close(convertUnitAmount(1, 'mass', 'lb', 'kg'), 0.45359237);
  close(convertUnitAmount(16, 'mass', 'oz', 'lb'), 1);
  close(convertUnitAmount(1, 'mass', 't', 'kg'), 1000);
});

void test('área y volumen usan cuadrados y cubos, no factores de longitud', () => {
  close(convertUnitAmount(1, 'area', 'm2', 'cm2'), 10000);
  close(convertUnitAmount(1, 'area', 'ha', 'm2'), 10000);
  close(convertUnitAmount(1, 'area', 'ft2', 'm2'), 0.09290304);
  close(convertUnitAmount(1, 'area', 'acre', 'm2'), 4046.8564224);
  close(convertUnitAmount(1, 'volume', 'l', 'ml'), 1000);
  close(convertUnitAmount(1, 'volume', 'ml', 'cm3'), 1);
  close(convertUnitAmount(1, 'volume', 'ft3', 'm3'), 0.028316846592);
  close(convertUnitAmount(1, 'volume', 'gal-us', 'l'), 3.785411784);
  close(convertUnitAmount(1, 'volume', 'gal-imp', 'l'), 4.54609);
});

void test('Celsius, Fahrenheit y Kelvin coinciden con los casos NIST y cero absoluto', () => {
  for (const [value, from, to, expected] of [[0, 'c', 'f', 32], [100, 'c', 'f', 212], [-40, 'c', 'f', -40], [32, 'f', 'c', 0], [0, 'c', 'k', 273.15], [-273.15, 'c', 'k', 0], [-459.67, 'f', 'k', 0], [0, 'k', 'f', -459.67]]) close(convertUnitAmount(value, 'temperature', from, to), expected, 1e-10);
  for (const [value, from] of [[-273.150001, 'c'], [-459.670001, 'f'], [-0.000001, 'k']]) assert.throws(() => convertUnitAmount(value, 'temperature', from, from), /cero absoluto/);
});

void test('prefijos IEC binarios y SI decimales se distinguen, byte equivale a ocho bits', () => {
  assert.equal(convertUnitAmount(1, 'storage', 'byte', 'bit'), 8);
  assert.equal(convertUnitAmount(1, 'storage', 'mb', 'byte'), 1000000);
  assert.equal(convertUnitAmount(1, 'storage', 'mib', 'byte'), 1048576);
  assert.equal(convertUnitAmount(1, 'storage', 'mib', 'mb'), 1.048576);
  assert.equal(convertUnitAmount(1, 'storage', 'gib', 'kib'), 1048576);
  assert.equal(convertUnitAmount(1, 'storage', 'tib', 'byte'), 1099511627776);
});

void test('ida y vuelta de cada par respeta tolerancia relativa 2e-12, absoluta 1e-10 en temperatura', () => {
  for (const family of UNIT_FAMILIES) for (const from of family.units) for (const to of family.units) {
    const values = family.id === 'temperature' ? [0, 20.123456789, 100, 1000] : [0, 0.0000123456789, 1, 123456.789, 1e100];
    for (const value of values) close(convertUnitAmount(convertUnitAmount(value, family.id, from.id, to.id), family.id, to.id, from.id), value, family.id === 'temperature' ? 1e-10 : 0);
  }
});

void test('decimales españoles y científicos se leen completos, entradas ambiguas se rechazan', () => {
  for (const [raw, expected] of [['12,5', 12.5], ['12.5', 12.5], ['1,2340', 1.234], ['0,123', 0.123], ['1234', 1234], ['  -12,5  ', -12.5], ['.5', 0.5], ['1,5e3', 1500], ['1e-10', 1e-10], ['-0', 0]]) assert.equal(parseUnitAmount(raw), expected);
  for (const raw of ['1,234', '12.345', '123,456']) assert.throws(() => parseUnitAmount(raw), /ambigua/);
  for (const raw of ['', ' ', '1.234,56', '1,234.56', '1 234', '1\u00a0234', '0x10', 'Infinity', 'NaN', '12kg', '1e', '1,', '++1']) assert.throws(() => parseUnitAmount(raw));
});

void test('cero, negativos permitidos y familias no negativas tienen reglas coherentes', () => {
  assert.equal(convertUnitAmount(-2, 'length', 'm', 'cm'), -200);
  for (const family of UNIT_FAMILIES.filter(item => item.id !== 'temperature')) {
    assert.equal(convertUnitAmount(0, family.id, family.units[0].id, family.units[1].id), 0);
    if (family.id !== 'length') assert.throws(() => convertUnitAmount(-1, family.id, family.units[0].id, family.units[1].id), /positivas/);
  }
  assert.throws(() => convertUnitAmount(1, 'length', 'kg', 'm'), /misma familia/);
});

void test('desbordamiento y pérdida a cero se rechazan sin alterar valores grandes representables', () => {
  assert.throws(() => parseUnitAmount('1e309'), /fuera del rango/);
  assert.throws(() => parseUnitAmount('1e-9999'), /demasiado pequeña/);
  assert.equal(parseUnitAmount('0e-9999'), 0);
  assert.throws(() => convertUnitAmount(Number.MAX_VALUE, 'length', 'km', 'mm'), /fuera del rango/);
  assert.throws(() => convertUnitAmount(Number.MIN_VALUE, 'length', 'mm', 'km'), /demasiado pequeño/);
  assert.equal(convertUnitAmount(Number.MAX_VALUE, 'storage', 'tib', 'tib'), Number.MAX_VALUE);
  assert.throws(() => convertUnitAmount(Number.MAX_VALUE, 'length', 'km', 'm'), /fuera del rango/);
});

void test('mostrar precisión no cambia el número original, conserva signos y notación', () => {
  const value = convertUnitAmount(1, 'length', 'm', 'ft');
  assert.equal(formatUnitAmount(value, 3), '3,28');
  assert.equal(formatUnitAmount(value, 10), '3,280839895');
  assert.equal(formatUnitAmount(1.25, 2), '1,3');
  assert.equal(formatUnitAmount(-1.25, 2), '-1,3');
  assert.equal(formatUnitAmount(1000, 10), '1000');
  assert.equal(formatUnitAmount(1e-20, 3), '1e-20');
  assert.equal(formatUnitAmount(-0, 3), '0');
  close(convertUnitAmount(value, 'length', 'ft', 'm'), 1);
  for (const digits of [0, 16, 2.5, NaN]) assert.throws(() => formatUnitAmount(value, digits));
});

void test('motor y componente no incorporan envío, persistencia ni logs de las entradas', async () => {
  for (const file of ['lib/unit-converter.ts', 'components/unit-converter.tsx']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /console\.|localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest|pushState|replaceState/);
  }
});
