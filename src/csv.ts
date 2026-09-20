/**
 * Initiative CSV import/export. One row per initiative; every score column
 * validated as an integer 1–5; bad rows reported and skipped, never thrown.
 */

import { csvField, parseCsv } from './csv-core.ts';
import { FEASIBILITY_DIMENSIONS, RISK_DIMENSIONS, VALUE_DIMENSIONS, type Initiative } from './model.ts';
import { validateInitiative } from './scoring.ts';

export const COLUMNS = ['id', 'name', 'sponsor', 'description', ...VALUE_DIMENSIONS, ...FEASIBILITY_DIMENSIONS, ...RISK_DIMENSIONS] as const;

const clean = (s: string | undefined, max: number): string => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function toCsv(initiatives: Initiative[]): string {
  const lines = [COLUMNS.map((c) => c.toLowerCase()).join(',')];
  for (const i of initiatives) {
    const row: Array<string | number> = [i.id, i.name, i.sponsor, i.description,
      ...VALUE_DIMENSIONS.map((k) => i.value[k]),
      ...FEASIBILITY_DIMENSIONS.map((k) => i.feasibility[k]),
      ...RISK_DIMENSIONS.map((k) => i.risk[k])];
    lines.push(row.map(csvField).join(','));
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function importInitiatives(text: string): { initiatives: Initiative[]; warnings: string[] } {
  const { headers, rows, warnings } = parseCsv(text);
  const required = ['name', ...VALUE_DIMENSIONS, ...FEASIBILITY_DIMENSIONS, ...RISK_DIMENSIONS].map((c) => c.toLowerCase());
  const missing = required.filter((c) => !headers.includes(c));
  if (headers.length && missing.length) return { initiatives: [], warnings: [`Missing required column(s): ${missing.join(', ')}.`] };
  const out: Initiative[] = [];
  const seen = new Set<string>();
  rows.forEach((r, idx) => {
    const pick = <K extends string>(keys: readonly K[]): Record<K, number> => {
      const o = {} as Record<K, number>;
      for (const k of keys) o[k] = Number(r[k.toLowerCase()]);
      return o;
    };
    const i: Initiative = {
      id: clean(r['id'], 40) || `import-${idx + 1}`,
      name: clean(r['name'], 80),
      sponsor: clean(r['sponsor'], 60),
      description: clean(r['description'], 240),
      value: pick(VALUE_DIMENSIONS),
      feasibility: pick(FEASIBILITY_DIMENSIONS),
      risk: pick(RISK_DIMENSIONS)
    };
    const problems = validateInitiative(i);
    if (seen.has(i.id)) problems.push(`duplicate id "${i.id}"`);
    if (problems.length) { warnings.push(`Row ${idx + 2}: ${problems.join('; ')}; skipped.`); return; }
    seen.add(i.id);
    out.push(i);
  });
  return { initiatives: out, warnings };
}
