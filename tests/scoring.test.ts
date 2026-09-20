import { describe, it, expect } from 'vitest';
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, sampleInitiatives, type Initiative, type Weights } from '../src/model.ts';
import { assess, assessAll, recommend, summarizePortfolio, validateInitiative, validateWeights, weightedMean } from '../src/scoring.ts';

const sample = sampleInitiatives();
const t = DEFAULT_THRESHOLDS;

describe('weightedMean', () => {
  it('weights and rounds to two places', () => {
    expect(weightedMean({ a: 5, b: 1 }, { a: 3, b: 1 }, ['a', 'b'])).toBe(4);
    expect(weightedMean({ a: 4, b: 3, c: 5 }, { a: 1, b: 1, c: 1 }, ['a', 'b', 'c'])).toBe(4);
    expect(weightedMean({ a: 2, b: 3 }, { a: 1, b: 2 }, ['a', 'b'])).toBe(2.67);
  });
  it('drops zero-weight dimensions and returns 0 with no weight', () => {
    expect(weightedMean({ a: 5, b: 1 }, { a: 0, b: 1 }, ['a', 'b'])).toBe(1);
    expect(weightedMean({ a: 5 }, { a: 0 }, ['a'])).toBe(0);
  });
});

describe('recommend — the rule at its boundaries', () => {
  it('risk above the ceiling always goes to review, whatever the value', () => {
    expect(recommend(5, 5, 3.51, 5).recommendation).toBe('review');
    expect(recommend(5, 5, 3.5, 5).recommendation).toBe('build');
  });
  it('value below the floor waits', () => {
    expect(recommend(2.49, 5, 1, 5).recommendation).toBe('wait');
    expect(recommend(2.5, 5, 1, 5).recommendation).toBe('build');
  });
  it('feasible + differentiating → build; feasible + commodity → buy', () => {
    expect(recommend(4, 3.5, 2, 4).recommendation).toBe('build');
    expect(recommend(4, 3.5, 2, 3).recommendation).toBe('buy');
  });
  it('not feasible: differentiating waits, commodity buys', () => {
    expect(recommend(4, 3.49, 2, 4).recommendation).toBe('wait');
    expect(recommend(4, 3.49, 2, 3).recommendation).toBe('buy');
  });
  it('rationales quote the numbers', () => {
    expect(recommend(4, 3, 2, 5).rationale).toMatch(/feasibility 3 is below 3.5/);
    expect(recommend(1, 3, 2, 5).rationale).toMatch(/Value 1 is below the 2.5 floor/);
  });
  it('honours custom thresholds', () => {
    expect(recommend(4, 3, 2, 5, { ...t, buildFeasibility: 3 }).recommendation).toBe('build');
  });
});

describe('assess', () => {
  it('scores the sample and orders by priority', () => {
    const all = assessAll(sample);
    expect(all).toHaveLength(7);
    for (let i = 1; i < all.length; i += 1) expect(all[i - 1]!.priority).toBeGreaterThanOrEqual(all[i]!.priority);
    const byId = Object.fromEntries(all.map((a) => [a.id, a]));
    expect(byId['i2']!.recommendation).toBe('buy');     // ticket routing: feasible, commodity
    expect(byId['i4']!.recommendation).toBe('build');   // skills matcher: feasible, differentiating, risk 3.21
    expect(byId['i1']!.recommendation).toBe('review');  // early alert: risk over ceiling
    expect(byId['i6']!.recommendation).toBe('review');  // yield predictor
    expect(byId['i5']!.recommendation).toBe('wait');    // summariser: value 1.75
    expect(byId['i3']!.recommendation).toBe('review');  // essay scoring: risk over ceiling
    expect(byId['i7']!.recommendation).toBe('buy');     // chatbot: fit 3 → commodity
  });
  it('risk weight on harm to people is 1.5 by default and changes the score', () => {
    const i = sample[0]!;
    const equal: Weights = { ...DEFAULT_WEIGHTS, risk: { ...DEFAULT_WEIGHTS.risk, harmToPeople: 1 } };
    expect(assess(i, DEFAULT_WEIGHTS).risk).not.toBe(assess(i, equal).risk);
  });
  it('a risk slider can flip a build to a review', () => {
    const i = structuredClone(sample[3]!); // skills matcher
    expect(assess(i).recommendation).toBe('build');
    i.risk.harmToPeople = 5;
    i.risk.regulatoryExposure = 5;
    expect(assess(i).recommendation).toBe('review');
  });
});

describe('summarizePortfolio', () => {
  it('counts recommendations and high-risk initiatives', () => {
    const s = summarizePortfolio(assessAll(sample));
    expect(s.total).toBe(7);
    expect(s.counts).toEqual({ build: 1, buy: 2, wait: 1, review: 3 });
    expect(s.highRisk).toBe(3);
    expect(s.meanRisk).toBeGreaterThan(0);
    expect(summarizePortfolio([]).meanRisk).toBe(0);
  });
});

describe('validation', () => {
  it('accepts the sample', () => {
    for (const i of sample) expect(validateInitiative(i)).toEqual([]);
    expect(validateWeights(DEFAULT_WEIGHTS)).toEqual([]);
  });
  it('rejects out-of-range and non-integer scores and blank names', () => {
    const bad: Initiative = structuredClone(sample[0]!);
    bad.name = ' ';
    bad.value.reach = 6;
    bad.risk.privacy = 2.5;
    const p = validateInitiative(bad);
    expect(p).toContain('name is required');
    expect(p).toContain('value.reach must be an integer 1–5');
    expect(p).toContain('risk.privacy must be an integer 1–5');
    expect(p).toHaveLength(3);
  });
  it('rejects negative and all-zero weights', () => {
    const w: Weights = structuredClone(DEFAULT_WEIGHTS);
    w.value.reach = -1;
    w.feasibility = { dataReadiness: 0, technicalMaturity: 0, teamCapability: 0, integrationSimplicity: 0 };
    const p = validateWeights(w);
    expect(p).toContain('value weights must be non-negative numbers');
    expect(p).toContain('feasibility needs at least one positive weight');
  });
});
