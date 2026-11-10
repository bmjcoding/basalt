---
name: council
description: >-
  Use this skill whenever the owner says "council", names its members (Opus, Muse, Sol, Grok), sends a design question or
  decision to the council, asks the designers to each mock something up and vote, hands the council a stream of
  design-system work to finish ("keep working with the council"), asks the council to review or score code, or approves
  council PRs and wants them merged. It runs Basalt's four-member design council and records what it decides. Don't use
  it for engineering inside a design that's already decided (refactors, tests, build, performance, bug fixes that restore
  documented behaviour, a rename that changes no pixel): that needs no vote.
compatibility: >-
  For the Basalt repository in T3 Code, which can delegate to the Claude, Codex, Muse and Grok providers in parallel
  (delegate_task). Needs git, gh, Node 22, Playwright (in the repository's node_modules), Swift for the macOS CI job, and
  for research the logged-in shared browser.
---

# Council

Basalt's design decisions are made by a council of four members. You are the **lead**: you run the rounds, keep the records, and
make no design decision yourself. You never vote, and you never write a member's answer.

- **What the council replaces:** on a council round this skill replaces the two-reviewer design panel in `AGENTS.md`. Otherwise
  `docs/foundations.md` and `AGENTS.md` stay the contract, and what the council decides is written into them.
- **Looking something up:** if the owner only wants to know what the council decided or how it works, answer from `DECISIONS.md`
  and this skill. Don't start a round.
- **Starting partway through:**
  - his answer to a review page, or "merge them": [references/merge.md](references/merge.md);
  - a code review: [references/code-review.md](references/code-review.md);
  - a stream already running: its ledger (see Names and paths).

## Names and paths

- **`MAIN`** is the main checkout. Find it from any worktree with
  `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`.
- **Paths:**
  - this skill's own files (`assets/`, `references/`, `scripts/`) are relative to its folder, `MAIN/.agent/skills/council/`;
  - other plain paths (`docs/foundations.md`, `tools/review/rounds.tsx`) start at the root of the checkout you're working in;
  - `MAIN/` marks the main checkout.
- **Council files** live in `MAIN/.review/council/`. It's git-ignored, so a delegate's worktree doesn't have it: always write the
  absolute path. `DECISIONS.md` and `BACKLOG.md` always mean the ones there, and `INDEX.md` the one in `MAIN/.review/council/references/`.
- **`DECISIONS.md`** is one numbered sequence. The owner's words, each tally, each approval and each merge take the next number.
  `BACKLOG.md` lists open work, each item with who found it and its decision number.
- **`<topic>`** is a lowercase hyphenated slug (`date-picker`). A later round on the same topic adds `-r2`, `-r3`.
- **Member slugs** are `opus`, `muse`, `sol` and `grok`. Answer files use them.
- **The ledger:** `MAIN/.review/council/<topic>-ledger.md`, one per stream, or one per round outside a stream. For every round in
  progress it holds:
  - its step;
  - its delegates' task ids and worktree paths;
  - its PR;
  - any held deadlocks.

  Update it at every step: a long stream outlives your context.
- **The preview standard:** wherever a brief asks for previews or screenshots, that means both themes, at 1440 and at 390, at 1x and
  2x, in forced colours and under reduced motion.

## Members

| Slug | `delegate_task` `target` | Role |
| --- | --- | --- |
| `opus` | `{providerInstanceId: "claudeAgent", model: "claude-opus-5-5", options: {effort: "xhigh"}}` | Designer and voter |
| `muse` | `{providerInstanceId: "muse", model: "muse-wonder-full-1.0", options: {reasoningEffort: "xhigh"}}` | Designer and voter |
| `sol` | `{providerInstanceId: "codex", model: "gpt-6.1-sol", options: {reasoningEffort: "xhigh", serviceTier: "priority"}}` | Voter on every item; leads performance and correctness evidence |
| `grok` | `{providerInstanceId: "grok", model: "grok-4.7", options: {reasoningEffort: "xhigh"}}` | Designer and voter; does the research crawls and judges against X's designers |
| builder | `{providerInstanceId: "claudeAgent", model: "claude-sonnet-5-5", options: {effort: "high"}}` | Writes the code once the council has decided; not a member |

- **The model in this table isn't offered:** if `orchestrator_capabilities` doesn't list it, use the same family's newest version at
  the same effort (a later Opus for Opus), and record the slug and model in the tally.
- **A family is gone:** that member is missing. Stop and tell the owner. Never substitute another provider: the council's value is
  four independent judgments.
- **Fewer members:** run with three only if the owner orders it.
  - 2 of 3 decides wherever this skill or a template says 3 of 4 or 3 votes: a design vote, the roadmap's scope, tier and moves, and a
    preference in code review.
  - Votes plus abstentions make 3, and prototypes come from the designers who remain.
  - In every brief and template you copy for that round, rewrite the four-member lines: name the three members, write "2 of 3" for
    "3 of 4", and quote three final positions in the PR. The vote and roadmap briefs' header comments say the same.
  - Record the exception, with its reason, in `DECISIONS.md` and in the PR.

## Who decides

- **A decision** is 3 or more votes for one option. An abstention isn't a vote, so 3 votes and 1 abstention is a decision.
- **No majority** is every other count (2–2, 2–1–1, 2–1 with one abstention, 1–1–1–1). It keeps what was already decided or, failing
  that, what ships today.
  - If neither exists, it's a **deadlock**.
  - If what it would keep is something the owner has objected to on record, that's a deadlock too.
  - Never ship a plurality, and never re-vote to find a majority.
- **Counting:**
  - An abstention never counts toward 3.
  - A member that doesn't answer at all is a failed delegate, not an abstention (see Delegating).
  - A member may write in an option of its own; it's counted separately.
  - A conditional vote ("yes, if…") doesn't conform: resume that member once and ask for one option or an abstention. If it's still
    conditional, count it as an abstention, and say so in the tally.
- **Deadlocks** go to the owner on [assets/deadlock.md](assets/deadlock.md), one block per option that got a vote. Nothing deadlocked
  is built, and nor is anything that depends on it.
- **A handoff:** the owner hands the building over ("send it to the council", "let the council decide", "keep working with the
  council"). The majority stands in for his approval before building.
  - He sees only deadlocks, and failures (see Delegating).
  - Every built PR gets his thumbs up or down on a review page before it merges.
- **An opinion:** he asks what the council thinks. The tally is a proposal.
  - Send him one message: each result with its count, its crop from `compare/` and the prototype's path, plus any deadlocks on the
    deadlock form.
  - Build only after his approval is logged.
- **Neither clearly:** if his words don't plainly hand the building over, treat the request as an opinion. Record "handoff" or
  "opinion" at step 0.
- **The owner keeps direction:** what to build, scope, brand and logos. In an open-ended handoff ("finish what's missing"), the
  council's roadmap round ([assets/roadmap-brief.md](assets/roadmap-brief.md), run as [references/stream.md](references/stream.md)
  says) sets scope inside the design system. Brand and logos stay his.
- **Engineering inside a decided design** needs no vote. Performance work is reviewed by `sol` alone, on
  [assets/review-brief.md](assets/review-brief.md). Its "no blocking findings" line is the verdict; record it and the score in
  `DECISIONS.md`.

## Run a design round

A handoff of more than one item, or an open-ended one, is a **stream**: read [references/stream.md](references/stream.md) first. It
runs this round once per batch. Copy the checklist and tick it off; each step needs the one before.

```
- [ ] 0. Log the owner's words in DECISIONS.md (once per stream)
- [ ] 1. Research, if the topic is new to Basalt or he asked
- [ ] 2. Prototype brief, checked
- [ ] 3. Three prototypes, checked, then crops
- [ ] 4. The owner's look (his own visual idea only, and not in a stream)
- [ ] 5. Vote brief, checked, then four votes
- [ ] 6. Tally, recounted, into DECISIONS.md
- [ ] 7. Build brief, checked, then the build
- [ ] 8. Your review of the build
- [ ] 9. Draft PR, with npm run ci:local passing on its pushed head
- [ ] 10. The owner's review page
- [ ] 11. Merge after the thumbs up
```

0. **Log.** Add the owner's words, quoted exactly, as the next numbered entry.
   - Mark the request "handoff" or "opinion".
   - Mark each part as his direction, his proposal, or a question.
   - Briefs cite this number.
1. **Research.** Do it when the topic is a component, pattern or value Basalt doesn't ship yet, or when the owner asks. Skip it when the
   round only settles values inside something Basalt already ships, or when `MAIN/.review/council/references/INDEX.md` already lists
   the topic.
   - Copy [assets/research-brief.md](assets/research-brief.md) to `MAIN/.review/council/<topic>-research-brief.md`.
   - Under "Where to look", name X, plus any product `INDEX.md` has measured for a neighbouring pattern. If there's none, write "X only".
   - Start `grok` with `role: "research"`. Its findings go to `MAIN/.review/council/references/<topic>/`, which is not this skill's own
     `references/` folder.
   - When it returns, add a line for it to `INDEX.md`.
2. **Prototype brief.** Copy [assets/prototype-brief.md](assets/prototype-brief.md) to `MAIN/.review/council/<topic>-brief.md`, fill
   it, then check it (see Checking a brief).
3. **Prototypes.** Start `muse`, `opus` and `grok` together, with `role: "design"`. When all three are back:
   - **Check each page in its designer's worktree first,** so nothing reaches `MAIN` before all three pass. Open it with Playwright (`MAIN/node_modules/playwright`), each time in a new context, with
     `colorScheme: "dark"` and then `"light"`, at 1440 and 390. A basalt-html page takes the system theme when nothing is stored.
   - **Send it back** to its designer (Delegating, failures) before anyone votes if it errors, doesn't load, or its `data-theme` on
     `<html>` doesn't match the context's colour scheme.
   - **Collect** only when all three pass: copy each one's folder to `MAIN/.review/council/<topic>/<slug>/`.
   - **Crops:** for each brief question and each theme, screenshot the same state of the three at 1440 and 2x (same contexts), and join them in one row
     on a small HTML page that you screenshot. Save the result in `MAIN/.review/council/<topic>/compare/`. Members check the rest of
     the preview standard live.
4. **The owner's look.** Only for his own visual idea: a proposed look, treatment or value. A request to build something isn't one.
   - The prototype brief quotes his idea as a proposal to test. Each designer still builds what it believes, which may reject the idea.
   - Show him the three, and ask for a reaction, not a decision. Log his reaction.
   - A positive reaction doesn't skip the vote.
   - In a stream, skip this step; his look happens on the review page.
5. **Vote.**
   - **Items:** for each brief question, list each prototype's answer as an option and name its designer. Merge identical answers.
   - **The brief:** copy [assets/vote-brief.md](assets/vote-brief.md) to `MAIN/.review/council/<topic>-vote-brief.md`, then check it.
   - **Start** all four with `role: "design"`.
6. **Tally.**
   - When all four are back, save them to `MAIN/.review/council/<topic>-vote/<slug>.md`.
   - Count every item again from the files, and check that each item's votes plus abstentions make 4.
   - Add one entry using [assets/tally.md](assets/tally.md).
   - **Deadlocks, for one question:** send them now, in one message on the deadlock form. Build only what doesn't depend on them. His
     answer is a decision: log it, then build it (an amended brief on the same branch, or a new build brief).
   - **Deadlocks, in a stream:** hold them, as [references/stream.md](references/stream.md) says.
7. **Build.**
   - **When:** right after the tally for a handoff. For an opinion, once his approval is logged.
   - **The brief:** copy [assets/build-brief.md](assets/build-brief.md) to `MAIN/.review/council/<topic>-build-brief.md`, and check it.
     It gets the next free review-round number: one more than the highest round on main (`tools/review/rounds.tsx`), in any open PR
     (`gh pr diff <n> --name-only`), or held by a running build.
   - **The builder:** start it with `role: "implementation"`. It returns its worktree path, branch and base SHA; put them in the ledger.
8. **Review the build** in the builder's worktree.
   - **Read** its "couldn't do" list and check each item.
   - **Read every edit to an existing test:** updating one for new behaviour is fine, weakening one isn't.
   - **Search** the diff and the fixtures for real names, emails and employers.
   - **Look** at its screenshots, to the preview standard.
   - **Fix it yourself** only if it's a non-visual defect: a failed edit, a test, lint, sample data, a fact in the docs.
   - **A rendered pixel that's wrong inside the decided design** goes back to the builder, by `t3_thread_send` on its thread, with
     what to fix. Then review again. After three returns, start a fresh builder on the same branch, with the brief and the list of
     faults. Before you start it:
     - commit the work so far on `claude/<topic>` in the old worktree;
     - detach that worktree (`git switch --detach`);
     - change the brief's Start here to `git fetch origin && git switch claude/<topic>`.

     If its work still has a fault after three returns, stop the round and tell the owner, as a failure.
   - **A pixel the council never decided** goes to a vote-only round, `<topic>-r2`.
     - **Its options** are the ones the builder named, plus what ships today, if anything does. Members may write in.
     - **If no options were named** (a gap you found, or one the builder reported without options), resume the builder and ask for
       them before the vote.
     - **The result** goes back to the same builder as an amended brief on the same branch; then review again.
   - **The builder's open points:** visual questions go to that vote-only round. Engineering facts go in the PR's "Not reviewed" list.
9. **PR.**
   - In the builder's worktree, commit on `claude/<topic>`, push, and open a draft PR against `main` with
     [assets/pr-body.md](assets/pr-body.md). Each member's final position is quoted there, word for word.
   - **CI:** run `npm run build && npm run ci:local` on the pushed head, and post the SHA and result on the PR.
   - **Without Swift,** run `npm run ci:local -- --web-only`, and say on the PR that the Swift package went unchecked; that still
     counts as passing. The PR stays a draft until the merge.
10. **The owner's review page.** Read [references/owner-review.md](references/owner-review.md); it sends you to the basalt-html skill to
    build the page. One question gets a page of its own; a stream gets one page at its end.
11. **Merge.** Read [references/merge.md](references/merge.md). It also covers a thumbs down, and changes he asks for.

## Delegating

- **The task line.** Every delegate gets one line; the brief carries everything else. Write it with `MAIN` already replaced:
  > You are `<Member>`, a member of Basalt's design council; your slug is `<slug>`. Your brief is the file
  > `</absolute/path>/.review/council/<file>`. Read it first and follow it exactly. Return the full text of your answer as your final
  > message.
  - For the builder, write "You are the builder" instead.
  - Always use `isolation: "worktree"`.
- **Ledger.** Record each delegate's task id and worktree path; you'll copy its files from there.
- **Independence.** No member sees another's answer within a round.
  - Hold each answer in your thread. Copy a round's answers into `MAIN` only when all of them are back: members read `MAIN` while they
    work.
  - In the vote, members do read all three prototypes. That's the point of it.
- **Failures.** Completion wakes you, so don't poll.
  - If a delegate errors, stops or returns nothing usable, resume its thread once with `t3_thread_send`.
  - If that fails too, start it again once, with the same target and brief.
  - Then stop that round, and tell the owner which member failed and what you tried. Other batches in a stream carry on. Never tally a
    round with a missing answer.
  - If the owner stopped a delegate himself, resume it only if he says it was by accident.

## Checking a brief

Before any delegate starts, run `node scripts/check-brief.mjs <brief.md>`. It fails on any `<…>` left in the brief (in prose, in inline
code or in a code block) and on any `MAIN/` left unreplaced.

It lets through only:
- `<your slug>`, which each member fills in itself;
- real HTML: a tag with attributes (`<input type="date">`), a closing tag (`</main>`), or a bare HTML element inside backticks or a
  code block (`<select>`);
- HTML comments (`<!-- … -->`): the templates' notes to you, not text a delegate fills in.

So put any HTML you mention in backticks, and write generics and URLs without angle brackets. A bare `<option>` or `<base>` always
fails, because the templates use them as placeholders: write a real one with an attribute (`<option value="a">`) or in words. An
HTML comment left unclosed fails too, since it would hide the rest of the brief. The checker also warns about a council path that doesn't exist: that's fine for a file a
delegate will create, and a typo otherwise. Fix what it reports, then run it again until it passes.

## Gotchas

- **Sample data is synthetic only.** Never open N1's real health data (N1 is the owner's training app), and put no personal or employer
  details in fixtures. A builder once put the owner's email in sample data.
- **The checker is the only proof a brief is filled.** A `<topic>` left in a path would send a whole round of delegates to a folder
  that doesn't exist. Never start a delegate on a brief the checker hasn't passed.
