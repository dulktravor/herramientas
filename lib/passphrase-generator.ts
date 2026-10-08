import { createRandomSampler } from './password-generator';
import type { FillRandomValues } from './password-generator';
import { PASSPHRASE_WORDS } from './passphrase-wordlist';

export const PASSPHRASE_MIN_WORDS = 6;
export const PASSPHRASE_MAX_WORDS = 12;
export const PASSPHRASE_SEPARATORS = { hyphen: '-', space: ' ', underscore: '_', period: '.' } as const;
export type PassphraseSeparator = keyof typeof PASSPHRASE_SEPARATORS;
export type PassphraseOptions = { words: number; separator: PassphraseSeparator };

export function validatePassphraseOptions(options: PassphraseOptions): string | null {
  if (!Number.isInteger(options.words) || options.words < PASSPHRASE_MIN_WORDS || options.words > PASSPHRASE_MAX_WORDS) {
    return `Elige una cantidad entera entre ${PASSPHRASE_MIN_WORDS} y ${PASSPHRASE_MAX_WORDS} palabras.`;
  }
  if (!Object.hasOwn(PASSPHRASE_SEPARATORS, options.separator)) return 'Elige un separador admitido.';
  return null;
}

export function generatePassphrase(options: PassphraseOptions, fill?: FillRandomValues): string {
  const invalid = validatePassphraseOptions(options);
  if (invalid) throw new Error(invalid);
  const random = createRandomSampler(fill);
  const words: string[] = [];
  try {
    for (let position = 0; position < options.words; position++) words.push(PASSPHRASE_WORDS[random.index(PASSPHRASE_WORDS.length)]);
    return words.join(PASSPHRASE_SEPARATORS[options.separator]);
  } finally { words.fill(''); random.dispose(); }
}
