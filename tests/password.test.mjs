import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';

// Production imports stay extensionless for TypeScript/Vite. Node's source-only
// test run resolves these two local modules without altering application config.
registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(/^\.\/pass(?:word-generator|phrase-wordlist)$/.test(specifier) ? `${specifier}.ts` : specifier, context);
} });
const { PASSWORD_GROUPS, generatePassword, validatePasswordOptions, createRandomSampler } = await import('../lib/password-generator.ts');
const { generatePassphrase, validatePassphraseOptions, PASSPHRASE_SEPARATORS } = await import('../lib/passphrase-generator.ts');
const { PASSPHRASE_WORDS } = await import('../lib/passphrase-wordlist.ts');

void test('las 15 combinaciones de grupos respetan longitud, cobertura y exclusiones', () => {
  const keys = Object.keys(PASSWORD_GROUPS);
  for (let bits = 1; bits < 16; bits++) {
    const groups = keys.filter((_, index) => bits & (1 << index));
    const allowed = groups.map((group) => PASSWORD_GROUPS[group]).join('');
    for (const length of [4, 12, 20, 128]) for (let run = 0; run < 20; run++) {
      const generated = generatePassword({ length, groups });
      assert.equal(generated.length, length);
      assert.ok(generated.split('').every((character) => allowed.includes(character)));
      assert.ok(groups.every((group) => generated.split('').some((character) => PASSWORD_GROUPS[group].includes(character))));
    }
  }
});

void test('preferencias inválidas no se corrigen ni consumen aleatoriedad', () => {
  for (const options of [{ length: 3, groups: ['lowercase'] }, { length: 129, groups: ['lowercase'] }, { length: 4.5, groups: ['lowercase'] }, { length: NaN, groups: ['lowercase'] }, { length: 20, groups: [] }, { length: 20, groups: ['lowercase', 'lowercase'] }, { length: 20, groups: ['alien'] }]) {
    assert.ok(validatePasswordOptions(options));
    assert.throws(() => generatePassword(options, () => assert.fail('No debe consumir aleatoriedad')));
  }
  for (const options of [{ words: 5, separator: 'hyphen' }, { words: 13, separator: 'hyphen' }, { words: 6.5, separator: 'space' }, { words: 6, separator: 'unknown' }]) {
    assert.ok(validatePassphraseOptions(options));
    assert.throws(() => generatePassphrase(options));
  }
});

void test('rechaza el residuo superior de 32 bits y conserva índices extremos', () => {
  const sampler = createRandomSampler((values) => { values.fill(0); values[0] = 0xffffffff; values[1] = 4294967290; values[2] = 4294967289; });
  assert.equal(sampler.index(10), 9); // Both values >= 4294967290 are rejected.
  assert.equal(sampler.index(10), 0);
  sampler.dispose();
  const max = createRandomSampler((values) => values.fill(0xffffffff));
  assert.equal(max.index(0x100000000), 0xffffffff);
  assert.throws(() => max.index(0));
  max.dispose();
});

void test('un candidato sin cobertura se descarta completo y no se parchea', () => {
  const password = generatePassword({ length: 4, groups: ['lowercase', 'uppercase'] }, (values) => {
    values.fill(0); values.set([0, 0, 0, 0, 26, 0, 26, 0]);
  });
  assert.equal(password, 'AaAa');
});

void test('fallo de crypto y fuente defectuosa se detienen sin alternativa débil', () => {
  const failing = () => { throw new Error('SENSITIVE_INTERNAL_MARKER'); };
  assert.throws(() => generatePassword({ length: 20, groups: ['lowercase'] }, failing), (error) => /aleatoriedad criptográfica/.test(error.message) && !error.message.includes('SENSITIVE_INTERNAL_MARKER'));
  assert.throws(() => generatePassphrase({ words: 6, separator: 'hyphen' }, failing), /aleatoriedad criptográfica/);
  const stuck = createRandomSampler((values) => values.fill(0xffffffff));
  assert.throws(() => stuck.index(7776), /aleatoriedad criptográfica/);
  stuck.dispose();
  assert.throws(() => generatePassword({ length: 4, groups: ['lowercase', 'uppercase'] }, (values) => values.fill(0)), /aleatoriedad criptográfica/);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: undefined });
    assert.throws(() => generatePassword({ length: 20, groups: ['lowercase'] }), /aleatoriedad criptográfica/);
  } finally { Object.defineProperty(globalThis, 'crypto', descriptor); }
});

void test('buffers temporales se ponen a cero al consumir, liberar y fallar', () => {
  let bytes;
  const sampler = createRandomSampler((values) => { bytes = values; values.fill(42); });
  assert.equal(sampler.index(100), 42);
  assert.equal(bytes[0], 0);
  sampler.dispose();
  assert.ok(bytes.every((value) => value === 0));
  assert.throws(() => generatePassword({ length: 20, groups: ['lowercase'] }, (values) => { bytes = values; values.fill(77); throw new Error(); }));
  assert.ok(bytes.every((value) => value === 0));
});

void test('diccionario EFF íntegro, único y con composición documentada', () => {
  assert.equal(PASSPHRASE_WORDS.length, 7776);
  assert.equal(new Set(PASSPHRASE_WORDS).size, 7776);
  assert.ok(PASSPHRASE_WORDS.every((word) => /^[a-z-]{3,9}$/.test(word)));
  assert.deepEqual(PASSPHRASE_WORDS.filter((word) => word.includes('-')), ['drop-down', 'felt-tip', 't-shirt', 'yo-yo']);
  assert.equal(PASSPHRASE_WORDS[0], 'abacus');
  assert.equal(PASSPHRASE_WORDS.at(-1), 'zoom');
  assert.ok(Object.isFrozen(PASSPHRASE_WORDS));
});

void test('frases respetan todas las cantidades y separadores y permiten repetición', () => {
  for (let words = 6; words <= 12; words++) for (const [separator, character] of Object.entries(PASSPHRASE_SEPARATORS)) {
    const phrase = generatePassphrase({ words, separator }, (values) => { values.forEach((_, index) => { values[index] = index; }); });
    const split = phrase.split(character);
    assert.equal(split.length, words);
    assert.deepEqual(split, PASSPHRASE_WORDS.slice(0, words));
  }
  assert.equal(generatePassphrase({ words: 6, separator: 'space' }, (values) => values.fill(0)), Array(6).fill('abacus').join(' '));
  assert.equal(generatePassphrase({ words: 6, separator: 'period' }, (values) => values.fill(7775)), Array(6).fill('zoom').join('.'));
});

void test('los cuatro compuestos conservan su guion con cualquier separador', () => {
  for (const compound of ['drop-down', 'felt-tip', 't-shirt', 'yo-yo']) {
    const dictionaryIndex = PASSPHRASE_WORDS.indexOf(compound);
    assert.ok(dictionaryIndex >= 0);
    for (const [separator, character] of Object.entries(PASSPHRASE_SEPARATORS)) {
      const phrase = generatePassphrase({ words: 6, separator }, (values) => values.fill(dictionaryIndex));
      assert.equal(phrase, Array(6).fill(compound).join(character));
      if (separator !== 'hyphen') assert.equal(phrase.split(character).length, 6);
    }
  }
});

void test('código local no incluye generación débil, logs, historial, red o almacenamiento', async () => {
  for (const file of ['lib/password-generator.ts', 'lib/passphrase-generator.ts', 'components/password-generator.tsx']) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /Math\.random|console\.|localStorage|sessionStorage|fetch\(|sendBeacon|XMLHttpRequest|pushState|replaceState/);
  }
});
