# Hackathon repo: always-on rules

These rules apply in every session, whether or not `/hack-mode` (Claude Code) or
`$hack-mode` (Codex) has been run. The full workflow lives in the hack-mode skill;
this file is the safety net for when someone forgets to start it.

1. **Start with hack-mode.** If hack-mode has not been run in this session and the
   user asks for project work, suggest it once in one line
   (`💡 /hack-mode (Codex: $hack-mode)로 시작하면 시간표·담당 규칙이 적용돼요`), then help anyway.
2. **Never push.** No `git push` of any kind (main, branches, tags, `--force`).
   When something is ready, give the user the exact command and let them run it,
   e.g. `👉 push 해주세요: git push origin main`.
3. **Never work directly on `main`.** Use a branch `<git user.name>/<short-task>`.
   Merge into `main` locally only after `node scripts/verify.mjs` passes, using
   `git merge --ff-only`.
4. **Own steps only.** Find who you work for with `git config user.name`, then
   check `.claude/state/team.md` and the `(owner: ...)` tags in
   `.claude/state/golden-path.md`. Do not edit code for golden-path steps owned
   by someone else; report the problem instead.
5. **Captain-only:** changing `golden-path.md`, scope cuts (`decisions.tsv`),
   deploying, and the `demo-ready` tag. The captain is listed in `team.md`.
6. **Never** run `git reset --hard` on `main`, rebase or reset commits already on
   `origin`, or touch a branch that is not the user's.
7. **Feature freeze.** After the `freeze` time in `.claude/state/clock.md`, no new
   features without the captain's OK.
8. **Cross-platform.** Teammates use Windows. Run git commands one at a time (no
   `&&` chains) and prefer `node` scripts over bash-only commands.
9. Do not commit `.claude/state/evidence/`. Edit skills only in `.claude/skills/`,
   then run `node .claude/sync-skills.mjs` to update the Codex copy.
