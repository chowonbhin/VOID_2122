# Team

Identify the current user with `git config user.name`. Names below are git
nicknames and must match exactly.

captain: Byeunghee02
members: chowonbhin, iwtkmn0219, zT4ek

## Captain only
- Change `golden-path.md` (steps and owners)
- Write to `decisions.tsv` (scope cuts)
- Deploy, and move the `demo-ready` tag (deploy delegated to chowonbhin, see below)
- Final say on slides and the demo script

## Everyone
- Build and fix the golden-path steps they own
- Work on their own branch `<nickname>/<short-task>`
- Merge into `main` only after rebasing on `main` and passing `demo-path-verify`
- Write their own `handoff-<nickname>.md`

## Delegated by the captain
- chowonbhin: deploy (Vercel, owns the GitHub repo). Imports `chowonbhin/VOID_2122`
  into their own Vercel account with auto-deploy from `main`, shares the URL, and runs
  `node scripts/verify.mjs --url <URL>` after deploys. The `demo-ready` tag stays captain-only.
