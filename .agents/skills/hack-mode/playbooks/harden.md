# Playbook: harden (`freeze` → `pitch_start`, feature freeze, ~1h)

Goal: lock a demo-ready build before slides start. This phase is short, so it
only locks and checks; anything that needs building should already exist.

Steps 2, 4, 5 are captain only. Members: stop merging new work, pull `main`,
run `demo-path-verify --url <deployed URL>`, and report results to the captain.

1. Announce the freeze to the user once. From here: no new features. Only
   fixes for golden-path steps that fail.
2. Deploy the current build and run `demo-path-verify --runs 3` against the
   deployed URL.
3. Run the golden path once with the fallback flag on (from `demo-safety`).
   It must still look complete.
4. Tag the commit `demo-ready` and give the captain the push command
   (`git push origin main` then `git push origin demo-ready`). Any change after this must re-run verify and
   move the tag only if it passes.
5. Write the recovery card: deployed URL, local run command,
   reset command, fallback flag, and the `demo-ready` hash (captain writes it
   in `handoff-Byeunghee02.md`).
6. Take clean screenshots of each golden-path step for the slides (reuse the
   latest passing evidence folder if the screens look right).
