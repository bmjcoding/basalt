# Build: <topic>

<!-- Replace every <…>. The builder reads only this file and what it points to: say everything it needs. -->

You are writing the code for a design the council has decided. Build exactly that. Where something is unclear, stop and say so in
your report; don't decide a visual question yourself.

Root: `MAIN/` (absolute path). Work in your own worktree, branched from `main`. Read `AGENTS.md`, `docs/foundations.md` and
`docs/motion.md` first. Council files are in `MAIN/.review/council/` (git-ignored, so read them from that path).

## The record
- `MAIN/.review/council/DECISIONS.md`, items <n>–<m>: what was decided, with each count.
- The votes: `MAIN/.review/council/<topic>-vote/{opus,muse,sol,grok}.md`.
- The reference prototype for each part: <part> → `<topic>/<member>/`. The other prototypes are evidence, not specs.
- On main: <the components and files this builds on>.

## What to build
<!-- Every decided value, with its decision number. Name the API only if the council decided it; otherwise "your choice, in Basalt's
style; report the names". -->
1. **<part>:** <decided values>.

## Prototype defects not to copy
- <defect>.

## Foundations
<!-- The edits to docs/foundations.md, docs/motion.md and AGENTS.md this decision needs. -->
- <edit>.
- The status paragraph says it was decided by the council (DECISIONS <n>) and that the implementation hasn't been reviewed.

## Tests
- <each decided behaviour as a test>.
- axe in both themes, forced colours, reduced motion, and the module and bundle checks.
- Never skip, weaken or delete a test.

## Review round
Use round **<number>** in `tools/review/round<number>.tsx`, registered in `rounds.tsx`. Show <states>, in both themes, at 2x and at 390,
in forced colours and under reduced motion. Run `npm run check` until it passes, then `npm run review -- <number>`, and look at your own
screenshots.

## Rules
- Don't commit, push or open a PR. Leave the work uncommitted.
- No new runtime dependencies. No module-scope side effects in `packages/react/src`.
- Synthetic sample data only: no real names, emails or employers.
- Put timeouts on long commands.

## Report
- What you changed, file by file, and the API names.
- Test counts and the check result.
- The walkthrough and zip paths.
- Anything you couldn't do as written, and anything visual you left open.
