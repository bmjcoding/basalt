# Running a stream

Read this when the owner hands the council more than one item, or open-ended work ("keep working with the council to finish what's
missing"). He asked to be left alone until there are deadlocks or built work to judge, so a stream runs to its end on its own.

## 1. The work list
- **If the owner named the items,** they are the list.
- **If the handoff is open-ended,** run a **roadmap round** first. It's a vote round (SKILL.md step 5) with no prototypes:
  - **Candidates:** gather them from `MAIN/.review/council/BACKLOG.md`, the site mockups' `GAPS.md` files under `MAIN/.review/sites/`,
    and anything `docs/foundations.md` leaves undesigned.
  - **Each member marks each candidate** P1 (now), P2 (after P1), Product (it belongs in a product, not Basalt) or Out. Each also
    groups P1 and P2 items into batches of three to six that can be prototyped together and built without touching the same files,
    and names anything missing.
  - **The count:** an item is in scope when 3 of 4 put it at P1 or P2. Its batch and order follow the majority, or the median position
    when there's no majority. Record the result as one entry in `DECISIONS.md`.
  - **What stays out:** brand marks and logos are always the owner's, never in scope.
- **Engineering items skip the vote:** a bug that restores documented behaviour, a refactor, or a performance change with no pixel
  change. Build each one with a builder brief, and have `sol` review the performance ones.

## 2. The loop
For each batch, in order, run SKILL.md steps 0–9. Don't merge anything.

- **Parallel batches:** batches that don't depend on each other can run at the same time. Each gets its own topic, worktrees and PR.
- **Dependent work:** if a batch needs code from an unmerged PR, brief its builder to branch from that PR's branch, not from `main`. Say
  so in both PRs; they merge in that order.
- **New gaps:** add any gap you find to `BACKLOG.md`. If it's inside the stream's scope, add it to a later batch. If it isn't, list it on
  the review page.
- **Open visual questions:** a visual question a builder leaves open goes to a short council round (vote brief only) before the review
  page. Only a deadlock reaches the owner.

## 3. Deadlocks in a stream
Hold deadlocks; don't send them one at a time.

- **Normally,** they go on the review page, in a section above the PRs, each written with `assets/deadlock.md`.
- **If deadlocks block every remaining batch,** send all the deadlocks held so far in one message, each written with
  `assets/deadlock.md`. Keep building what isn't blocked while you wait.
- **His answer is a decision:** log it, then build it.

## 4. The end
The stream is done when every in-scope item is a draft PR with both CI jobs passing, or a recorded deadlock. Then build the review page
(`references/owner-review.md`), with the deadlocks, every PR, and the gaps found outside scope.
