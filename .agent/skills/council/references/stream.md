# Running a stream

Read this when the owner hands the council more than one item, or open-ended work ("keep working with the council to finish what's
missing"). He asked to be left alone until there are deadlocks or built work to judge, so a stream runs to its end on its own. Keep the
stream's ledger (`MAIN/.review/council/<topic>-ledger.md`) up to date at every step.

## 1. Before the first batch
- **Name the stream** with a topic of its own (`finish-nov10`). It names the stream's ledger, its roadmap brief and its
  `<topic>-roadmap-vote/` folder. Each batch then gets its own topic.
- **Log the handoff once** (SKILL.md step 0). Each batch's briefs cite that entry and the roadmap tally; batches don't log it again.
- **If the owner named the items,** they are the work list, and their batches are yours to group, as below.
- **If the handoff is open-ended,** run a **roadmap round** first. It's a vote, with no prototypes:
  - **Candidates:** gather them from `MAIN/.review/council/BACKLOG.md`, the site mockups' `GAPS.md` files
    (`MAIN/.review/sites/mockups/*/*/GAPS.md`), and anything `docs/foundations.md` leaves undesigned. Leave out brand marks and logos:
    they're the owner's.
  - **The brief:** copy `assets/roadmap-brief.md` to `MAIN/.review/council/<topic>-roadmap-brief.md`, and fill the candidate table,
    with the files each candidate would touch.
  - **Proposed batches:** group the candidates yourself. That's scheduling, not design.
    - **Ignore the shared files** that every design PR touches: the Conflicts list in `references/merge.md`, plus
      `packages/react/src/index.ts`.
    - **Same batch:** put two candidates in one batch when they edit some other file in common (a component's own source, say).
    - **Size:** aim for three to six per batch. A shorter work list can make a smaller batch.
    - **A group larger than six** splits into consecutive batches that run one after another. Brief each later one to branch from the
      previous batch's branch.
    - **Write the plan into the brief:** the batches, which ones depend on which, and the files each touches.
  - **Before it goes out:** check the brief, then start all four members with `role: "design"`. Each writes `<topic>-roadmap-vote/<your slug>.md`. When all
    four are back, save them to `MAIN/.review/council/<topic>-roadmap-vote/<slug>.md`, and count from the files.
  - **The count** (it's in the brief):
    - in scope at 3 of 4 for P1 or P2;
    - P1 at 3 of 4 for P1, otherwise P2;
    - a batch keeps its members unless 3 of 4 name the same move ("candidate A3 joins batch Forms");
    - a candidate the tally left out is dropped from its batch, and an empty batch is skipped;
    - **dependencies come before priority:**
      - a later batch of a split group never starts before the earlier one; if the earlier one ended up empty, the later one branches
        from `origin/main`;
      - two batches that now share a file outside the shared list (after moves) run one after the other, the later on the earlier's
        branch;
    - **then priority:** among batches whose prerequisites are done, start those holding a P1 item first, in the proposed order. Any
      that share no file outside the shared list may run at the same time.
    - **Record it:** the resulting schedule goes in the roadmap tally.
  - **Recording it:** record the scope, tiers, batches and order as one entry in `DECISIONS.md`.
- **Engineering items** (a bug that restores documented behaviour, a refactor, a performance change with no pixel change) are in
  scope only if the roadmap or the owner's list put them there. They skip only the design round.
  - Build each one with `assets/build-brief.md`, adapted as its header comment says.
  - Have `sol` alone review the performance ones, with `assets/review-brief.md` and `role: "review"`.

## 2. The loop
For each batch, in order, run SKILL.md steps 1–9. Step 4 is skipped in a stream, and nothing merges.

- **Parallel batches:** batches that don't depend on each other can run at the same time. Each gets its own topic, worktrees, review
  round and PR.
- **Dependent work:** if a batch needs code from an unmerged PR, brief its builder to branch from that PR's branch
  (`origin/claude/<other topic>`). Open its PR against `main` all the same, and say in both PRs which comes first.
- **Scope doesn't grow.** The scope is the roadmap tally. When you or a builder find a gap:
  - **if it's a missing part or state of an in-scope item** (a date field's invalid state, say), it belongs to that item, and scope
    hasn't grown. Before the batch's prototype brief goes out, add it there. After that, it's a pixel the council never decided: it goes
    to the batch's vote-only round (SKILL.md step 8) and is built in the same PR. It never reaches the review page as an open question;
  - **anything else,** including what members named as missing in the roadmap round: add it to `BACKLOG.md`, credited to whoever found
    it, and list it on the review page.
- **Open visual questions** a builder leaves go to a vote-only round (SKILL.md step 8) before the review page. Only deadlocks reach the
  owner.
- **Done:** a PR is done when `npm run ci:local` has passed on its pushed head. Without Swift, `npm run ci:local -- --web-only`
  counts, with the PR saying the Swift package went unchecked. It stays a draft: `gh pr ready` comes at the merge.

## 3. Deadlocks in a stream
Hold deadlocks; don't send them one at a time.

- **Normally,** they go on the review page, in a section above the PRs, each on `assets/deadlock.md`.
- **If deadlocks block every remaining batch,** send all the deadlocks held so far in one message, each on `assets/deadlock.md`. Keep
  building what isn't blocked while you wait.
- **His answer is a decision:** log it, then build it.

## 4. The end
The stream is finished when every in-scope item is a done PR, a recorded deadlock, or a round stopped and reported to the owner as a
failure (a failed delegate, or the build loop in SKILL.md step 8). Then build the review page
(`references/owner-review.md`). It holds the deadlocks, every PR, and the gaps found outside scope.
