# Build: <topic>

<!-- Replace every <…>. The builder reads only this file and what it points to, so say everything it needs. -->

You are the builder. You write the code for a design the council has decided. Build exactly that. Where something is unclear, stop and
say so in your report; don't decide a visual question yourself.

Root: `</absolute/path/to/MAIN>`. Council files: `</absolute/path/to/MAIN>/.review/council/`. They're git-ignored, so read them from
that path.

## Start here
1. In your worktree, run `git fetch origin && git switch -c claude/<topic> <base>`, where `<base>` is `origin/main` <or the branch this
   depends on: `origin/claude/<other topic>`>.
2. Read `AGENTS.md`, `docs/foundations.md` and `docs/motion.md`.

## The record
- `</absolute/path/to/MAIN>/.review/council/DECISIONS.md`, items <n>–<m>: what was decided, with each count.
- The votes: `</absolute/path/to/MAIN>/.review/council/<topic>-vote/{opus,muse,sol,grok}.md`.
- The reference prototype for each part: <part> → `<topic>/<slug>/`. The other prototypes are evidence, not specs.
- On main, this builds on: <the components and files>.

## What to build
<!-- Every decided value, with its decision number. Name the API only if the council decided it; otherwise write "your choice, in
     Basalt's style; report the names". -->
1. **<part>:** <decided values> (DECISIONS <n>).

## Prototype defects not to copy
- <defect>.

## Foundations
- <each edit to docs/foundations.md, docs/motion.md and AGENTS.md this decision needs>.
- Add a status line: decided by the council (DECISIONS <n>); the implementation hasn't been reviewed.

## Tests
- <each decided behaviour, as a test>.
- axe in both themes, forced colours, reduced motion, and the module and bundle checks.
- Behaviour tests load no web font, so text widths differ on CI's Linux runner. Keep measured margins wider than a fallback font's width.
- Never skip, weaken or delete a test.

## Review round
Use round **<number>**, in `tools/review/round<number>.tsx`, registered in `rounds.tsx`. Show <the states>, in both themes, at 1440 and
390, at 2x, in forced colours and under reduced motion. Run `npm run check` until it passes, then `npm run review -- <number>`, and look
at your own screenshots.

## Rules
- Don't commit, push or open a PR. Leave the work uncommitted on your branch.
- No new runtime dependencies. No module-scope side effects in `packages/react/src`.
- Synthetic sample data only: no real names, emails or employers.
- Put timeouts on long commands.

## Report
- Your worktree's absolute path, your branch, and the base SHA.
- What you changed, file by file, and the API names.
- Test counts and the check result.
- The walkthrough and zip paths.
- Anything you couldn't do as written.
- Anything visual you left open.
