# Case Study — AI Strategy Lab

**Repository:** [ai-strategy-lab](https://github.com/Freddricklogan/ai-strategy-lab) · **Live demo:** [freddricklogan.github.io/ai-strategy-lab](https://freddricklogan.github.io/ai-strategy-lab/) · **Author:** Freddrick Logan

---

## 1. Who has this problem

A provost, a chief information officer, or the chair of a new AI committee at a university or public agency with a queue of AI proposals and no shared way to rank them; in a company, the head of a digital-transformation office. I have sat on the sponsoring side of that queue — the career-readiness skills matcher in the sample is the kind of proposal I would bring — so I know how a sponsor's enthusiasm and a committee's caution talk past each other.

## 2. The problem, as a scenario

An AI steering committee meets for the first time with nine proposals. Enrollment wants a model predicting which admitted students will enrol, to target aid. The writing programme wants automated essay scoring. IT wants to route help-desk tickets. Each sponsor has a slide with a number that looks like a return. The committee has two hours, no rubric, and one member who has read the NIST AI Risk Management Framework. The two highest-value proposals are also the two that touch students' futures most directly, and nobody can say whether "high value" should outrank "high risk", or by how much. The loudest sponsor gets funded.

## 3. What it costs to leave it alone

Risk gets outvoted by value. An admissions model with a bias problem is discovered after the cycle it shaped; an essay scorer that penalises non-native writers is discovered by the students. The exposure — regulatory, reputational, and to the students — is out of proportion to the efficiency gained. I will not attach a figure; the harm depends on what the model decides and for whom. The quieter cost is the reverse error: a cheap, safe ticket router waits a year because it shared an agenda with the essay scorer and the committee, having no rule, deferred everything.

## 4. The approach, and the alternative I rejected

I built a triage console with an explicit, ordered rule. Each initiative is scored on fourteen dimensions across value, feasibility and risk, the risk dimensions modelled on the AI RMF's trustworthiness characteristics. Then: risk above the ceiling goes to governance review before anything else; value below the floor waits; feasible and differentiating builds; feasible and commodity buys; valuable but not feasible buys if commodity, waits if differentiating. Every verdict prints its rationale with the numbers. Weights and thresholds are on the page and editable; the portfolio is a matrix with the thresholds drawn on it.

The alternative I rejected was a single blended score — value minus risk, ranked. It is what most scoring spreadsheets do, and it is exactly how a high-value proposal buries its risk. Evaluating risk first costs nothing in code and changes which projects get approved.

## 5. What the code does today

Real: the scoring engine, the ordered rule with editable thresholds, editable weights with validation, per-initiative rationale, the portfolio matrix, priority ordering, CSV import and export with row-level validation, and a print stylesheet for the report. All of it is strict-mode TypeScript with unit tests, separated from a rendering layer that builds the page through `textContent` only.

Simulated: the portfolio. The seven initiatives and their scores are an illustrative sample of what a university's queue looks like; the scores are my assessments, not measurements. The page says so.

Worth knowing: the risk dimensions are modelled on the NIST framework's characteristics, not a certified implementation, and the weights are defaults I chose — harm to people at one-and-a-half times, everything else equal — so that a committee can change them in the open. Priority ordering (value times feasibility minus risk) sorts the list only; it decides nothing, and the page says so.

## 6. Evidence

Measured in continuous integration and a headless-browser smoke test of the built site: 19 unit tests passing across two files, 100% statement coverage over the pure modules, type-checked ESLint and `tsc --noEmit` clean, HTML validation clean, CodeQL and dependency scanning enabled. The rule is tested at its boundaries — risk 3.5 builds, 3.51 goes to review; value 2.49 waits, 2.5 proceeds. In the browser: zero console errors; the tour raises two risk scores on the skills matcher and the verdict flips from build to governance review, the review count moving from three to four; an invalid weight is refused with a message; a risk ceiling of five clears every review. No horizontal scroll at 400 pixels.

## 7. What it would take to run this in production

For one committee the static page is enough: score in the room, print the report. As an institutional process it would need a persistent register behind campus single sign-on with an audit trail of who scored what and when; a workflow that assigns the governance reviews the rule produces and records their outcome; committee-adopted weights, versioned so a re-score is explainable; and an export to the project-portfolio tool. That is a small service and a policy conversation — weeks of engineering, with the policy conversation the longer part, as it should be.

## 8. Limits and next steps

Scores are subjective five-point assessments and nothing calibrates assessors against each other. No cost model, no dependencies between initiatives, no history. Next: a second-assessor mode showing disagreement per dimension, a cost-and-effort axis so "build" carries a price, and export of each review to a standard risk-register format.

## 9. Who should look at this

**Hiring manager:** evidence that I turn an AI governance framework into a working decision tool, with the rule stated rather than hidden.
**Consulting client:** a way to run your first AI steering meeting with a rubric on the table — bring your proposals as CSV.
**Engineer:** read `src/scoring.ts` for the ordered rule and `tests/scoring.test.ts` for the boundary cases; the print stylesheet in `src/app.css` is the whole PDF export.
