/**
 * Writes the full synthetic dataset (all days, no filters) as BI-ready CSVs
 * plus a JSON copy into /data. Usage: npm run export-data
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateCells } from '../src/data/generator';
import { DATASETS } from '../src/data/datasets';
import { toCSV } from '../src/lib/csv';
import { DATA_DAYS } from '../src/data/dimensions';

const out = join(process.cwd(), 'data');
mkdirSync(out, { recursive: true });
const cells = generateCells();
const filters = { start: 0, end: DATA_DAYS - 1, segments: [], devices: [], regions: [] };

for (const d of DATASETS) {
  const rows = d.build(cells, filters);
  writeFileSync(join(out, `${d.id}.csv`), toCSV(rows) + '\n');
  console.log(`${d.id}.csv  ${rows.length} rows`);
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify({
  generated_from: 'synthetic generator (seed 20261029)',
  synthetic: true,
  contains_pii: false,
  days: DATA_DAYS,
  datasets: DATASETS.map((d) => ({ file: `${d.id}.csv`, name: d.name, grain: d.grain, description: d.description })),
}, null, 2) + '\n');
