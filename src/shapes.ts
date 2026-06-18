export type ShapeKey =
  | 'pill-card'
  | 'rounded-square-lens'
  | 'droplet'
  | 'wavy-sheet'
  | 'thick-edge-button'
  | 'molten-panel';

export type ShapeDefinition = {
  key: ShapeKey;
  label: string;
  file: string;
  mapUrl: string;
  aspect: number;
};

const mapVersion = 'opaque-rg-v2';

const makeShape = (key: ShapeKey, label: string, aspect = 1): ShapeDefinition => ({
  key,
  label,
  file: `${key}.png`,
  mapUrl: `/generated/${key}.png?v=${mapVersion}`,
  aspect,
});

export const shapes: Record<ShapeKey, ShapeDefinition> = {
  'pill-card': makeShape('pill-card', 'Pill card', 1.95),
  'rounded-square-lens': makeShape('rounded-square-lens', 'Rounded square', 1),
  droplet: makeShape('droplet', 'Droplet', 0.82),
  'wavy-sheet': makeShape('wavy-sheet', 'Wavy sheet', 1.45),
  'thick-edge-button': makeShape('thick-edge-button', 'Thick edge', 2.2),
  'molten-panel': makeShape('molten-panel', 'Molten panel', 1.35),
};

export function sampleHeight(shapeKey: ShapeKey, x: number, y: number): number {
  switch (shapeKey) {
    case 'pill-card':
      return lensFromSdf(roundedBox(x, y, 0.82, 0.38, 0.24), 0.16, 0.86);
    case 'rounded-square-lens':
      return lensFromSdf(roundedBox(x, y, 0.58, 0.58, 0.18), 0.13, 0.78);
    case 'droplet': {
      const head = circle(x, y + 0.08, 0.5);
      const neck = roundedBox(x, y - 0.24, 0.2, 0.38, 0.16);
      const body = smoothMin(head, neck, 0.22);
      return clamp(lensFromSdf(body, 0.11, 0.92) * (1 + 0.16 * x - 0.08 * y), 0, 1);
    }
    case 'wavy-sheet': {
      const base = lensFromSdf(roundedBox(x, y, 0.82, 0.55, 0.08), 0.08, 0.58);
      return clamp(base * (0.62 + 0.2 * Math.sin(x * 9 + y * 2) + 0.12 * Math.cos(y * 13 - x * 1.5)), 0, 1);
    }
    case 'thick-edge-button': {
      const sdf = roundedBox(x, y, 0.78, 0.34, 0.2);
      const body = lensFromSdf(sdf, 0.1, 0.52);
      const edge = Math.pow(1 - clamp(Math.abs(sdf) / 0.16, 0, 1), 1.8);
      return clamp(body * 0.58 + edge * 0.54, 0, 1);
    }
    case 'molten-panel': {
      const wx = x + 0.04 * Math.sin(y * 8) + 0.025 * Math.cos(y * 17);
      const wy = y + 0.035 * Math.cos(x * 7);
      const sdf = roundedBox(wx, wy, 0.76, 0.5, 0.15);
      return clamp(lensFromSdf(sdf, 0.12, 0.72) * (0.85 + 0.15 * (Math.sin(x * 11) * Math.cos(y * 9))), 0, 1);
    }
  }
}

function lensFromSdf(sdf: number, feather: number, crown: number) {
  const inside = smoothstep(feather, -feather, sdf);
  const crownShape = Math.max(0, 1 - Math.pow(clamp(Math.abs(sdf / crown), 0, 1), 2));
  return inside * Math.sqrt(crownShape);
}

function roundedBox(x: number, y: number, hx: number, hy: number, r: number) {
  const qx = Math.abs(x) - hx + r;
  const qy = Math.abs(y) - hy + r;
  const ox = Math.max(qx, 0);
  const oy = Math.max(qy, 0);
  return Math.sqrt(ox * ox + oy * oy) + Math.min(Math.max(qx, qy), 0) - r;
}

function circle(x: number, y: number, r: number) {
  return Math.sqrt(x * x + y * y) - r;
}

function smoothMin(a: number, b: number, k: number) {
  const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
  return b * h + a * (1 - h) - k * h * (1 - h);
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
