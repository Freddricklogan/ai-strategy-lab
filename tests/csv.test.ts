import { describe, it, expect } from 'vitest';
import { importInitiatives, toCsv, COLUMNS } from '../src/csv.ts';
import { parseCsv, csvField } from '../src/csv-core.ts';
import { sampleInitiatives } from '../src/model.ts';

describe('csv-core', () => {
  it('parses quotes, doubled quotes, newlines, CRLF, BOM; reports ragged/empty/unterminated', () => {
    expect(parseCsv('﻿A,B\r\n"x, ""y""","l1\nl2"\r\n').rows).toEqual([{ a: 'x, "y"', b: 'l1\nl2' }]);
    expect(parseCsv('a,b\n1\n').warnings[0]).toMatch(/Row 2/);
    expect(parseCsv('').warnings).toEqual(['File is empty.']);
    expect(parseCsv('a\n"x').warnings[0]).toMatch(/Unterminated/);
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField(null)).toBe('');
  });
});

describe('initiative CSV', () => {
  it('round-trips the sample', () => {
    const s = sampleInitiatives();
    const back = importInitiatives(toCsv(s));
    expect(back.warnings).toEqual([]);
    expect(back.initiatives).toEqual(s);
    expect(COLUMNS).toHaveLength(18);
  });
  it('requires the score columns', () => {
    expect(importInitiatives('name,sponsor\nx,y\n').warnings[0]).toMatch(/Missing required column/);
  });
  it('validates rows, defaults ids, rejects duplicates, trims and caps text', () => {
    const header = COLUMNS.map((c) => c.toLowerCase()).join(',');
    const good = ['', ' Padded   name ', 'S', 'D', 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2].join(',');
    const dup1 = ['same', 'A', 'S', 'D', 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2].join(',');
    const dup2 = ['same', 'B', 'S', 'D', 4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2].join(',');
    const bad = ['x', 'Bad', 'S', 'D', 9, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2, 2].join(',');
    const r = importInitiatives([header, good, dup1, dup2, bad].join('\n'));
    expect(r.initiatives.map((i) => i.id)).toEqual(['import-1', 'same']);
    expect(r.initiatives[0]!.name).toBe('Padded name');
    expect(r.warnings).toEqual([
      expect.stringMatching(/Row 4: duplicate id "same"/),
      expect.stringMatching(/Row 5: value.financialImpact must be an integer 1–5/)
    ]);
  });
});
