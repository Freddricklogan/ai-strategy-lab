/**
 * Scoring and the decision rule. Pure functions; the thresholds and weights
 * are arguments so the same rule can be tested at every boundary.
 */

import {
  DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, FEASIBILITY_DIMENSIONS, RISK_DIMENSIONS, SCALE_MAX, SCALE_MIN, VALUE_DIMENSIONS,
  type Initiative, type Scores, type Thresholds, type Weights
} from './model.ts';

const round2 = (v: number): number => Number(v.toFixed(2));

/** Weighted mean of a score set; weights of zero drop a dimension. */
export function weightedMean<K extends string>(scores: Scores<K>, weights: Scores<K>, keys: readonly K[]): number {
  let sum = 0;
  let w = 0;
  for (const k of keys) {
    const weight = weights[k] ?? 0;
    if (weight <= 0) continue;
    sum += scores[k] * weight;
    w += weight;
  }
  return w > 0 ? round2(sum / w) : 0;
}

export type Recommendation = 'build' | 'buy' | 'wait' | 'review';

export interface Assessment {
  id: string;
  value: number;
  feasibility: number;
  risk: number;
  recommendation: Recommendation;
  rationale: string;
  /** Feasibility × value − risk pressure; used only for ordering, stated as such. */
  priority: number;
}

export const RECOMMENDATION_LABEL: Record<Recommendation, string> = {
  build: 'Build',
  buy: 'Buy',
  wait: 'Wait',
  review: 'Governance review'
};

/**
 * The decision rule, in order:
 *   1. risk above maxRisk            → review   (nothing proceeds without governance)
 *   2. value below minValue          → wait     (not worth the effort now)
 *   3. feasible and differentiating  → build
 *   4. feasible, not differentiating → buy      (a commodity capability; do not build it yourself)
 *   5. valuable but not feasible     → buy if not differentiating, else wait (build capability first)
 */
export function recommend(value: number, feasibility: number, risk: number, strategicFit: number, t: Thresholds = DEFAULT_THRESHOLDS): { recommendation: Recommendation; rationale: string } {
  if (risk > t.maxRisk) {
    return { recommendation: 'review', rationale: `Risk ${risk} exceeds the ${t.maxRisk} ceiling; a governance review must precede any build or purchase.` };
  }
  if (value < t.minValue) {
    return { recommendation: 'wait', rationale: `Value ${value} is below the ${t.minValue} floor; revisit when the case is stronger.` };
  }
  const differentiating = strategicFit >= t.differentiatingFit;
  if (feasibility >= t.buildFeasibility) {
    return differentiating
      ? { recommendation: 'build', rationale: `Feasible (${feasibility}) and differentiating (fit ${strategicFit}); build and own it.` }
      : { recommendation: 'buy', rationale: `Feasible (${feasibility}) but not differentiating (fit ${strategicFit}); a vendor capability will do.` };
  }
  return differentiating
    ? { recommendation: 'wait', rationale: `Differentiating (fit ${strategicFit}) but feasibility ${feasibility} is below ${t.buildFeasibility}; build the data or team first.` }
    : { recommendation: 'buy', rationale: `Not feasible to build (${feasibility}) and not differentiating (fit ${strategicFit}); buy if a vendor exists.` };
}

export function assess(initiative: Initiative, weights: Weights = DEFAULT_WEIGHTS, thresholds: Thresholds = DEFAULT_THRESHOLDS): Assessment {
  const value = weightedMean(initiative.value, weights.value, VALUE_DIMENSIONS);
  const feasibility = weightedMean(initiative.feasibility, weights.feasibility, FEASIBILITY_DIMENSIONS);
  const risk = weightedMean(initiative.risk, weights.risk, RISK_DIMENSIONS);
  const { recommendation, rationale } = recommend(value, feasibility, risk, initiative.value.strategicFit, thresholds);
  return {
    id: initiative.id,
    value,
    feasibility,
    risk,
    recommendation,
    rationale,
    priority: round2(value * feasibility - risk)
  };
}

export function assessAll(initiatives: Initiative[], weights?: Weights, thresholds?: Thresholds): Assessment[] {
  return initiatives.map((i) => assess(i, weights, thresholds)).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

export interface PortfolioSummary {
  total: number;
  counts: Record<Recommendation, number>;
  meanRisk: number;
  highRisk: number;
}

export function summarizePortfolio(assessments: Assessment[], thresholds: Thresholds = DEFAULT_THRESHOLDS): PortfolioSummary {
  const counts: Record<Recommendation, number> = { build: 0, buy: 0, wait: 0, review: 0 };
  let risk = 0;
  let high = 0;
  for (const a of assessments) {
    counts[a.recommendation] += 1;
    risk += a.risk;
    if (a.risk > thresholds.maxRisk) high += 1;
  }
  return { total: assessments.length, counts, meanRisk: assessments.length ? round2(risk / assessments.length) : 0, highRisk: high };
}

/** Problems with an initiative's scores; empty when valid. */
export function validateInitiative(i: Initiative): string[] {
  const problems: string[] = [];
  if (!i.name.trim()) problems.push('name is required');
  const check = (group: string, scores: Record<string, number>, keys: readonly string[]): void => {
    for (const k of keys) {
      const v = scores[k];
      if (!Number.isInteger(v) || (v as number) < SCALE_MIN || (v as number) > SCALE_MAX) problems.push(`${group}.${k} must be an integer ${SCALE_MIN}–${SCALE_MAX}`);
    }
  };
  check('value', i.value, VALUE_DIMENSIONS);
  check('feasibility', i.feasibility, FEASIBILITY_DIMENSIONS);
  check('risk', i.risk, RISK_DIMENSIONS);
  return problems;
}

/** Weights must be non-negative and at least one per axis must be positive. */
export function validateWeights(w: Weights): string[] {
  const problems: string[] = [];
  const axis = (name: string, scores: Record<string, number>): void => {
    const vals = Object.values(scores);
    if (vals.some((v) => !Number.isFinite(v) || v < 0)) problems.push(`${name} weights must be non-negative numbers`);
    if (!vals.some((v) => v > 0)) problems.push(`${name} needs at least one positive weight`);
  };
  axis('value', w.value);
  axis('feasibility', w.feasibility);
  axis('risk', w.risk);
  return problems;
}
