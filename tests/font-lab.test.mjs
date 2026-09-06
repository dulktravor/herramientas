import test from 'node:test';
import assert from 'node:assert/strict';
import { Font, woff2 } from 'fonteditor-core';
import { inflate, deflate } from 'pako';
import { detectFont } from '../lib/font-lab-types.ts';
const base = new Font();
const data = base.get();
for (const code of [65, 66, 241, 0x1f600]) {
  data.glyf.push({
    ...structuredClone(data.glyf[0]),
    name: 'u' + code,
    unicode: [code],
  });
}
const original = base.write({ type: 'ttf', toBuffer: false });
const options = {
  inflate: (bytes) => Array.from(inflate(new Uint8Array(bytes))),
};
test('rechaza archivos inválidos y detecta TTF por firma', () => {
  assert.throws(() => detectFont(new Uint8Array([1, 2, 3]).buffer));
  assert.equal(detectFont(original), 'ttf');
});
test('conversión y relectura de TTF, WOFF y WOFF2 preservan caracteres', async () => {
  await woff2.init();
  for (const type of ['ttf', 'woff', 'woff2']) {
    const font = Font.create(original, { type: 'ttf' });
    const exported = font.write({
      type,
      toBuffer: false,
      deflate: (bytes) => Array.from(deflate(new Uint8Array(bytes))),
    });
    assert.equal(detectFont(exported), type);
    const reread = Font.create(exported, { type, ...options }).get();
    assert.deepEqual(
      reread.glyf.flatMap((g) => g.unicode || []).sort((a, b) => a - b),
      [65, 66, 241, 0x1f600],
    );
  }
});
test('subconjunto retiene eñe y Unicode no BMP sin caracteres ajenos', () => {
  const subset = Font.create(original, {
    type: 'ttf',
    subset: [241, 0x1f600],
    compound2simple: true,
  });
  const exported = subset.write({ type: 'ttf', toBuffer: false });
  const reread = Font.create(exported, { type: 'ttf' }).get();
  assert.deepEqual(
    reread.glyf.flatMap((g) => g.unicode || []).sort((a, b) => a - b),
    [241, 0x1f600],
  );
});
