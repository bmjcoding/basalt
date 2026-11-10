# Running a stream

Read this when the owner hands the council more than one item, or open-ended work ("keep working with the council to finish what's
missing"). He asked to be left alone until there are deadlocks or built work to judge, so a stream runs to its end on its own. Keep the
stream's ledger (`MAIN/.review/council/<topic>-ledger.md`) up to date at every step.

## 1. Before the first batch
- **Log the handoff once** (SKILL.md step 0). Each batch's briefs cite that entry and the roadmap tally; batches don't log it again.
- **If the owner named the items,** they are the work list, and their batches are yours to group, as below.
- **If the handoff is open-ended,** run a **roadmap round** first. It's a vote, with no prototypes:
  - **Candidates:** gather them from `MAIN/.review/council/BACKLOG.md`, the site mockups' `GAPS.md` files
    (`MAIN/.review/sites/mockups/*/*/GAPS.md`), and anything `docs/foundations.md` leaves undesigned. Leave out brand marks and logos:
    they're the owner's.
  - **The brief:** copy `assets/roadmap-brief.md` to `MAIN/.review/council/<topic>-roadmap-brief.md`, and fill the candidate table,
    with the files each candidate would touch.
  - **Proposed batches:** propose batches of three to six candidates, grouped so that no two batches touch the same files. That's
    scheduling, not design.
  - **Before it goes out:** check the brief, then start all four members.
  - **The count** (it's in the brief):
    - in scope at 3 of 4 for P1 or P2;
    - P1 at 3 of 4 for P1, otherwise P2;
    - a batch keeps its members unless 3 of 4 name the same move;
    - batches holding a P1 item run first, in the proposed order.
  - **Recording it:** record the scope, tiers, batches and order as one entry in `DECISIONS.md`.
- **Engineering items skip the vote:** a bug that restores documented behaviour, a refactor, or a performance change with no pixel
  change.
  - Build each one with `assets/build-brief.md`, adapted as its header comment says.
  - Have `sol` alone review the performance ones, with `assets/review-brief.md` and `role: "review"`.

## 2. The loop
For each batch, in order, run SKILL.md steps 1–9. Step 4 is skipped in a stream, and nothing merges.

- **Parallel batches:** batches that don't depend on each other can run at the same time. Each gets its own topic, worktrees, review
  round and PR.
- **Dependent work:** if a batch needs code from an unmerged PR, brief its builder to branch from that PR's branch
  (`origin/claude/<other topic>`). Open its PR against `main` all the same, and say in both PRs which comes first.
- **Scope doesn't grow.** The scope is the roadmap tally. When you or a builder find a gap:
  - **if it's a missing part or state of an in-scope item,** it belongs to that item. Add it to the item's prototype brief if its batch
    hasn't been briefed yet. If it has, list it on the review page;
  - **anything else,** including what members named as missing in the roadmap round: add it to `BACKLOG.md`, credited to whoever found
    it, and list it on the review page.
- **Open visual questions** a builder leaves go to a vote-only round (SKILL.md step 8) before the review page. Only deadlocks reach the
  owner.
- **Ready:** a PR is ready when `npm run ci:local` has passed on its pushed head. Without Swift, `npm run ci:local -- --web-only`
  counts, with the PR saying the Swift package went unchecked.

## 3. Deadlocks in a stream
Hold deadlocks; don't send them one at a time.

- **Normally,** they go on the review page, in a section above the PRs, each on `assets/deadlock.md`.
- **If deadlocks block every remaining batch,** send all the deadlocks held so far in one message, each on `assets/deadlock.md`. Keep
  building what isn't blocked while you wait.
- **His answer is a decision:** log it, then build it.

## 4. The end
The stream is done when every in-scope item is either a ready PR or a recorded deadlock. Then build the review page
(`references/owner-review.md`). It holds the deadlocks, every PR, and the gaps found outside scope.
