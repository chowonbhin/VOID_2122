# Playbook: overnight (user is asleep)

Goal: make progress while the user sleeps without ever leaving the repo in a
worse state than you found it.

1. Before the user leaves, agree on a fixed task list (max 5 items) from the
   remaining golden-path work or known golden-path bugs. Nothing outside it.
   Write it to `handoff-<you>.md` under "Overnight tasks". Only steps owned
   by `<you>`.
2. Work only on your own branch `<you>/overnight`. Record its current commit
   hash as the safe point. Run `demo-path-verify` and
   confirm it passes (or note exactly which steps fail).
3. For each task: make the change, run `demo-path-verify`, and commit only if
   the result is equal to or better than the safe point. Then move the safe
   point to the new commit.
4. If verify gets worse, run `git reset --hard <safe point>` on your own branch
   only, log the attempt and the failure in `handoff-<you>.md`, and move to the next task. Do not try the
   same approach a third time.
5. Never: change `golden-path.md`, add dependencies the user has not seen,
   touch deploy config, rewrite large parts of the app, push anything, or
   merge into `main` (merge in the morning with the user awake).
6. At the end, write `handoff-<you>.md`: done, failed (with why), safe-point hash,
   and the evidence folder of the last passing run.
