import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CORNERS,
  detectDocumentCorners,
  isValidPerspective,
  perspectiveDimensions,
  projectPerspectivePoint,
} from '../lib/perspective.ts';

void test('proyecta las esquinas del rectángulo sobre el cuadrilátero', () => {
  const corners = [
    { x: 0.1, y: 0.2 },
    { x: 0.9, y: 0.1 },
    { x: 0.8, y: 0.95 },
    { x: 0.2, y: 0.85 },
  ];
  const inputs = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  inputs.forEach(([x, y], index) => {
    const projected = projectPerspectivePoint(corners, x, y);
    assert.ok(Math.abs(projected.x - corners[index].x) < 1e-8);
    assert.ok(Math.abs(projected.y - corners[index].y) < 1e-8);
  });
});

void test('calcula dimensiones sin superar el lado máximo', () => {
  const dimensions = perspectiveDimensions(DEFAULT_CORNERS, 4000, 3000, 2000);
  assert.equal(Math.max(dimensions.width, dimensions.height), 2000);
  assert.ok(dimensions.width > dimensions.height);
});

void test('detecta una hoja clara sobre un fondo oscuro', () => {
  const width = 120;
  const height = 100;
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const paper = x >= 20 && x <= 100 && y >= 12 && y <= 88;
      const value = paper ? 245 : 25;
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
      pixels[index + 3] = 255;
    }
  }
  const corners = detectDocumentCorners(pixels, width, height);
  assert.equal(isValidPerspective(corners), true);
  assert.ok(corners[0].x < 0.2);
  assert.ok(corners[0].y < 0.2);
  assert.ok(corners[2].x > 0.8);
  assert.ok(corners[2].y > 0.8);
});

void test('usa un cuadrilátero seguro cuando no hay documento detectable', () => {
  const width = 40;
  const height = 40;
  const pixels = new Uint8ClampedArray(width * height * 4).fill(128);
  const corners = detectDocumentCorners(pixels, width, height);
  assert.deepEqual(corners, DEFAULT_CORNERS);
});
