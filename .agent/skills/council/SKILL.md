---
name: council
description: >-
  Use this skill whenever the owner says "council", asks what the council thinks, sends a design question or decision to the
  council, or hands it a stream of design-system work to finish (for example "keep working with the council", "let the
  council decide"). It runs Basalt's four-member design council: research, independent prototypes, a convergence vote
  settled 3 of 4, a build brief for Sonnet, a draft PR quoting each member, and the owner's final review page. Also use it
  when the owner asks the council to review or score code. Don't use it for engineering inside a design that's already
  decided (refactors, tests, build, performance, bug fixes that restore documented behaviour): that needs no vote.
compatibility: >-
  For the Basalt repository in T3 Code, which can delegate to the Claude, Codex, Muse and Grok providers in parallel
  (delegate_task). Needs git, gh, Node 22 and, for the macOS CI job, Swift.
---

# Council

Basalt's design decisions are made by a council of four. You are the **lead**: you convene the council on the owner's behalf, run
each round, keep the records and build nothing visual on your own judgment. You never vote and never write a member's answer.
`docs/foundations.md` and `AGENTS.md` are the contract: the council proposes changes to them, and what it decides lands in them.

## Members

| Member | `delegate_task` target (current defaults) | Role |
| --- | --- | --- |
| Opus | `claudeAgent`, `claude-opus-5-5`, `{effort: "xhigh"}` | Designer; measures what it claims |
| Muse | `muse`, `muse-wonder-full-1.0`, `{reasoningEffort: "xhigh"}` | Designer |
| Sol | `codex`, `gpt-6.1-sol`, `{reasoningEffort: "xhigh", serviceTier: "priority"}` | Performance, correctness and the primitives |
| Grok | `grok`, `grok-4.7`, `{reasoningEffort: "xhigh"}` | Designer; judges against X's designers; does research crawls |
| Sonnet (builder, not a member) | `claudeAgent`, `claude-sonnet-5-5`, `{effort: "high"}` | Writes the code once the council has decided |

- Call `orchestrator_capabilities` once per thread before the first `delegate_task`.
- **Newer models:** a newer model from the same provider replaces the default; note it in the round's record.
- **Missing provider:** if a provider is missing, stop and tell the owner. A different provider is a substitute, and substitutes aren't
  allowed: the council's value is four independent judgments.

## Who decides

- **3 of 4 decides.**
- **Ties:**
  - A 2–2 tie keeps what ships today, or what was already decided.
  - If nothing ships, the tie is a **deadlock**: it goes to the owner as options with previews.
  - Ordinary splits never go to the owner. He has asked not to be asked.
- **The owner keeps direction:** what to build, scope, brand and logos. His own visual ideas are proposals: prototype one, show it to
  him, then put it to the council, which may push back.
- **A delegated stream:** when the owner hands a stream of work to the council, its majority stands in for his approval before building.
  - He sees only deadlocks along the way.
  - At the end, each built PR gets his thumbs up or down on one review page.
  - Nothing merges before the thumbs up.
- **Engineering** inside a decided design needs no vote. Sol reviews performance work.

## Run a design round

Copy this checklist into your notes and tick it off; the steps depend on each other. Keep every file in
`MAIN/.review/council/`, where `MAIN` is the repository's main checkout. Number each decision in `DECISIONS.md`, and log what you
find along the way in `BACKLOG.md`.

```
- [ ] 1. Research (only if the question is about practice, or the owner asked)
- [ ] 2. Prototype brief
- [ ] 3. Prototypes from Muse, Opus and Grok, in parallel
- [ ] 4. Owner's look (only for his own idea, or if he asked)
- [ ] 5. Vote brief, and four independent votes
- [ ] 6. Tally into DECISIONS.md
- [ ] 7. Build brief, and Sonnet's build
- [ ] 8. Your review of the build
- [ ] 9. Draft PR, with both CI jobs passing
- [ ] 10. Owner's review page (at the end of a stream, or when he asks)
- [ ] 11. Merge after the thumbs up
```

1. **Research.** Grok crawls X and the reference products into `references/<topic>/`, with screenshots and measured values.
   Otherwise a vote rests on taste alone. References are for measuring, never copying: no other system's colours, sizes, CSS or assets.
2. **Prototype brief.** Copy [assets/prototype-brief.md](assets/prototype-brief.md) to `<topic>-brief.md` and fill every section.
3. **Prototypes.** Start Muse, Opus and Grok together, each with `isolation: "worktree"` (see Delegating).
   - When all three are back, copy each into `<topic>/{muse,opus,grok}/`.
   - Make side-by-side crops in `<topic>/compare/`.
4. **Owner's look.** Show him the three, and ask for a reaction, not a decision.
5. **Vote.** Copy [assets/vote-brief.md](assets/vote-brief.md) to `<topic>-vote-brief.md`.
   - Start all four members together, each with `isolation: "worktree"`.
   - Each writes `<topic>-vote/<member>.md` and returns its full text. Save each into `MAIN/.review/council/<topic>-vote/`.
6. **Tally.** Count each item and add one entry to `DECISIONS.md`, using [assets/tally.md](assets/tally.md). If something deadlocked,
   record it and keep going with everything else; the deadlocks go to the owner together, later.
7. **Build.**
   - Copy [assets/build-brief.md](assets/build-brief.md) to `<topic>-build-brief.md`, and start Sonnet with `isolation: "worktree"`.
   - Independent parts can build in parallel, in separate worktrees.
   - Give each build its own review-round number. The next free one is in `tools/review/rounds.tsx`; count the open PRs' rounds as
     taken.
8. **Review the build.** Work through the review list under Gotchas. Fix small things yourself. List what the builder left open.
9. **PR.**
   - Commit on a `claude/<topic>` branch and push.
   - Open a draft PR with the body from [assets/pr-body.md](assets/pr-body.md).
   - Run both CI jobs on the PR's exact head (see Gotchas: CI), and post the result on the PR.
10. **Owner's review page.** Read [references/owner-review.md](references/owner-review.md) before building it.
11. **Merge.** Follow the merge order in references/owner-review.md: bring each PR up to date, resolve conflicts by keeping both sides,
    re-run both CI jobs, then `gh pr ready <n> && gh pr merge <n> --merge`. Recommendations the owner didn't name stay in `BACKLOG.md`,
    not adopted.

For a code review instead of a design round, read [references/code-review.md](references/code-review.md).

## Delegating

- **The `task` is one line pointing to the brief:** "Your brief is the file `MAIN/.review/council/<file>`. Read it first and follow it
  exactly. Return the full text of your answer as your final message." Write the brief, not the prompt.
- **Settings:** `isolation: "worktree"` for every member and the builder. Use `role: "design"` for prototypes and votes, and
  `role: "implementation"` for builds.
- **Independence:** a member never sees another member's answer before the tally. Don't quote one in another's brief, and don't share
  a worktree.
- **Waiting:** completion wakes you, so don't poll. If the owner stops a delegate by accident, resume it with `t3_thread_send` and the
  same thread.

## Gotchas

- **Git-ignored files:** `.review/` is git-ignored, so a delegate's worktree doesn't have it. Every brief must name council files by
  their absolute path in `MAIN`.
- **Collecting answers:** delegates write inside their own worktrees, so their files never appear in `MAIN` by themselves. Copy them
  across when each one finishes.
- **What a tie keeps:** "keeps what ships" applies only when something ships. When nothing does, it's a deadlock for the owner.
  Don't settle it yourself.
- **Approval covers what was built:** "Approve" means what was built. A recommendation he didn't name isn't approved.
- **Quotes, not summaries:** the PR and `DECISIONS.md` carry each member's final position in its own words. Paraphrase loses the reasons.
- **Reviewing a build** (step 8):
  - Read the builder's "couldn't do" list and check each item. An `sed` edit once failed silently.
  - Read every edit to an existing test. A test may be updated for new behaviour, but never weakened.
  - Search the diff for real names, emails and employers. A builder once put the owner's email in sample data.
  - Look at the screenshots at 2x in both themes, at 390, in forced colours and under reduced motion.
- **Fonts in tests:** behaviour tests load no web font, so text widths differ between macOS and CI's Linux runner. Keep a test's margins
  wider than a fallback font's width.
- **CI:** when GitHub Actions can't run (the monthly minutes run out), `npm run ci:local` runs both jobs from `ci.yml`'s own steps. Run
  it on the exact head before any merge, and again after resolving conflicts.
- **Parallel PRs:** they conflict in `tools/review/rounds.tsx`, `packages/react/src/styles/components.css`, `docs/foundations.md`,
  `AGENTS.md` and the tertiary-ink inventory in `press-and-chrome.test.mjs`. Keep both sides. Reword any sentence that one side made
  false; one once said "the one such row" after a second kind had merged.
- **Screenshots aren't enough for the owner.** He wants to use the components. The review page embeds each PR's live walkthrough.
- **X:** the X console is open in the shared browser for research. Read styles and hover only; never click.
- **Sample data:** synthetic only. Never open real health data (N1), and no personal or employer details in fixtures.
