---
name: demo-path-verify
description: Proves the hackathon demo works by driving the golden path in a real browser and saving screenshots and timings as evidence. Use this before saying any feature, fix, or step is "done", before every commit during the overnight run, after every deploy, and whenever the user asks "does it work?" or "is the demo OK?". Also use it in setup mode right after the golden path is written, to create the test.
---

# demo-path-verify

The demo is the only thing judged, so the only proof that counts is the demo
running. This skill turns `.claude/state/golden-path.md` into one browser test
and runs it, leaving a folder of screenshots and timings that anyone (the user,
a teammate, you after a context reset) can open and check.

"I implemented it", "it compiles", and "the unit tests pass" are not evidence.
A passing run with screenshots that show the right thing on screen is.

Works the same on Windows, macOS, and Linux (Node only, no bash).

## Modes

Decide the mode from the repo:

- **setup**: `tests/demo/golden-path.spec.ts` does not exist, or
  `golden-path.md` has changed since the spec was written (compare the step
  list in the spec header comment to the file).
- **run**: everything else.

## Setup mode

1. Read `golden-path.md`. Each numbered step becomes one `demoStep(...)` call.
2. Install Playwright if missing:
   `npm i -D @playwright/test && npx playwright install chromium`.
3. Copy `assets/golden-path.spec.ts` to `tests/demo/golden-path.spec.ts`, and
   copy `scripts/verify.mjs` to `scripts/verify.mjs` in the project root.
4. Fill in one `demoStep` per golden-path step. For each step write:
   - the user action exactly as the judge will see it (click, type, upload);
   - an assertion on **what is visible on screen**, using roles and text
     (`getByRole`, `getByText`), not CSS classes or internal state;
   - a `budgetMs` for how long the judge will tolerate waiting. Defaults:
     1500 ms for normal steps, 8000 ms for `[LLM]` steps.
5. Copy the step list into the header comment of the spec so the next run can
   detect drift.
6. Run it once (run mode below). Against placeholders in kickoff, it should
   pass; if a step cannot pass even then, the step is badly specified, so fix
   the assertion, not the app.

### How to assert on LLM and API steps

LLM output differs on every run, so never assert exact text. Assert what the
judge needs to see instead: the result area is visible, is not empty, is not an
error message or raw JSON, and appeared within the budget. If the step has a
structure (a list of 3 cards, a table with a header), assert the structure.

### Mobile apps

If the app is React Native / Expo with a web target, run the same test against
the web build; it covers the logic and flow. If the demo will be shown on a
native device only, write the steps as a Maestro flow instead and keep the same
evidence layout. Either way, also do one manual run on the real device before
harden ends.

## Run mode

```bash
node scripts/verify.mjs                     # local, one run
node scripts/verify.mjs --url https://...   # against the deployed app
node scripts/verify.mjs --runs 3            # flakiness check (fix phase)
```

The script writes everything to `.claude/state/evidence/<timestamp>/`:
`steps.jsonl` (one line per step: name, status, ms, over budget or not),
`step-NN.png` screenshots, `console-errors.txt`, and `summary.md`.

After the run, **open the screenshots of the steps you just changed** and look
at them. A test can pass while the screen shows a stuck spinner, overlapping
text, "undefined", or placeholder copy. Those are failures for the demo even if
Playwright is happy.

## Reporting

Report in this shape, and nothing longer:

```
demo-path-verify: PASS 5/5  (local, 1 run)
evidence: .claude/state/evidence/2026-11-14T03-12-09/
slow: step 3 "Generate summary" 6.1s (budget 8s)
console errors: none
looked at: step-03.png — summary card shows 3 bullets, OK
```

On failure, name the first failing step, the error, and its screenshot path.
Fix the earliest failing step first; later failures are often caused by it.

## Rules

- **Do not mock what the judge sees.** Mocks and fallbacks for the demo belong
  in the app (behind the `demo-safety` flag), not in the test. The test drives
  the app the same way the judge will see it.
- **Over budget counts.** A step that passes but exceeds `budgetMs` is reported
  as `SLOW`. Two `SLOW` runs in a row on the same step is a demo bug: hand it
  to `demo-safety` (cache or fallback) rather than raising the budget.
- **Flaky is failing.** If `--runs 3` gives mixed results on a step, treat the
  step as broken. Do not add retries to hide it.
- **Never edit an assertion just to make it pass.** Change an assertion only if
  `golden-path.md` changed or the assertion was checking the wrong thing; say
  which in the commit message.
