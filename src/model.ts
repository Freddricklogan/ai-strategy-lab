/**
 * AI initiative triage — the model. Each initiative is scored on three
 * axes, every dimension on a 1–5 scale entered by the assessor:
 *
 *   value        what the initiative is worth if it works
 *   feasibility  how likely the organisation is to make it work
 *   risk         what could go wrong for people, the institution, or the law —
 *                dimensions modelled on the NIST AI Risk Management Framework's
 *                trustworthiness characteristics
 *
 * The weights are visible and editable: a triage tool whose weights are
 * hidden is an opinion with a number on it.
 */

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;

export const VALUE_DIMENSIONS = ['financialImpact', 'strategicFit', 'reach', 'urgency'] as const;
export const FEASIBILITY_DIMENSIONS = ['dataReadiness', 'technicalMaturity', 'teamCapability', 'integrationSimplicity'] as const;
export const RISK_DIMENSIONS = ['harmToPeople', 'biasAndFairness', 'privacy', 'explainabilityNeed', 'regulatoryExposure', 'robustness'] as const;

export type ValueDimension = (typeof VALUE_DIMENSIONS)[number];
export type FeasibilityDimension = (typeof FEASIBILITY_DIMENSIONS)[number];
export type RiskDimension = (typeof RISK_DIMENSIONS)[number];

export const DIMENSION_LABEL: Record<ValueDimension | FeasibilityDimension | RiskDimension, string> = {
  financialImpact: 'Financial impact',
  strategicFit: 'Strategic fit',
  reach: 'People reached',
  urgency: 'Urgency',
  dataReadiness: 'Data readiness',
  technicalMaturity: 'Technical maturity',
  teamCapability: 'Team capability',
  integrationSimplicity: 'Integration simplicity',
  harmToPeople: 'Potential harm to people',
  biasAndFairness: 'Bias and fairness exposure',
  privacy: 'Privacy sensitivity',
  explainabilityNeed: 'Need for explainability',
  regulatoryExposure: 'Regulatory exposure',
  robustness: 'Robustness concerns'
};

export type Scores<K extends string> = Record<K, number>;

export interface Initiative {
  id: string;
  name: string;
  sponsor: string;
  description: string;
  value: Scores<ValueDimension>;
  feasibility: Scores<FeasibilityDimension>;
  risk: Scores<RiskDimension>;
}

export interface Weights {
  value: Scores<ValueDimension>;
  feasibility: Scores<FeasibilityDimension>;
  risk: Scores<RiskDimension>;
}

/** Equal weights within each axis — the default a reader can change. */
export const DEFAULT_WEIGHTS: Weights = {
  value: { financialImpact: 1, strategicFit: 1, reach: 1, urgency: 1 },
  feasibility: { dataReadiness: 1, technicalMaturity: 1, teamCapability: 1, integrationSimplicity: 1 },
  risk: { harmToPeople: 1.5, biasAndFairness: 1, privacy: 1, explainabilityNeed: 1, regulatoryExposure: 1, robustness: 1 }
};

/** Decision thresholds, on the 1–5 scale. Visible in the UI and tested at their boundaries. */
export interface Thresholds {
  /** Below this value, the initiative is not worth pursuing now. */
  minValue: number;
  /** At or above this feasibility, the organisation can build. */
  buildFeasibility: number;
  /** At or above this strategic fit, the capability is differentiating and should not be bought. */
  differentiatingFit: number;
  /** Above this risk, nothing proceeds without a governance review. */
  maxRisk: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { minValue: 2.5, buildFeasibility: 3.5, differentiatingFit: 4, maxRisk: 3.5 };

export const SAMPLE_INITIATIVES: Initiative[] = [
  {
    id: 'i1', name: 'Early-alert advising model', sponsor: 'Dean of Students',
    description: 'Flag students at risk of withdrawal from LMS engagement and grades so advisors can reach out.',
    value: { financialImpact: 4, strategicFit: 5, reach: 5, urgency: 4 },
    feasibility: { dataReadiness: 3, technicalMaturity: 4, teamCapability: 3, integrationSimplicity: 3 },
    risk: { harmToPeople: 4, biasAndFairness: 5, privacy: 4, explainabilityNeed: 5, regulatoryExposure: 4, robustness: 3 }
  },
  {
    id: 'i2', name: 'Help-desk ticket routing', sponsor: 'IT Services',
    description: 'Classify incoming support tickets and route them to the right queue.',
    value: { financialImpact: 3, strategicFit: 2, reach: 4, urgency: 3 },
    feasibility: { dataReadiness: 5, technicalMaturity: 5, teamCapability: 4, integrationSimplicity: 4 },
    risk: { harmToPeople: 1, biasAndFairness: 2, privacy: 2, explainabilityNeed: 2, regulatoryExposure: 1, robustness: 2 }
  },
  {
    id: 'i3', name: 'Automated essay scoring', sponsor: 'Writing programme',
    description: 'Score first-year writing assignments to reduce grading load.',
    value: { financialImpact: 3, strategicFit: 2, reach: 4, urgency: 2 },
    feasibility: { dataReadiness: 2, technicalMaturity: 3, teamCapability: 2, integrationSimplicity: 3 },
    risk: { harmToPeople: 4, biasAndFairness: 5, privacy: 3, explainabilityNeed: 5, regulatoryExposure: 3, robustness: 4 }
  },
  {
    id: 'i4', name: 'Career-readiness skills matcher', sponsor: 'Elevate',
    description: 'Match student competencies and credentials to employer role profiles.',
    value: { financialImpact: 4, strategicFit: 5, reach: 4, urgency: 4 },
    feasibility: { dataReadiness: 4, technicalMaturity: 4, teamCapability: 4, integrationSimplicity: 3 },
    risk: { harmToPeople: 3, biasAndFairness: 4, privacy: 3, explainabilityNeed: 4, regulatoryExposure: 2, robustness: 3 }
  },
  {
    id: 'i5', name: 'Meeting-notes summariser', sponsor: 'Provost office',
    description: 'Summarise recorded committee meetings into action items.',
    value: { financialImpact: 2, strategicFit: 1, reach: 2, urgency: 2 },
    feasibility: { dataReadiness: 4, technicalMaturity: 5, teamCapability: 4, integrationSimplicity: 5 },
    risk: { harmToPeople: 1, biasAndFairness: 1, privacy: 3, explainabilityNeed: 1, regulatoryExposure: 2, robustness: 2 }
  },
  {
    id: 'i6', name: 'Admissions yield predictor', sponsor: 'Enrollment',
    description: 'Predict which admitted students will enrol, to target outreach and aid.',
    value: { financialImpact: 5, strategicFit: 4, reach: 4, urgency: 4 },
    feasibility: { dataReadiness: 4, technicalMaturity: 4, teamCapability: 3, integrationSimplicity: 3 },
    risk: { harmToPeople: 4, biasAndFairness: 5, privacy: 4, explainabilityNeed: 4, regulatoryExposure: 5, robustness: 3 }
  },
  {
    id: 'i7', name: 'Course-catalogue chatbot', sponsor: 'Registrar',
    description: 'Answer prerequisite and scheduling questions from the catalogue.',
    value: { financialImpact: 2, strategicFit: 3, reach: 5, urgency: 3 },
    feasibility: { dataReadiness: 4, technicalMaturity: 5, teamCapability: 3, integrationSimplicity: 4 },
    risk: { harmToPeople: 2, biasAndFairness: 1, privacy: 2, explainabilityNeed: 2, regulatoryExposure: 2, robustness: 3 }
  }
];

export function sampleInitiatives(): Initiative[] {
  return structuredClone(SAMPLE_INITIATIVES);
}
