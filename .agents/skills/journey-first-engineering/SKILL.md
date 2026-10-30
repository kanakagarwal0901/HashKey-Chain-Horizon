---
name: journey-first-engineering
description: Before implementing non-trivial features, UI workflows, API integrations, stateful behavior, data mutations, authentication changes, or cross-component changes, analyze the end-to-end user journey, important scenario branches, failure and recovery paths, and consequential missing requirements. Ask targeted clarification questions before committing to ambiguous behavior. Quantify scenario coverage and engineering impact. Skip heavyweight analysis for trivial, self-contained tasks.
---

# Journey-First Engineering

## Objective

For any non-trivial feature, UI workflow, API integration, stateful behavior, data mutation, or cross-component change, invoke the journey-first-engineering skill before committing to an implementation plan.

Do not skip it merely because the user asks you to work autonomously or because the happy path appears straightforward.

Skip heavyweight analysis for trivial, self-contained tasks. For substantial changes, analyze meaningful workflow branches, identify consequential ambiguities, ask targeted clarification questions before making unresolved product decisions, and derive tests from the scenario map.

When asking a clarification question because of this skill, state how many distinct scenarios were actually mapped, which scenario exposed the ambiguity, and the potential impact. Do not fabricate counts or claim exhaustive coverage.

Before completing substantial work, report the risks identified, scenarios verified, and important remaining gaps.

Treat these instructions as project engineering requirements, not optional suggestions.

Prevent avoidable bugs and rework by reasoning about the complete user journey before implementing its main path.

Determine how the requested outcome will actually be used, which states and branches it creates, how those branches can fail, and what must happen next. Resolve consequential ambiguities before committing to a design.

Optimize for **important scenarios covered per unit of analysis**, not maximum verbosity or hypothetical edge-case counts.

## 1. Triage the task

Choose the lightest appropriate approach:

* **Trivial:** Isolated algorithm, typo, simple rename, obvious local fix. Proceed directly.
* **Bounded:** Small feature or localized modification. Inspect affected behavior and check directly relevant edge cases.
* **Complex:** Multi-step UI, feature spanning components, integrations, stateful workflows. Map important branches, identify ambiguities, and plan verification.
* **Critical:** Security, authorization, destructive operations, migrations, concurrency, or high-impact external side effects. Perform deeper state, consistency, failure, and recovery analysis.

A small change can still be critical. Do not make simple tasks unnecessarily bureaucratic.

## 2. Understand the actual outcome

Before choosing an implementation, establish:

* Who uses the outcome, and with what permissions?
* What triggers the workflow, and what preconditions apply?
* What inputs, states, transitions, and side effects exist?
* What constitutes success, rejection, cancellation, and failure?
* What happens after interruption, retry, refresh, timeout, or partial completion?
* What must persist, and what must remain consistent across components?
* What existing contracts, callers, or behavior could break?

Inspect the relevant repository code, models, API contracts, tests, and conventions first. Derive known answers from evidence instead of asking the user to repeat them.

## 3. Map the journey as a branch tree

For complex and critical tasks, trace:

`Initial state → Action → Preconditions/validation → Transition → Side effects → Observable outcome`

At each consequential branch, investigate:

* Valid and invalid inputs.
* Alternative user actions and permissions.
* Repeated submissions and concurrent changes.
* Dependency failures and partial success.
* Cancellation, interruption, retry, and recovery.
* Persisted state and user-visible feedback.

Every important branch must end in a defined outcome. Identify dead ends, silent failures, invalid states, duplicate side effects, and unrecoverable workflows.

Follow branches across frontend, backend, database, and external services wherever relevant.

## 4. Explore efficiently

Do not enumerate every theoretical combination.

Group equivalent cases into behavioral classes. Prioritize user impact, likelihood, security, irreversibility, and regression risk. Test important state transitions and interactions between dimensions. Use pairwise, property-based, or fuzz testing when appropriate.

Track distinct scenarios, not the number of bullet points, permutations, or repeated variants. A scenario is a meaningfully different combination of preconditions, action, and expected outcome.

## 5. Separate facts from decisions

Classify uncertainties as:

* **Known:** Established by the request, repository, tests, or contracts.
* **Safe default:** Low-risk, conventional, reversible implementation detail. Decide without interrupting the user.
* **Material ambiguity:** Multiple plausible choices with meaningfully different user-visible, security, data-integrity, compatibility, or operational consequences.

For every material ambiguity, identify the alternatives, their consequences, and the decision required.

Before implementing behavior that depends on an unresolved material ambiguity, ask the user a concise, specific question. Batch related questions when practical. Offer a recommended default with a brief rationale when defensible.

Do not ask questions already answered by repository evidence. Do not ask users to decide inconsequential implementation details.

If autonomous execution is requested, continue with independent and reversible work. Use established contracts where they genuinely resolve uncertainty. Do not invent business rules or make irreversible, consequential choices without adequate authorization.

## 6. Clarification questions must show their basis

Whenever this skill causes a clarification question to be asked, precede the question with a brief coverage statement:

* **Analysis scope:** Number of distinct scenarios mapped and the workflow dimensions examined.
* **Finding:** Which branch or scenario exposed the ambiguity.
* **Impact:** What could go wrong or change depending on the answer.
* **Decision:** The specific question and practical alternatives.

Example:

"I mapped 14 distinct scenarios across submission, retries, concurrent requests, and recovery. In 3 failure scenarios, a timeout leaves the operation's outcome unknown. Blindly retrying could create duplicate records.

**Question:** Should the system check the existing operation's status before retrying? Recommended: yes, using an idempotency key."

Counts must reflect scenarios actually identified, not every imaginable combination. Do not imply that 14 scenarios exhaust all possible behavior.

Ask only questions that materially influence the design. The coverage statement must not become a long preamble.

## 7. Plan, implement, and verify

Before complex or critical changes, produce a concise plan containing:

1. Intended outcome and acceptance criteria.
2. Important workflow branches and terminal outcomes.
3. Resolved decisions and remaining assumptions.
4. Affected components and dependencies.
5. Failure and recovery behavior.
6. Verification scenarios and invariants.

Implement the agreed behavior with explicit state transitions, appropriate validation, server-side authorization, safe retry semantics, and clear failure feedback where applicable.

Derive tests from the scenario map. Verify primary paths, important alternatives, failure recovery, security boundaries, concurrency where relevant, and regressions. Run available tests and report what was actually verified.

If implementation reveals a new consequential ambiguity, pause the affected work and ask.

## 8. Quantify the impact

For substantial tasks, conclude with a compact engineering-impact report:

* **Scenarios mapped:** Distinct behavioral scenarios actually analyzed.
* **Coverage dimensions:** Relevant workflow areas examined.
* **Clarifications raised/resolved:** Questions attributable to this analysis.
* **Risks found:** Material failure modes or design gaps discovered.
* **Verification:** Tests added or run, and important branches verified.
* **Remaining gaps:** Important untested scenarios or unresolved decisions.
* **Impact assessment:** What this analysis changed or prevented, supported by evidence.

Where useful, distinguish high-, medium-, and low-risk findings.

Do not fabricate scenario counts, claim a risk was prevented without a defensible basis, or report a percentage improvement without a measured baseline. If the impact is uncertain, state that explicitly. Counts measure analysis activity and coverage, not correctness by themselves.

For trivial tasks, omit the report. For bounded tasks, keep it to one or two lines.

## Final rule

Before coding a meaningful change, ask:

**How could a real user follow a different path from the one I initially imagined, and what would happen at each consequential branch?**

Investigate the repository, map the important scenarios, expose material ambiguities, ask for decisions when needed, and verify the resulting implementation against the intended journey.

The goal is fewer incorrect assumptions, fewer missed branches, less rework, and more predictable software—not more planning for its own sake.
