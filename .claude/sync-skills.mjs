#!/usr/bin/env node
// Copies .claude/skills -> .agents/skills so Codex sees the same skills.
// Plain copy (no symlink) so it works on Windows too. Run from the repo root:
//   node .claude/sync-skills.mjs
// Re-run after editing anything in .claude/skills, then commit .agents/.
import fs from 'node:fs';
const src = '.claude/skills', dst = '.agents/skills';
if (!fs.existsSync(src)) { console.error(`Run from the repo root (${src} not found).`); process.exit(1); }
fs.rmSync(dst, { recursive: true, force: true });
fs.mkdirSync('.agents', { recursive: true });
fs.cpSync(src, dst, { recursive: true });
fs.writeFileSync('.agents/.gitattributes', '* text eol=lf\n');
fs.writeFileSync('.agents/README.md',
  'Generated copy of .claude/skills for Codex. Do not edit here.\n' +
  'Edit .claude/skills, then run: node .claude/sync-skills.mjs\n');
console.log(`Copied ${src} -> ${dst}. Next: git add .agents && git commit -m "chore: sync skills for Codex"`);
