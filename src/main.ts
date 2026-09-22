/** Entry point: working portfolio, weights, thresholds, wiring and the Executive Shell. */

import './shell/exec-shell.css';
import './app.css';
import { mountExecShell } from './shell/exec-shell.js';
import { DEFAULT_THRESHOLDS, DEFAULT_WEIGHTS, sampleInitiatives, type Initiative, type Thresholds, type Weights } from './model.ts';
import { assessAll, summarizePortfolio, validateWeights, type Assessment } from './scoring.ts';
import { importInitiatives, toCsv } from './csv.ts';
import { renderEditor, renderList, renderMatrix, renderReport, renderSummary, renderWeights, type ScoreGroup } from './ui.ts';

const REPO = 'https://github.com/Freddricklogan/ai-strategy-lab';
const PAGES = 'https://freddricklogan.github.io/ai-strategy-lab/';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const n = document.getElementById(id);
  if (!n) throw new Error(`Missing #${id}`);
  return n as T;
};

interface State { initiatives: Initiative[]; weights: Weights; thresholds: Thresholds; selectedId: string | null; assessments: Assessment[]; nextId: number }
const state: State = { initiatives: sampleInitiatives(), weights: structuredClone(DEFAULT_WEIGHTS), thresholds: { ...DEFAULT_THRESHOLDS }, selectedId: 'i4', assessments: [], nextId: 100 };

function setStatus(text: string, tone: 'ok' | 'warn' | 'danger' | 'muted' = 'muted'): void {
  const s = $('status');
  s.textContent = text;
  s.dataset['tone'] = tone;
}

function recompute(): void {
  state.assessments = assessAll(state.initiatives, state.weights, state.thresholds);
}

function render(): void {
  recompute();
  const summary = summarizePortfolio(state.assessments, state.thresholds);
  renderSummary($('summary'), summary);
  renderList($('list'), state.initiatives, state.assessments, state.selectedId, select);
  const sel = state.initiatives.find((i) => i.id === state.selectedId) ?? null;
  const a = state.assessments.find((x) => x.id === state.selectedId) ?? null;
  renderEditor($('editor'), sel, a, onScore, onField);
  renderMatrix($('matrix'), state.initiatives, state.assessments, state.thresholds, state.selectedId, select);
  renderReport($('report'), state.initiatives, state.assessments);
  $('btn-delete').toggleAttribute('disabled', !sel);
  shell.refreshKpis();
}

function select(id: string): void {
  state.selectedId = id;
  render();
}

function onScore(group: ScoreGroup, key: string, value: number): void {
  const i = state.initiatives.find((x) => x.id === state.selectedId);
  if (!i) return;
  (i[group] as Record<string, number>)[key] = value;
  const before = state.assessments.find((x) => x.id === i.id)?.recommendation;
  render();
  const after = state.assessments.find((x) => x.id === i.id)?.recommendation;
  if (before && after && before !== after) setStatus(`${i.name}: recommendation changed from ${before} to ${after}.`, 'warn');
}

function onField(field: 'name' | 'sponsor' | 'description', value: string): void {
  const i = state.initiatives.find((x) => x.id === state.selectedId);
  if (!i) return;
  i[field] = value.replace(/\s+/g, ' ').trim().slice(0, field === 'description' ? 240 : 80) || (field === 'name' ? i.name : '');
  render();
}

function onWeight(group: ScoreGroup, key: string, value: number): void {
  const next = structuredClone(state.weights);
  (next[group] as Record<string, number>)[key] = value;
  const problems = validateWeights(next);
  if (problems.length) { setStatus(`Weight rejected: ${problems[0]}.`, 'danger'); renderWeights($('weights'), state.weights, state.thresholds, onWeight, onThreshold); return; }
  state.weights = next;
  setStatus(`Weight updated; ${state.initiatives.length} initiatives re-scored.`, 'ok');
  render();
}

function onThreshold(key: keyof Thresholds, value: number): void {
  if (!Number.isFinite(value) || value < 1 || value > 5) { setStatus('Thresholds must be between 1 and 5.', 'danger'); return; }
  state.thresholds = { ...state.thresholds, [key]: value };
  setStatus(`Threshold updated; every recommendation re-evaluated.`, 'ok');
  render();
}

/* ------------------------------------------------------------- toolbar */

$('btn-add').addEventListener('click', () => {
  const id = `n${state.nextId++}`;
  state.initiatives.push({ id, name: 'New initiative', sponsor: '', description: '', value: { financialImpact: 3, strategicFit: 3, reach: 3, urgency: 3 }, feasibility: { dataReadiness: 3, technicalMaturity: 3, teamCapability: 3, integrationSimplicity: 3 }, risk: { harmToPeople: 3, biasAndFairness: 3, privacy: 3, explainabilityNeed: 3, regulatoryExposure: 3, robustness: 3 } });
  state.selectedId = id;
  setStatus('Added an initiative at the midpoint of every scale. Score it.', 'ok');
  render();
});
$('btn-delete').addEventListener('click', () => {
  const i = state.initiatives.find((x) => x.id === state.selectedId);
  if (!i) return;
  state.initiatives = state.initiatives.filter((x) => x.id !== i.id);
  state.selectedId = state.initiatives[0]?.id ?? null;
  setStatus(`Removed ${i.name}.`, 'ok');
  render();
});
$('btn-reset').addEventListener('click', () => {
  state.initiatives = sampleInitiatives(); state.weights = structuredClone(DEFAULT_WEIGHTS); state.thresholds = { ...DEFAULT_THRESHOLDS }; state.selectedId = 'i4';
  renderWeights($('weights'), state.weights, state.thresholds, onWeight, onThreshold);
  setStatus('Sample portfolio, weights and thresholds restored.', 'ok');
  render();
});
$('btn-print').addEventListener('click', () => window.print());

function download(filename: string, body: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
$('btn-export').addEventListener('click', () => download('initiatives.csv', toCsv(state.initiatives)));
$('btn-import').addEventListener('click', () => $<HTMLInputElement>('file-import').click());
$<HTMLInputElement>('file-import').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  file.text().then((text) => {
    const { initiatives, warnings } = importInitiatives(text);
    if (!initiatives.length) { setStatus(`Import failed: ${warnings[0] ?? 'no valid rows.'}`, 'danger'); return; }
    state.initiatives = initiatives;
    state.selectedId = initiatives[0]?.id ?? null;
    setStatus(warnings.length ? `Imported ${initiatives.length} initiatives with ${warnings.length} warning(s): ${warnings[0]}` : `Imported ${initiatives.length} initiatives.`, warnings.length ? 'warn' : 'ok');
    render();
  }).catch(() => setStatus('Import failed: could not read the file.', 'danger'));
});

/* ---------------------------------------------------------------- shell */

const shell = mountExecShell({
  theme: 'midnight',
  title: 'AI Strategy Lab',
  tagline: 'Triage AI initiatives on value, feasibility and risk — dimensions modelled on the NIST AI Risk Management Framework — and get a build, buy, wait or review recommendation with the rule that produced it. Weights and thresholds are visible and editable. Sample portfolio; illustrative.',
  repo: REPO,
  pagesUrl: PAGES,
  badges: [{ label: 'Explicit decision rule', tone: 'accent' }, { label: 'Editable weights', dot: true }, { label: 'Client-side only', dot: true }],
  kpis: [
    { label: 'Initiatives', compute: () => state.initiatives.length, tone: 'accent' },
    { label: 'Build', compute: () => summarizePortfolio(state.assessments, state.thresholds).counts.build, tone: 'ok' },
    { label: 'Buy', compute: () => summarizePortfolio(state.assessments, state.thresholds).counts.buy },
    { label: 'Needs review', compute: () => summarizePortfolio(state.assessments, state.thresholds).counts.review, tone: 'danger' },
    { label: 'Mean risk', compute: () => summarizePortfolio(state.assessments, state.thresholds).meanRisk.toFixed(2), tone: 'warn' }
  ],
  tour: [
    { selector: '#matrix', title: 'The portfolio at a glance', body: 'Feasibility across, value up, circle size is risk, colour is the recommendation. The dashed lines are the thresholds the rule uses — and they are editable below.', action: () => { $('btn-reset').click(); } },
    { selector: '#editor', title: 'Score one initiative', body: 'Fourteen dimensions on a 1–5 scale across value, feasibility and risk. The skills matcher for Elevate scores as a build: feasible and differentiating, risk under the ceiling.', action: () => select('i4') },
    { selector: '[data-group="risk"]', title: 'Watch the rule react', body: 'This raises potential harm and regulatory exposure to 5. The risk score crosses the ceiling and the recommendation flips from build to governance review, with the reason stated.', action: () => { onScore('risk', 'harmToPeople', 5); onScore('risk', 'regulatoryExposure', 5); } },
    { selector: '#weights', title: 'The weights are yours', body: 'Harm to people carries 1.5× weight by default; every other dimension is equal. Change any weight or threshold and every initiative is re-scored. A triage tool with hidden weights is an opinion with a number on it.', action: () => {} },
    { selector: '#report', title: 'Take it to the committee', body: 'The report lists every initiative with its scores, recommendation and rationale. Print gives a clean PDF-ready page; Export gives the portfolio as CSV to score offline.', action: () => { $('btn-reset').click(); } }
  ]
});

renderWeights($('weights'), state.weights, state.thresholds, onWeight, onThreshold);
render();
setStatus('Sample portfolio loaded — seven initiatives typical of a university. Select one to score it.');
