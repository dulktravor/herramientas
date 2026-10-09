/**
 * N-04 reference definitions, checked 2026-10-08 before implementation:
 * NIST Handbook 44 (2026), Appendix C: metric prefixes, international inch/foot/
 * yard/mile, avoirdupois pound/ounce, hectare and liquid U.S. gallon (231 in³).
 * https://www.nist.gov/system/files/documents/2025/12/30/appc-26-HB44-20251222.pdf
 * NIST SP 811 (2008), Appendix B.8: Celsius/Kelvin/Fahrenheit offsets and
 * imperial gallon. https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8
 * IEC binary prefixes as published by NIST: https://physics.nist.gov/cuu/Units/binary.html
 * Area/volume factors are powers of the exact international length definitions,
 * never rounded length factors or U.S. survey-foot definitions.
 * Tests use relative tolerance 2e-12 (absolute 1e-10 for temperature cancellation).
 * IEEE-754 binary64 is kept internally; display rounding never feeds conversion.
 */
export type UnitFamilyId = 'length' | 'mass' | 'temperature' | 'area' | 'volume' | 'storage';
export type ConversionUnit = { id: string; name: string; symbol: string; factor: number };
export type UnitFamily = { id: UnitFamilyId; name: string; units: readonly ConversionUnit[]; example: string; note: string };

const unit = (id: string, name: string, symbol: string, factor: number): ConversionUnit => ({ id, name, symbol, factor });
export const UNIT_FAMILIES: readonly UnitFamily[] = [
  { id: 'length', name: 'Longitud', example: '1 pulgada = 2,54 cm', note: 'Pies, yardas y millas internacionales. Se admiten negativos para desplazamientos.', units: [unit('mm', 'Milímetro', 'mm', 0.001), unit('cm', 'Centímetro', 'cm', 0.01), unit('m', 'Metro', 'm', 1), unit('km', 'Kilómetro', 'km', 1000), unit('in', 'Pulgada', 'in', 0.0254), unit('ft', 'Pie internacional', 'ft', 0.3048), unit('yd', 'Yarda internacional', 'yd', 0.9144), unit('mi', 'Milla internacional', 'mi', 1609.344)] },
  { id: 'mass', name: 'Masa', example: '1 libra = 0,45359237 kg', note: 'Libras y onzas avoirdupois; no son unidades de fuerza ni onzas troy.', units: [unit('mg', 'Miligramo', 'mg', 1e-6), unit('g', 'Gramo', 'g', 0.001), unit('kg', 'Kilogramo', 'kg', 1), unit('t', 'Tonelada métrica', 't', 1000), unit('oz', 'Onza avoirdupois', 'oz av', 0.028349523125), unit('lb', 'Libra avoirdupois', 'lb av', 0.45359237)] },
  { id: 'temperature', name: 'Temperatura', example: '0 °C = 32 °F = 273,15 K', note: 'Temperaturas absolutas, no diferencias. Límite inferior: −273,15 °C / −459,67 °F / 0 K.', units: [unit('c', 'Grado Celsius', '°C', 1), unit('f', 'Grado Fahrenheit', '°F', 1), unit('k', 'Kelvin', 'K', 1)] },
  { id: 'area', name: 'Área', example: '1 m² = 10 000 cm²', note: 'Los factores de longitud se elevan al cuadrado. El acre usa el pie internacional.', units: [unit('cm2', 'Centímetro cuadrado', 'cm²', 0.0001), unit('m2', 'Metro cuadrado', 'm²', 1), unit('km2', 'Kilómetro cuadrado', 'km²', 1e6), unit('ha', 'Hectárea', 'ha', 1e4), unit('ft2', 'Pie cuadrado internacional', 'ft²', 0.3048 ** 2), unit('acre', 'Acre internacional', 'acre', 43560 * 0.3048 ** 2)] },
  { id: 'volume', name: 'Volumen', example: '1 L = 1 000 mL = 1 000 cm³', note: 'Los factores de longitud se elevan al cubo. El galón estadounidense líquido y el imperial son distintos.', units: [unit('ml', 'Mililitro', 'mL', 1e-6), unit('l', 'Litro', 'L', 0.001), unit('cm3', 'Centímetro cúbico', 'cm³', 1e-6), unit('m3', 'Metro cúbico', 'm³', 1), unit('ft3', 'Pie cúbico internacional', 'ft³', 0.3048 ** 3), unit('gal-us', 'Galón estadounidense líquido', 'gal US', 231 * 0.0254 ** 3), unit('gal-imp', 'Galón imperial', 'gal imp', 0.00454609)] },
  { id: 'storage', name: 'Almacenamiento digital', example: '1 MB = 1 000 000 B; 1 MiB = 1 048 576 B', note: 'b es bit; B es byte (8 bits). kB/MB/GB/TB son decimales; KiB/MiB/GiB/TiB son binarios. Se admiten fracciones.', units: [unit('bit', 'Bit', 'b', 0.125), unit('byte', 'Byte', 'B', 1), unit('kb', 'Kilobyte decimal', 'kB', 1e3), unit('mb', 'Megabyte decimal', 'MB', 1e6), unit('gb', 'Gigabyte decimal', 'GB', 1e9), unit('tb', 'Terabyte decimal', 'TB', 1e12), unit('kib', 'Kibibyte binario', 'KiB', 2 ** 10), unit('mib', 'Mebibyte binario', 'MiB', 2 ** 20), unit('gib', 'Gibibyte binario', 'GiB', 2 ** 30), unit('tib', 'Tebibyte binario', 'TiB', 2 ** 40)] },
];

export function parseUnitAmount(raw: string): number {
  const text = raw.trim();
  if (!text) throw new Error('Escribe una cantidad para convertir.');
  if (!/^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(text)) {
    throw new Error('Usa coma o punto decimal, sin separadores de miles. Ejemplos: 12,5; 12.5; 1e6.');
  }
  // 1,234 / 12.345 may be thousands or decimals. Require a fourth decimal digit
  // (1,2340) to state decimal intent; 1234 expresses a whole-number quantity.
  if (/^[+-]?[1-9]\d{0,2}[.,]\d{3}$/.test(text)) {
    throw new Error('Cantidad ambigua: elimina el separador de miles o añade un decimal (1,2340 para un valor decimal).');
  }
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) throw new Error('La cantidad está fuera del rango numérico del navegador.');
  const mantissa = text.split(/[eE]/)[0];
  if (value === 0 && /[1-9]/.test(mantissa)) throw new Error('La cantidad es demasiado pequeña para representarla sin perderla.');
  return Object.is(value, -0) ? 0 : value;
}

export function convertUnitAmount(value: number, familyId: UnitFamilyId, fromId: string, toId: string): number {
  const family = UNIT_FAMILIES.find((item) => item.id === familyId);
  const from = family?.units.find((item) => item.id === fromId);
  const to = family?.units.find((item) => item.id === toId);
  if (!family || !from || !to) throw new Error('Elige dos unidades de la misma familia.');
  if (!Number.isFinite(value)) throw new Error('La cantidad debe ser un número finito.');
  if (value < 0 && familyId !== 'length' && familyId !== 'temperature') throw new Error('Esta familia admite cero y cantidades positivas.');
  let result: number;
  if (familyId === 'temperature') {
    const minimum = fromId === 'c' ? -273.15 : fromId === 'f' ? -459.67 : 0;
    if (value < minimum) throw new Error('La temperatura está por debajo del cero absoluto.');
    const kelvin = fromId === 'c' ? value + 273.15 : fromId === 'f' ? (value + 459.67) / 1.8 : value;
    result = fromId === toId ? value : toId === 'c' ? kelvin - 273.15 : toId === 'f' ? kelvin * 1.8 - 459.67 : kelvin;
  } else {
    result = fromId === toId ? value : value * (from.factor / to.factor);
  }
  if (!Number.isFinite(result)) throw new Error('El resultado está fuera del rango numérico del navegador.');
  if (value !== 0 && result === 0 && familyId !== 'temperature') throw new Error('El resultado es demasiado pequeño para representarlo sin perderlo.');
  return Object.is(result, -0) ? 0 : result;
}

export function formatUnitAmount(value: number, digits: number): string {
  if (!Number.isFinite(value) || !Number.isInteger(digits) || digits < 1 || digits > 15) throw new Error('Elige una precisión entre 1 y 15 cifras significativas.');
  if (value === 0) return '0';
  const [mantissa, exponent] = value.toPrecision(digits).split('e');
  const compact = mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa;
  return compact.replace('.', ',') + (exponent === undefined ? '' : `e${exponent}`);
}
