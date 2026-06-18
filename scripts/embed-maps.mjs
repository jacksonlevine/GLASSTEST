import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const shapes = [
  'pill-card',
  'rounded-square-lens',
  'droplet',
  'wavy-sheet',
  'thick-edge-button',
  'molten-panel',
];

const entries = shapes.map((shape) => {
  const file = join(root, 'public', 'generated', `${shape}.png`);
  const encoded = readFileSync(file).toString('base64');
  return `  '${shape}': 'data:image/png;base64,${encoded}',`;
});

const outFile = join(root, 'src', 'generated', 'displacementMaps.ts');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(
  outFile,
  [
    'import type { ShapeKey } from "../shapes";',
    '',
    'export const displacementMaps: Record<ShapeKey, string> = {',
    ...entries,
    '};',
    '',
  ].join('\n'),
);

console.log(`embedded ${shapes.length} displacement maps into src/generated/displacementMaps.ts`);
