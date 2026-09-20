/**
 * Generic CSV parsing and quoting — RFC 4180: quoted fields, doubled quotes,
 * embedded newlines, CRLF, BOM. Header row required; ragged rows reported.
 */

export interface ParsedCsv { headers: string[]; rows: Record<string, string>[]; warnings: string[] }

export function parseCsv(text: string): ParsedCsv {
  const src = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 1; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { record.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      record.push(field); field = '';
      records.push(record); record = [];
    } else field += ch;
  }
  if (field.length || record.length) { record.push(field); records.push(record); }
  const warnings: string[] = [];
  if (inQuotes) warnings.push('Unterminated quoted field; the file may be truncated.');
  const nonEmpty = records.filter((r) => r.some((f) => f.trim() !== ''));
  const first = nonEmpty[0];
  if (!first) return { headers: [], rows: [], warnings: ['File is empty.'] };
  const headers = first.map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  nonEmpty.slice(1).forEach((r, idx) => {
    if (r.length !== headers.length) {
      warnings.push(`Row ${idx + 2}: expected ${headers.length} fields, found ${r.length}; skipped.`);
      return;
    }
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
    rows.push(obj);
  });
  return { headers, rows, warnings };
}

export function csvField(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

