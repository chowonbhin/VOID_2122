#!/usr/bin/env node
// Runs the golden-path test and writes evidence to .claude/state/evidence/<timestamp>/
// Cross-platform (Windows / macOS / Linux). Usage:
//   node scripts/verify.mjs [--url URL] [--runs N]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const URL = opt('--url', process.env.BASE_URL ?? 'http://localhost:3000');
const RUNS = Number(opt('--runs', '1'));

const d = new Date(), z = (n) => String(n).padStart(2, '0');
const ts = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`; // local time
const DIR = path.join('.claude', 'state', 'evidence', ts);
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'console-errors.txt'), '');

let fail = false;
for (let i = 1; i <= RUNS; i++) {
  const r = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/demo/golden-path.spec.ts', '--retries=0', '--reporter=line'],
    {
      env: { ...process.env, BASE_URL: URL, EVIDENCE_DIR: DIR, RUN_INDEX: String(i) },
      encoding: 'utf8',
      shell: process.platform === 'win32', // npx is npx.cmd on Windows
    },
  );
  fs.writeFileSync(path.join(DIR, `run${i}.log`), (r.stdout ?? '') + (r.stderr ?? '') + (r.error ? String(r.error) : ''));
  if (r.status !== 0) fail = true;
}

// Summarize steps.jsonl (worst status per step across runs).
const f = path.join(DIR, 'steps.jsonl');
const rows = fs.existsSync(f)
  ? fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
  : [];
const rank = { PASS: 0, SLOW: 1, FAIL: 2 };
const by = {};
for (const r of rows) (by[r.step] ??= []).push(r);
const steps = Object.keys(by).sort((a, b) => a - b);
const lines = steps.map((s) => {
  const rs = by[s];
  const worst = rs.reduce((a, b) => (rank[b.status] > rank[a.status] ? b : a));
  const st = new Set(rs.map((r) => r.status));
  const flaky = st.size > 1 && st.has('FAIL') ? ' FLAKY' : '';
  const maxMs = Math.max(...rs.map((r) => r.ms));
  return `- step ${s} ${worst.status}${flaky} "${worst.name}" max ${(maxMs / 1000).toFixed(1)}s ` +
    `(budget ${(worst.budgetMs / 1000).toFixed(1)}s) ${worst.shot}` +
    (worst.error ? `\n  error: ${worst.error}` : '');
});
const passed = steps.filter((s) => by[s].every((r) => r.status !== 'FAIL')).length;
const errs = fs.readFileSync(path.join(DIR, 'console-errors.txt'), 'utf8').trim();
const ok = passed === steps.length && steps.length > 0 && !fail;
const summary = [
  `# demo-path-verify ${ok ? 'PASS' : 'FAIL'} ${passed}/${steps.length}`,
  `target: ${URL}, runs: ${RUNS}`,
  '',
  lines.join('\n') || '- no steps recorded (test crashed before step 1; see run1.log)',
  '',
  `console errors: ${errs ? errs.split(/\r?\n/).length : 'none'}`,
].join('\n');
fs.writeFileSync(path.join(DIR, 'summary.md'), summary + '\n');
console.log(summary);
console.log(`evidence: ${DIR}`);
process.exit(ok ? 0 : 1);
