---
name: hack-mode
description: Router for a 24-hour hackathon. Reads the clock and project state, picks the current phase (kickoff, build, overnight, fix, harden, pitch), and runs that phase's playbook as a todo list. Start every working session with /hack-mode (Claude Code) or $hack-mode (Codex).
disable-model-invocation: true
---

# hack-mode

This skill set is shared by Claude Code (`.claude/skills/`) and Codex
(`.agents/skills/`, a generated copy). Edit files only under `.claude/skills/`,
then run `node .claude/sync-skills.mjs`. Teammates use Windows and macOS/Linux:
prefer `node` and `git` commands over shell-specific ones (no `rm -rf`, `cp`,
`date`, or `&&` chains that PowerShell may not accept). When this text says "call `<skill>`", read that skill's
`SKILL.md` and follow it, whichever agent you are.

You are working inside a 24-hour hackathon. The only thing that is judged is a
3-5 minute demo. Every decision below follows from that: rigor is spent on the
**golden path** (the exact flow the judges will see), and almost nowhere else.

## 1. Load state first

Before doing anything, read these files. If one is missing, you are in kickoff.

- `.claude/state/clock.md` — start time and deadline
- `.claude/state/golden-path.md` — the demo flow, written as numbered steps
- `.claude/state/decisions.tsv` — scope cuts made so far and why
- `.claude/state/team.md` — captain, members, who may do what
- `.claude/state/handoff-<you>.md` — your last session's summary, if any

Run `git config user.name` to find out who you are working for. If that name
is not in `team.md`, ask the user which teammate they are before continuing.
Call this name `<you>` below. Say it in your first reply
(e.g. `👤 chowonbhin (member) · build`) so a wrong identity is caught early.

Then get the current local time with
`node -e "console.log(new Date().toString())"` (works on Windows, macOS,
Linux; do not guess) and compare it to
the checkpoints in `clock.md`. All checkpoints there are full date-times, so a
16:00 on day 2 is never confused with 16:00 on day 1.

## 2. Pick the phase

| Current time | Phase | Playbook |
|---|---|---|
| no golden-path.md, or before `build_start` | kickoff | `playbooks/kickoff.md` |
| `build_start` ≤ now < `fix_start` | build | `playbooks/build.md` |
| user says they are going to sleep | overnight | `playbooks/overnight.md` |
| `fix_start` ≤ now < `freeze` | fix | `playbooks/fix.md` |
| `freeze` ≤ now < `pitch_start` | harden | `playbooks/harden.md` |
| now ≥ `pitch_start` | pitch | `playbooks/pitch.md` |

When less than 30 minutes remain before `freeze` or `pitch_start`, say so at
the top of every reply (e.g. `⏰ 25 min to freeze`).

The user can override the phase by naming one (e.g. `/hack-mode fix` or `$hack-mode fix`). If the
clock says one phase and the work clearly belongs to another (e.g. it is still build time but the
golden path already passes end to end), say so in one line and ask which to run.

## 3. Working as a team of four

Four people run this skill at the same time on the same repo, so:

- **Own steps only.** Each golden-path step has `(owner: <nickname>)`. Build
  and fix only steps owned by `<you>`. If a bug is in someone else's step, do
  not fix it: tell the user who owns it and what you saw (step, error,
  screenshot path) so they can pass it on.
- **Captain-only actions** are listed in `team.md`. If `<you>` is not the
  captain and the work needs one of them (changing the golden path, cutting
  scope, deploying), write a proposal in `handoff-<you>.md` under
  "For captain" and tell the user to ping Byeunghee02. Do not do it yourself.
- **Branches.** Work on `<you>/<short-task>`, never directly on `main`. To merge,
  run these one at a time (no `&&`; PowerShell may reject it):
  1. `git fetch`
  2. `git rebase origin/main` (on your branch)
  3. run `demo-path-verify`; stop here if it fails
  4. `git checkout main`
  5. `git merge --ff-only origin/main`
  6. `git merge --ff-only <you>/<short-task>`
  Then stop and hand over the push (see next rule). `main` must always pass verify.
- **You never push.** Not `main`, not branches, not tags, never with `--force`.
  Every push is done by the human. After a local merge or tag, end your reply
  with the exact command for them to run, e.g.
  `👉 push 해주세요: git push origin main`, and wait.
- **If their push is rejected** (someone else pushed first): on `main`, run
  `git fetch`, then `git rebase origin/main` (this only replays your own
  unpushed commits), run `demo-path-verify` again, and if it passes, give them
  the push command again. If the rebase conflicts in a step you do not own,
  run `git rebase --abort` and tell the user who to talk to.
- **Never** run `git reset --hard` on `main`, or rebase/reset commits that are
  already on `origin`, or touch a branch that is not yours.
- **Shared files.** Only touch `demo-path-verify`'s spec inside the
  `demoStep(...)` blocks for your own steps. Never commit `.claude/state/evidence/`.

## 4. Run the playbook

Read the playbook file, then create a todo list that copies its steps verbatim.
Work through them in order and tick each one off. Do not skip a step silently;
if a step does not apply, mark it done with a one-line reason.

## 5. Routing to other skills

| When | Call |
|---|---|
| Before saying any feature or fix is "done" | `demo-path-verify` |
| Passing `build_start` + 2h, `fix_start`, or 1h before `freeze`, or a feature is taking 2x its estimate | `scope-cut` (captain decides; members propose) |
| A step depends on an unfamiliar SDK or API | `how` |
| The golden path touches an LLM or any external API | `demo-safety` |
| Shipping to a public URL | `deploy` (captain only) |
| End of session, or before the user sleeps | `handoff` |
| Writing README, slides, or demo script | `pitch` |

If a skill in this table does not exist yet, do the equivalent work inline and
note in `handoff-<you>.md` that the skill was missing.

## 6. Rules that hold in every phase

1. **The golden path is the spec.** After kickoff, `golden-path.md` changes only
   when the captain explicitly agrees. If an idea would change the demo flow, write
   it down and ask; do not build it.
2. **Evidence, not claims.** "Done" means `demo-path-verify` passed and you can
   point to the evidence folder. "It compiles" or "it should work" is not done.
3. **Smallest change that moves the demo.** Prefer deleting, hardcoding, and
   reusing over building. Off the golden path, a hardcoded value or a stubbed
   screen is fine; on it, the behavior must be real.
4. **Fix root causes only on the golden path.** A bug the judges will see gets
   reproduced and fixed properly. A bug they will not see gets worked around or
   ignored, and noted in `handoff-<you>.md` (the captain logs it in `decisions.tsv`).
5. **Feature freeze at `freeze`.** From then on, no new features, only bug
   fixes on the golden path, deploy, and rehearsal. If the user asks for a new
   feature after `freeze`, remind them of the freeze once, then do what they
   decide. Harden is short (about 1 hour), so anything it needs, such as LLM
   fallbacks, must already exist before `freeze`.
6. **Do not block on the human.** Make reasonable calls and show the result.
   Ask first only for things that are hard to undo: deleting work, changing the
   golden path, or anything that spends money. (Pushing is never yours to do.)
7. **Commit small and often.** One working step per commit, message starts with
   the phase (`build: add search results page`). Small commits are what make
   reverting cheap at 4 a.m.

## 7. Ending a session

Before stopping, write `.claude/state/handoff-<you>.md` (overwrite it) with:
current phase, your branch, what passed `demo-path-verify` last, what is in
progress, the next three todos, and a "For captain" section with anything that
needs the captain. Keep it under 20 lines. The captain's Claude reads all
`handoff-*.md` files at the start of each session to see the whole team.
