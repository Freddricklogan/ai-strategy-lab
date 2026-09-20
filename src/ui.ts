/**
 * DOM rendering — `textContent` and `createElement` only; initiative names
 * and descriptions can come from an imported CSV.
 */

import {
  DIMENSION_LABEL, FEASIBILITY_DIMENSIONS, RISK_DIMENSIONS, SCALE_MAX, SCALE_MIN, VALUE_DIMENSIONS,
  type Initiative, type Thresholds, type Weights
} from './model.ts';
import { RECOMMENDATION_LABEL, type Assessment, type PortfolioSummary } from './scoring.ts';

type Props = Record<string, string | number | boolean | null | undefined>;

export function el(tag: string, props: Props = {}, kids: Array<Node | string | null | undefined> = []): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids) if (kid != null) node.append(kid);
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function renderSummary(host: HTMLElement, s: PortfolioSummary): void {
  clear(host);
  for (const [key, label] of [['build', 'Build'], ['buy', 'Buy'], ['wait', 'Wait'], ['review', 'Governance review']] as const) {
    host.append(el('div', { class: 'asl-count', 'data-rec': key }, [
      el('div', { class: 'asl-count__n', text: String(s.counts[key]) }),
      el('div', { class: 'asl-count__l', text: label })
    ]));
  }
}

export function renderList(host: HTMLElement, initiatives: Initiative[], assessments: Assessment[], selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  const byId = new Map(assessments.map((a) => [a.id, a]));
  for (const a of assessments) {
    const i = initiatives.find((x) => x.id === a.id);
    if (!i) continue;
    const btn = el('button', { type: 'button', class: 'asl-item' + (i.id === selectedId ? ' is-selected' : ''), 'aria-pressed': String(i.id === selectedId) }, [
      el('span', { class: 'asl-item__name', text: i.name }),
      el('span', { class: 'asl-item__meta', text: `V ${a.value.toFixed(1)} · F ${a.feasibility.toFixed(1)} · R ${a.risk.toFixed(1)}` }),
      el('span', { class: 'asl-chip', 'data-rec': a.recommendation, text: RECOMMENDATION_LABEL[a.recommendation] })
    ]);
    btn.addEventListener('click', () => onSelect(i.id));
    host.append(el('li', {}, [btn]));
  }
  void byId;
}

export type ScoreGroup = 'value' | 'feasibility' | 'risk';

export function renderEditor(host: HTMLElement, initiative: Initiative | null, assessment: Assessment | null, onChange: (group: ScoreGroup, key: string, value: number) => void, onField: (field: 'name' | 'sponsor' | 'description', value: string) => void): void {
  clear(host);
  if (!initiative || !assessment) {
    host.append(el('p', { class: 'asl-muted', text: 'Select an initiative to score it.' }));
    return;
  }
  const text = (field: 'name' | 'sponsor' | 'description', label: string, value: string): HTMLElement => {
    const input = el(field === 'description' ? 'textarea' : 'input', { class: 'asl-text', id: `f-${field}`, value: field === 'description' ? null : value, rows: field === 'description' ? '2' : null, maxlength: field === 'description' ? '240' : '80' }) as HTMLInputElement;
    if (field === 'description') input.value = value;
    input.addEventListener('change', () => onField(field, input.value));
    return el('div', { class: 'asl-field' }, [el('label', { for: `f-${field}`, text: label }), input]);
  };
  host.append(el('div', { class: 'asl-fields' }, [text('name', 'Initiative', initiative.name), text('sponsor', 'Sponsor', initiative.sponsor), text('description', 'Description', initiative.description)]));

  const verdict = el('div', { class: 'asl-verdict', 'data-rec': assessment.recommendation }, [
    el('div', { class: 'asl-verdict__rec', text: RECOMMENDATION_LABEL[assessment.recommendation], 'aria-live': 'polite' }),
    el('div', { class: 'asl-verdict__scores', text: `Value ${assessment.value} · Feasibility ${assessment.feasibility} · Risk ${assessment.risk}` }),
    el('p', { class: 'asl-verdict__why', text: assessment.rationale })
  ]);
  host.append(verdict);

  const groups: Array<[ScoreGroup, string, readonly string[]]> = [
    ['value', 'Value', VALUE_DIMENSIONS],
    ['feasibility', 'Feasibility', FEASIBILITY_DIMENSIONS],
    ['risk', 'Risk (higher is worse)', RISK_DIMENSIONS]
  ];
  for (const [group, title, keys] of groups) {
    const fs = el('fieldset', { class: 'asl-group', 'data-group': group }, [el('legend', { text: title })]);
    for (const key of keys) {
      const scores = initiative[group] as Record<string, number>;
      const id = `s-${group}-${key}`;
      const out = el('output', { for: id, class: 'asl-slider__val', text: String(scores[key]) });
      const input = el('input', { type: 'range', id, min: String(SCALE_MIN), max: String(SCALE_MAX), step: '1', value: String(scores[key]) }) as HTMLInputElement;
      input.addEventListener('input', () => { out.textContent = input.value; onChange(group, key, Number(input.value)); });
      fs.append(el('div', { class: 'asl-slider' }, [el('label', { for: id, text: DIMENSION_LABEL[key as keyof typeof DIMENSION_LABEL] }), out, input]));
    }
    host.append(fs);
  }
}

/** 2×2 matrix: x = feasibility, y = value, radius by risk, colour by recommendation. */
export function renderMatrix(host: HTMLElement, initiatives: Initiative[], assessments: Assessment[], thresholds: Thresholds, selectedId: string | null, onSelect: (id: string) => void): void {
  clear(host);
  const ns = 'http://www.w3.org/2000/svg';
  const W = 420;
  const H = 320;
  const pad = 36;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'asl-matrix');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Portfolio matrix: feasibility across, value up, ${assessments.length} initiatives; circle size is risk`);
  const sx = (v: number): number => pad + ((v - 1) / 4) * (W - 2 * pad);
  const sy = (v: number): number => H - pad - ((v - 1) / 4) * (H - 2 * pad);
  const line = (x1: number, y1: number, x2: number, y2: number, cls: string): void => {
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', String(x1)); l.setAttribute('y1', String(y1)); l.setAttribute('x2', String(x2)); l.setAttribute('y2', String(y2)); l.setAttribute('class', cls);
    svg.append(l);
  };
  line(pad, sy(1), W - pad, sy(1), 'asl-axis'); line(sx(1), pad, sx(1), H - pad, 'asl-axis');
  line(sx(thresholds.buildFeasibility), pad, sx(thresholds.buildFeasibility), H - pad, 'asl-threshold');
  line(pad, sy(thresholds.minValue), W - pad, sy(thresholds.minValue), 'asl-threshold');
  const label = (x: number, y: number, t: string, cls: string): void => {
    const e = document.createElementNS(ns, 'text');
    e.setAttribute('x', String(x)); e.setAttribute('y', String(y)); e.setAttribute('class', cls); e.textContent = t;
    svg.append(e);
  };
  label(W / 2, H - 8, 'Feasibility →', 'asl-axis-label');
  label(12, H / 2, 'Value ↑', 'asl-axis-label asl-axis-label--y');
  label(sx(thresholds.buildFeasibility) + 4, pad + 10, `build ≥ ${thresholds.buildFeasibility}`, 'asl-threshold-label');
  label(W - pad - 2, sy(thresholds.minValue) - 4, `value floor ${thresholds.minValue}`, 'asl-threshold-label asl-threshold-label--r');
  for (const a of assessments) {
    const i = initiatives.find((x) => x.id === a.id);
    if (!i) continue;
    const g = document.createElementNS(ns, 'g');
    g.setAttribute('class', 'asl-dot' + (a.id === selectedId ? ' is-selected' : ''));
    g.setAttribute('data-rec', a.recommendation);
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', `${i.name}: value ${a.value}, feasibility ${a.feasibility}, risk ${a.risk}, ${RECOMMENDATION_LABEL[a.recommendation]}`);
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', String(sx(a.feasibility))); c.setAttribute('cy', String(sy(a.value))); c.setAttribute('r', String(6 + a.risk * 3));
    // Label on the side with room; alternate above/below so near neighbours do not collide.
    const t = document.createElementNS(ns, 'text');
    const idx = assessments.indexOf(a);
    const right = sx(a.feasibility) < W * 0.6;
    const r = 6 + a.risk * 3;
    t.setAttribute('x', String(sx(a.feasibility) + (right ? r + 4 : -(r + 4))));
    t.setAttribute('y', String(sy(a.value) + (idx % 2 === 0 ? -r - 3 : r + 11)));
    t.setAttribute('text-anchor', right ? 'start' : 'end');
    t.setAttribute('class', 'asl-dot__label');
    t.textContent = i.name;
    g.append(c, t);
    g.addEventListener('click', () => onSelect(i.id));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i.id); } });
    svg.append(g);
  }
  host.append(svg);
}

export function renderWeights(host: HTMLElement, weights: Weights, thresholds: Thresholds, onWeight: (group: ScoreGroup, key: string, value: number) => void, onThreshold: (key: keyof Thresholds, value: number) => void): void {
  clear(host);
  const groups: Array<[ScoreGroup, string, readonly string[]]> = [['value', 'Value', VALUE_DIMENSIONS], ['feasibility', 'Feasibility', FEASIBILITY_DIMENSIONS], ['risk', 'Risk', RISK_DIMENSIONS]];
  for (const [group, title, keys] of groups) {
    const fs = el('fieldset', { class: 'asl-weights' }, [el('legend', { text: `${title} weights` })]);
    for (const key of keys) {
      const id = `w-${group}-${key}`;
      const input = el('input', { type: 'number', id, class: 'asl-num', min: '0', max: '5', step: '0.5', value: String((weights[group] as Record<string, number>)[key]) }) as HTMLInputElement;
      input.addEventListener('change', () => onWeight(group, key, Number(input.value)));
      fs.append(el('div', { class: 'asl-weight' }, [el('label', { for: id, text: DIMENSION_LABEL[key as keyof typeof DIMENSION_LABEL] }), input]));
    }
    host.append(fs);
  }
  const th = el('fieldset', { class: 'asl-weights' }, [el('legend', { text: 'Decision thresholds (1–5 scale)' })]);
  const rows: Array<[keyof Thresholds, string]> = [['minValue', 'Value floor'], ['buildFeasibility', 'Build feasibility'], ['differentiatingFit', 'Differentiating fit'], ['maxRisk', 'Risk ceiling']];
  for (const [key, label] of rows) {
    const id = `t-${key}`;
    const input = el('input', { type: 'number', id, class: 'asl-num', min: '1', max: '5', step: '0.5', value: String(thresholds[key]) }) as HTMLInputElement;
    input.addEventListener('change', () => onThreshold(key, Number(input.value)));
    th.append(el('div', { class: 'asl-weight' }, [el('label', { for: id, text: label }), input]));
  }
  host.append(th);
}

export function renderReport(host: HTMLElement, initiatives: Initiative[], assessments: Assessment[]): void {
  clear(host);
  host.append(el('thead', {}, [el('tr', {}, ['Initiative', 'Sponsor', 'Value', 'Feasibility', 'Risk', 'Recommendation', 'Rationale'].map((h) => el('th', { scope: 'col', text: h })))]));
  const body = el('tbody');
  for (const a of assessments) {
    const i = initiatives.find((x) => x.id === a.id);
    if (!i) continue;
    body.append(el('tr', {}, [
      el('td', { text: i.name }), el('td', { text: i.sponsor }),
      el('td', { text: a.value.toFixed(2) }), el('td', { text: a.feasibility.toFixed(2) }), el('td', { text: a.risk.toFixed(2) }),
      el('td', {}, [el('span', { class: 'asl-chip', 'data-rec': a.recommendation, text: RECOMMENDATION_LABEL[a.recommendation] })]),
      el('td', { class: 'asl-muted', text: a.rationale })
    ]));
  }
  host.append(body);
}
