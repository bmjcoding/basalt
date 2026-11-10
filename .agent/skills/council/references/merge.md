# Merging, and the owner's answer

Read this when the owner answers a review page: a thumbs up, a thumbs down, or named changes.

## His answer
- **A thumbs up** approves what was built. A recommendation he didn't name isn't approved: it stays open in `BACKLOG.md`.
- **Named changes** ("T1: move it") are decisions. Log them, then send the builder an amended brief on the same branch. Review it, run
  both CI jobs, and put the PR on the next review page.
- **A thumbs down** on a PR: log it, and leave the PR open as a draft. If he gave a reason that's a decision, it's a new round. A thumbs
  down doesn't block other PRs, unless they depend on that one.
- **Recording:** log every answer in `DECISIONS.md` before acting on it.

## Merge order
1. PRs that touch no shared file (tooling, process, the HTML skill alone).
2. Design PRs, oldest decision first. A PR built on another PR's branch comes after that one.

## Each PR in turn
Run these in the PR's worktree (the builder's):

```bash
git fetch origin
git merge origin/main            # resolve conflicts (below), then commit the merge
npm run build && npm run ci:local
git push
gh pr view <n> --json headRefOid -q .headRefOid   # must equal: git rev-parse HEAD
```

Then:
- Post the tested SHA and the result on the PR.
- Merge with `gh pr ready <n> && gh pr merge <n> --merge`.
- If the head on GitHub isn't the SHA you tested, stop: run the steps again before merging.

## Conflicts
Parallel PRs conflict in:
- `tools/review/rounds.tsx`;
- `tools/review/build.mjs`;
- `packages/react/src/styles/components.css`;
- `docs/foundations.md`;
- `AGENTS.md`;
- the tertiary-ink inventory in `packages/react/test/press-and-chrome.test.mjs`.

How to resolve them:
- **When both sides add something,** keep both: both rounds registered, both CSS blocks, the union of a list.
- **When one side made a sentence false,** reword it so it's true for both. A line once still said "the one such row" after a second
  kind had merged.
- **When two decided designs contradict,** don't choose. Stop, and take it to a council round.

## After the last merge
- Pull `main`, run `npm run ci:local` on it, and log the merges, with their commits, in `DECISIONS.md`.
- `AGENTS.md` asks for the hosted reference to be republished after a merge. The owner paused that ("dont need the hosted reference I
  don't think", DECISIONS 81), so skip it until he says otherwise.
