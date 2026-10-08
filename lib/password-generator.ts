export const PASSWORD_GROUPS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
} as const;

export type PasswordGroup = keyof typeof PASSWORD_GROUPS;
export type PasswordOptions = { length: number; groups: readonly PasswordGroup[] };
export type FillRandomValues = (values: Uint32Array) => void;

export const PASSWORD_MIN_LENGTH = 4;
export const PASSWORD_MAX_LENGTH = 128;
const RANDOM_ERROR = 'No se pudo obtener aleatoriedad criptográfica. Prueba con un navegador actualizado; no se ha generado ningún resultado.';
const UINT32_RANGE = 0x100000000;

function fillFromCrypto(values: Uint32Array): void {
  try {
    if (!globalThis.crypto?.getRandomValues) throw new Error();
    globalThis.crypto.getRandomValues(values);
  } catch {
    throw new Error(RANDOM_ERROR);
  }
}

/** Rejection sampling removes modulo bias. Temporary random bytes are wiped. */
export function createRandomSampler(fill: FillRandomValues = fillFromCrypto) {
  const buffer = new Uint32Array(128);
  let cursor = buffer.length;
  return {
    index(size: number): number {
      if (!Number.isInteger(size) || size < 1 || size > UINT32_RANGE) {
        throw new Error('El tamaño del alfabeto no es válido.');
      }
      const limit = UINT32_RANGE - (UINT32_RANGE % size);
      for (let retry = 0; retry < 128; retry++) {
        if (cursor === buffer.length) {
          try { fill(buffer); } catch { buffer.fill(0); throw new Error(RANDOM_ERROR); }
          cursor = 0;
        }
        const value = buffer[cursor];
        buffer[cursor++] = 0;
        if (value < limit) return value % size;
      }
      throw new Error(RANDOM_ERROR);
    },
    dispose(): void { buffer.fill(0); cursor = buffer.length; },
  };
}

export function validatePasswordOptions(options: PasswordOptions): string | null {
  if (!Number.isInteger(options.length) || options.length < PASSWORD_MIN_LENGTH || options.length > PASSWORD_MAX_LENGTH) {
    return `Elige una longitud entera entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  if (!Array.isArray(options.groups) || options.groups.length === 0) return 'Selecciona al menos un grupo de caracteres.';
  if (options.groups.some((group) => !Object.hasOwn(PASSWORD_GROUPS, group))) return 'Hay un grupo de caracteres no admitido.';
  if (new Set(options.groups).size !== options.groups.length) return 'Cada grupo de caracteres debe aparecer una sola vez.';
  if (options.length < options.groups.length) return 'La longitud debe permitir al menos un carácter de cada grupo seleccionado.';
  return null;
}

export function generatePassword(options: PasswordOptions, fill?: FillRandomValues): string {
  const invalid = validatePasswordOptions(options);
  if (invalid) throw new Error(invalid);
  const groups = options.groups.map((group) => PASSWORD_GROUPS[group]);
  const alphabet = groups.join('');
  const random = createRandomSampler(fill);
  try {
    // Each candidate is uniform over alphabet^length. Conditioning on group
    // coverage preserves uniformity over all strings meeting the chosen rules.
    // A bounded failure stops instead of weakening or changing those rules.
    for (let attempt = 0; attempt < 4096; attempt++) {
      const characters: string[] = [];
      for (let position = 0; position < options.length; position++) characters.push(alphabet[random.index(alphabet.length)]);
      const valid = groups.every((group) => characters.some((character) => group.includes(character)));
      const result = valid ? characters.join('') : '';
      characters.fill('');
      if (valid) return result;
    }
    throw new Error(RANDOM_ERROR);
  } finally { random.dispose(); }
}
