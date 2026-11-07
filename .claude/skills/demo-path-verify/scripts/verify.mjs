#!/usr/bin/env node
// Runs the golden-path test and writes evidence to .claude/state/evidence/<timestamp>/
// Cross-platform (Windows / macOS / Linux). Start the app first. Usage:
//   node scripts/verify.mjs [--url URL] [--runs N]
// Exit 0 only if every step listed in the spec header ran, none FAILED or was SLOW,
// every screenshot was saved, and there were no unexpected console errors.
// Steps marked `pending` are allowed (exit 0) but the headline then says PARTIAL, never PASS.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SPEC = 'tests/demo/golden-path.spec.ts';
// Regexes for console errors the demo may legitimately produce (e.g. a map tile that failed to
// load while the list still works). Keep this list short and explain each entry.
const ALLOWED_CONSOLE_ERRORS = [];

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const URL = opt('--url', process.env.BASE_URL ?? 'http://localhost:3000');
const RUNS = Number(opt('--runs', '1'));

try {
  await fetch(URL);
} catch {
  console.error(`App is not reachable at ${URL}. Start it first (npm run dev) or pass --url.`);
  process.exit(1);
}

// Expected step count comes from the GOLDEN PATH header comment in the spec.
const header = fs.readFileSync(SPEC, 'utf8').split('*/')[0];
const expected = [...header.matchAll(/^\s*\*\s*(\d+)\.\s/gm)].length;

const d = new Date(), z = (n) => String(n).padStart(2, '0');
const ts = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`; // local time
const DIR = path.join('.claude', 'state', 'evidence', ts);
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'console-errors.txt'), '');

let crashed = false;
for (let i = 1; i <= RUNS; i++) {
  const r = spawnSync(
    'npx',
    ['playwright', 'test', SPEC, '--retries=0', '--reporter=line'],
    {
      env: { ...process.env, BASE_URL: URL, EVIDENCE_DIR: DIR, RUN_INDEX: String(i) },
      encoding: 'utf8',
      shell: process.platform === 'win32', // npx is npx.cmd on Windows
    },
  );
  fs.writeFileSync(path.join(DIR, `run${i}.log`), (r.stdout ?? '') + (r.stderr ?? '') + (r.error ? String(r.error) : ''));
  if (r.status !== 0) crashed = true;
}

// Summarize steps.jsonl (worst status per step across runs).
const f = path.join(DIR, 'steps.jsonl');
const rows = fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
  : [];
const rank = { PASS: 0, PENDING: 1, SLOW: 2, FAIL: 3 };
const by = {};
for (const r of rows) (by[r.step] ??= []).push(r);
const steps = Object.keys(by).sort((a, b) => a - b);
const problems = [];
const lines = steps.map((s) => {
  const rs = by[s];
  const worst = rs.reduce((a, b) => (rank[b.status] > rank[a.status] ? b : a));
  const st = new Set(rs.map((r) => r.status));
  const flaky = st.size > 1 && st.has('FAIL') ? ' FLAKY' : '';
  const maxMs = Math.max(...rs.map((r) => r.ms));
  const missingShot = rs.some((r) => r.shotOk === false || !fs.existsSync(r.shot));
  if (worst.status === 'FAIL' || worst.status === 'SLOW') problems.push(`step ${s} ${worst.status}`);
  if (missingShot) problems.push(`step ${s} screenshot missing`);
  return `- step ${s} ${worst.status}${flaky} "${worst.name}" max ${(maxMs / 1000).toFixed(1)}s ` +
    `(budget ${(worst.budgetMs / 1000).toFixed(1)}s) ${worst.shot}` +
    (worst.pending ? `\n  pending: ${worst.pending}` : '') +
    (missingShot ? '\n  screenshot missing' : '') +
    (worst.error ? `\n  error: ${worst.error}` : '');
});
if (steps.length < expected) problems.push(`only ${steps.length}/${expected} steps ran`);
const errs = fs.readFileSync(path.join(DIR, 'console-errors.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
const unexpected = errs.filter((e) => !ALLOWED_CONSOLE_ERRORS.some((re) => re.test(e)));
if (unexpected.length) problems.push(`${unexpected.length} unexpected console error(s)`);
if (crashed && problems.length === 0) problems.push('playwright exited non-zero (see run logs)');

const passed = steps.filter((s) => by[s].every((r) => r.status === 'PASS')).length;
const pending = steps.filter((s) => by[s].some((r) => r.status === 'PENDING')).length;
const ok = problems.length === 0 && expected > 0;
const headline = !ok ? 'FAIL' : pending ? 'PARTIAL' : 'PASS';
const summary = [
  `# demo-path-verify ${headline} ${passed}/${expected}` + (pending ? ` (${pending} pending)` : ''),
  `target: ${URL}, runs: ${RUNS}`,
  '',
  lines.join('\n') || '- no steps recorded (test crashed before step 1; see run1.log)',
  '',
  `console errors: ${errs.length ? `${errs.length} (${unexpected.length} unexpected)` : 'none'}`,
  ...(problems.length ? ['', 'problems:', ...problems.map((p) => `- ${p}`)] : []),
].join('\n');
fs.writeFileSync(path.join(DIR, 'summary.md'), summary + '\n');
console.log(summary);
console.log(`evidence: ${DIR}`);
process.exit(ok ? 0 : 1);
