# Merging, and the owner's answer

Read this when the owner answers a review page (a thumbs up, a thumbs down, or named changes), or says "merge them".

## His answer
- **Log every answer first,** in `DECISIONS.md`, before acting on it.
- **A thumbs up** approves what was built. A recommendation he didn't name isn't approved: it stays open in `BACKLOG.md`.
- **Named changes** ("T1: move it") are decisions.
  1. Send the builder an amended brief on the same branch.
  2. Review it, and run CI.
  3. Put the PR on the next review page.
- **A thumbs down** on a PR leaves it open as a draft.
  - If his reason is itself a decision, run a new round on it.
  - A thumbs down doesn't block the other PRs, unless they depend on that one.
- **His letter on a deadlock** is a decision. Build it, then put it on the next review page.

## Merge order
1. PRs that touch no shared file: tooling, process, or the HTML skill alone.
2. Design PRs, oldest decision first.
3. A PR built on another PR's branch merges after that one.

## Each PR in turn
**Find the PR's worktree.** It's the builder's, recorded in the ledger. In a fresh session, find it with
`git worktree list | grep claude/<topic>`. If there's none:

```bash
git fetch origin
git worktree add <path> claude/<topic>
cd <path> && npm ci
```

**Then, in that worktree:**

```bash
git fetch origin
git merge origin/main            # resolve any conflicts (below), then commit the merge
npm run build && npm run ci:local   # without Swift: npm run ci:local -- --web-only
git push
git rev-parse HEAD               # the tested SHA
gh pr merge <n> --merge --match-head-commit <tested SHA>
```

- **Before the merge,** post the tested SHA and the result on the PR, and mark it ready with `gh pr ready <n>`.
- **`--match-head-commit`** makes GitHub refuse to merge any head but the one you tested. If it refuses, run the steps again.
- **Without Swift,** say on the PR that the Swift package went unchecked.

## Conflicts
Parallel PRs conflict in these files:
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
1. Pull `main`, and run `npm run ci:local` on it.
2. Log the merges, with their commits, in `DECISIONS.md`.
3. Skip republishing the hosted reference. `AGENTS.md` asks for it after a merge, but the owner paused it ("dont need the hosted
   reference I don't think", DECISIONS 81), so skip it until he says otherwise.
