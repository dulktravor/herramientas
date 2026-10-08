export type NormalizedPoint = { x: number; y: number };
export type PerspectiveCorners = [
  NormalizedPoint,
  NormalizedPoint,
  NormalizedPoint,
  NormalizedPoint,
];

export const DEFAULT_CORNERS: PerspectiveCorners = [
  { x: 0.04, y: 0.04 },
  { x: 0.96, y: 0.04 },
  { x: 0.96, y: 0.96 },
  { x: 0.04, y: 0.96 },
];

export function cloneCorners(corners: PerspectiveCorners): PerspectiveCorners {
  return corners.map((point) => ({ ...point })) as PerspectiveCorners;
}

export function clampPoint(point: NormalizedPoint): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y)),
  };
}

function polygonArea(corners: PerspectiveCorners) {
  return Math.abs(
    corners.reduce((sum, point, index) => {
      const next = corners[(index + 1) % corners.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2,
  );
}

export function isValidPerspective(corners: PerspectiveCorners) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  return (
    polygonArea(corners) >= 0.025 &&
    topLeft.x < topRight.x &&
    bottomLeft.x < bottomRight.x &&
    topLeft.y < bottomLeft.y &&
    topRight.y < bottomRight.y
  );
}

function distance(a: NormalizedPoint, b: NormalizedPoint, width: number, height: number) {
  return Math.hypot((a.x - b.x) * width, (a.y - b.y) * height);
}

export function perspectiveDimensions(
  corners: PerspectiveCorners,
  sourceWidth: number,
  sourceHeight: number,
  maxSide = 2600,
) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners;
  const rawWidth = Math.max(
    1,
    (distance(topLeft, topRight, sourceWidth, sourceHeight) +
      distance(bottomLeft, bottomRight, sourceWidth, sourceHeight)) /
      2,
  );
  const rawHeight = Math.max(
    1,
    (distance(topLeft, bottomLeft, sourceWidth, sourceHeight) +
      distance(topRight, bottomRight, sourceWidth, sourceHeight)) /
      2,
  );
  const scale = Math.min(1, maxSide / Math.max(rawWidth, rawHeight));
  return {
    width: Math.max(1, Math.round(rawWidth * scale)),
    height: Math.max(1, Math.round(rawHeight * scale)),
  };
}

export function projectPerspectivePoint(
  corners: PerspectiveCorners,
  unitX: number,
  unitY: number,
) {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;

  let g = 0;
  let h = 0;
  if (Math.abs(denominator) > 1e-8) {
    g = (sx * dy2 - dx2 * sy) / denominator;
    h = (dx1 * sy - sx * dy1) / denominator;
  }

  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const scale = g * unitX + h * unitY + 1;

  return {
    x: (a * unitX + b * unitY + p0.x) / scale,
    y: (d * unitX + e * unitY + p0.y) / scale,
  };
}

function fallbackCorners() {
  return cloneCorners(DEFAULT_CORNERS);
}

export function detectDocumentCorners(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): PerspectiveCorners {
  if (width < 8 || height < 8 || pixels.length < width * height * 4) {
    return fallbackCorners();
  }

  let borderR = 0;
  let borderG = 0;
  let borderB = 0;
  let borderSamples = 0;
  const borderDepth = Math.max(2, Math.round(Math.min(width, height) * 0.025));
  const sample = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    borderR += pixels[index];
    borderG += pixels[index + 1];
    borderB += pixels[index + 2];
    borderSamples += 1;
  };

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (x < borderDepth || x >= width - borderDepth || y < borderDepth || y >= height - borderDepth) {
        sample(x, y);
      }
    }
  }
  if (!borderSamples) return fallbackCorners();
  borderR /= borderSamples;
  borderG /= borderSamples;
  borderB /= borderSamples;
  const borderLuminance = borderR * 0.299 + borderG * 0.587 + borderB * 0.114;

  const mask = new Uint8Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const pixelIndex = (y * width + x) * 4;
      const r = pixels[pixelIndex];
      const g = pixels[pixelIndex + 1];
      const b = pixels[pixelIndex + 2];
      const luminance = r * 0.299 + g * 0.587 + b * 0.114;
      const colorDistance = Math.hypot(r - borderR, g - borderG, b - borderB);
      const lightPaper = borderLuminance < 205 && luminance - borderLuminance > 22;
      const darkPaper = borderLuminance > 70 && borderLuminance - luminance > 34;
      if (colorDistance > 42 || lightPaper || darkPaper) mask[y * width + x] = 1;
    }
  }

  const visited = new Uint8Array(mask.length);
  const stack = new Int32Array(mask.length);
  let bestCount = 0;
  let bestCorners: PerspectiveCorners | null = null;

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) continue;
    let stackLength = 1;
    stack[0] = start;
    visited[start] = 1;
    let count = 0;
    let topLeft = { x: width, y: height, score: Number.POSITIVE_INFINITY };
    let topRight = { x: 0, y: height, score: Number.NEGATIVE_INFINITY };
    let bottomRight = { x: 0, y: 0, score: Number.NEGATIVE_INFINITY };
    let bottomLeft = { x: width, y: 0, score: Number.POSITIVE_INFINITY };

    while (stackLength) {
      const current = stack[--stackLength];
      const x = current % width;
      const y = Math.floor(current / width);
      count += 1;
      const sum = x + y;
      const difference = x - y;
      if (sum < topLeft.score) topLeft = { x, y, score: sum };
      if (difference > topRight.score) topRight = { x, y, score: difference };
      if (sum > bottomRight.score) bottomRight = { x, y, score: sum };
      if (difference < bottomLeft.score) bottomLeft = { x, y, score: difference };

      const neighbours = [current - 1, current + 1, current - width, current + width];
      for (const neighbour of neighbours) {
        if (neighbour < 0 || neighbour >= mask.length || visited[neighbour] || !mask[neighbour]) continue;
        const neighbourX = neighbour % width;
        if (Math.abs(neighbourX - x) > 1) continue;
        visited[neighbour] = 1;
        stack[stackLength++] = neighbour;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestCorners = [topLeft, topRight, bottomRight, bottomLeft].map(({ x, y }) => ({
        x: x / Math.max(1, width - 1),
        y: y / Math.max(1, height - 1),
      })) as PerspectiveCorners;
    }
  }

  if (!bestCorners || bestCount < width * height * 0.035 || !isValidPerspective(bestCorners)) {
    return fallbackCorners();
  }

  const padded = bestCorners.map((point) => ({
    x: Math.max(0.005, Math.min(0.995, point.x)),
    y: Math.max(0.005, Math.min(0.995, point.y)),
  })) as PerspectiveCorners;
  return isValidPerspective(padded) ? padded : fallbackCorners();
}
