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
  (delegate_task). Needs git, gh, Node 22, Playwright (in the repository's node_modules) and, for the macOS CI job, Swift.
---

# Council

Basalt's design decisions are made by a council of four members. You are the **lead**: you run the rounds, keep the records, and
make no design decision yourself. You never vote, and you never write a member's answer.

- **What the council replaces:** on a council round this skill replaces the two-reviewer design panel in `AGENTS.md`. Otherwise
  `docs/foundations.md` and `AGENTS.md` stay the contract, and what the council decides is written into them.
- **Looking something up:** if the owner only wants to know what the council decided or how it works, answer from `DECISIONS.md`
  and this skill. Don't start a round.

## Names and paths

- **`MAIN`** is the main checkout. Find it from any worktree with
  `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`.
- **Council files** live in `MAIN/.review/council/`. It's git-ignored, so a delegate's worktree doesn't have it: always write the
  absolute path.
- **`<topic>`** is a lowercase hyphenated slug (`date-picker`). A later round on the same topic adds `-r2`, `-r3`.
- **Member slugs** are `opus`, `muse`, `sol` and `grok`. Answer files use them.
- **`DECISIONS.md`** is one numbered sequence. The owner's words, each tally, each approval and each merge take the next number.
  `BACKLOG.md` lists open work, each item with who found it and its decision number.
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

- **A default model isn't offered:** if `orchestrator_capabilities` doesn't list a default, use the same family's newest version at
  the same effort (a later Opus for Opus), and record the slug and model in the tally.
- **A family is gone:** that member is missing. Stop and tell the owner. Never substitute another provider: the council's value is
  four independent judgments.
- **Fewer members:** run with three only if the owner orders it. Then 2 of 3 decides, and the tally says so.

## Who decides

- **A decision** is 3 votes of 4 for one option.
- **No majority:** any other count (2–2, 2–1–1, 1–1–1–1, or one with abstentions) keeps what ships today, or what was already decided.
  - If neither exists, it's a **deadlock**.
  - If what it keeps is something the owner has objected to on record, treat it as a deadlock too.
  - Never ship a plurality, and never re-vote to find a majority.
- **Vote counting:** an abstention never counts toward 3. A member that doesn't answer at all is a failed delegate, not an abstention
  (see Delegating). A member may write in an option of its own, and it's counted separately.
- **Deadlocks** go to the owner as options; see [assets/deadlock.md](assets/deadlock.md) for the form. Nothing deadlocked is built,
  and nor is anything that depends on it.
- **A handoff:** when the owner sends a question or a stream of work to the council ("send it to the council", "let the council
  decide", "keep working with the council"), the majority stands in for his approval before building.
  - He sees only deadlocks.
  - Every built PR gets his thumbs up or down on one review page before it merges.
- **Asking for an opinion:** when he only asks what the council thinks, the tally is a proposal. Show it to him with previews, and build
  only after he approves.
- **The owner keeps direction:** what to build, scope, brand and logos. In an open-ended handoff ("finish what's missing"), the
  council's roadmap round sets scope inside the design system. Brand and logos stay his.
- **Engineering inside a decided design** needs no vote. Performance work is reviewed by `sol` alone: one brief, a score and a
  verdict, recorded in `DECISIONS.md`.

## Run a design round

A handoff of more than one item is a **stream**: read [references/stream.md](references/stream.md) first. It runs this round once per
batch. Copy the checklist and tick it off; each step needs the one before.

```
- [ ] 0. Log the owner's words in DECISIONS.md
- [ ] 1. Research, if the topic is new to Basalt
- [ ] 2. Prototype brief, checked
- [ ] 3. Three prototypes, checked, then crops
- [ ] 4. The owner's look (his own visual idea only, and not in a stream)
- [ ] 5. Vote brief, checked, then four votes
- [ ] 6. Tally, recounted, into DECISIONS.md
- [ ] 7. Build brief, checked, then the build
- [ ] 8. Your review of the build
- [ ] 9. Draft PR, with both CI jobs passing on its pushed head
- [ ] 10. The owner's review page
- [ ] 11. Merge after the thumbs up
```

0. **Log.** Add the owner's words, quoted exactly, as the next numbered entry. Mark each as his direction, his proposal, or a question
   for the council, so briefs can cite the number.
1. **Research.** Research when the topic is a component, pattern or value Basalt doesn't ship yet, or when the owner asks. Skip it when
   the round only settles values inside something Basalt already ships, or when `MAIN/.review/council/references/INDEX.md` already
   lists the topic.
   - Copy [assets/research-brief.md](assets/research-brief.md) to `MAIN/.review/council/<topic>-research-brief.md`.
   - Start `grok` with `role: "research"`.
   - Its findings go to `MAIN/.review/council/references/<topic>/`, which is not this skill's own `references/` folder. Add a line to
     `INDEX.md`.
2. **Prototype brief.** Copy [assets/prototype-brief.md](assets/prototype-brief.md) to `MAIN/.review/council/<topic>-brief.md`, fill
   it, then check it (see Checking a brief).
3. **Prototypes.** Start `muse`, `opus` and `grok` together, with `role: "design"`. When all three are back:
   - copy each one's folder to `MAIN/.review/council/<topic>/<slug>/`;
   - open each page with Playwright at 1440 and 390 in both themes. A page that errors or doesn't load goes back to its designer
     (Delegating, failures) before anyone votes;
   - put one image per brief question in `MAIN/.review/council/<topic>/compare/`, with the three prototypes side by side.
4. **The owner's look.** Only for his own visual idea (a proposed look, treatment or value; a request to build something isn't one).
   - The prototype brief quotes his idea as a proposal to test. Each designer still builds what it believes, which may reject the idea.
   - Show him the three and ask for a reaction, not a decision. Log his reaction.
   - A positive reaction doesn't skip the vote.
   - In a stream, skip this step; his look happens on the review page.
5. **Vote.**
   - **Items:** for each brief question, list each prototype's answer as an option and name its designer. Merge identical answers.
   - **The brief:** copy [assets/vote-brief.md](assets/vote-brief.md) to `MAIN/.review/council/<topic>-vote-brief.md`, then check it.
   - **The votes:** start all four with `role: "design"`.
6. **Tally.**
   - When all four are back, save them to `MAIN/.review/council/<topic>-vote/<slug>.md`.
   - Count every item again from the files, and check that each item's votes plus abstentions make 4.
   - Add one entry using [assets/tally.md](assets/tally.md).
   - Deadlocks: for one question, give them to the owner now. In a stream, follow [references/stream.md](references/stream.md).
7. **Build.**
   - **When:** right after the tally for a handoff. For an opinion, show the owner the tally with the prototypes as previews, and
     build once his approval is logged.
   - **The brief:** copy [assets/build-brief.md](assets/build-brief.md) to `MAIN/.review/council/<topic>-build-brief.md`. Give it the
     next free review-round number: the highest in `tools/review/rounds.tsx`, plus any taken by open PRs or running builds. Then check
     it.
   - **The builder:** start it with `role: "implementation"`. It returns its worktree path, branch and base SHA.
8. **Review the build** in the builder's worktree.
   - **Read its "couldn't do" list** and check each item.
   - **Read every edit to an existing test:** updating one for new behaviour is fine, weakening one isn't.
   - **Search the diff and the fixtures for real names, emails and employers.**
   - **Look at its screenshots** to the preview standard.
   - **Non-visual defects you fix yourself:** a failed edit, a test, lint, sample data, a fact in the docs.
   - **Anything that changes a rendered pixel:**
     - inside the decided design, it goes back to the builder (`t3_thread_send` on its thread, with what to fix), then review again;
     - not decided, it goes to a new round (`<topic>-r2`).
   - **The builder's open points:** visual questions go to a council round; engineering facts go in the PR's "Not reviewed" list.
9. **PR.**
   - In the builder's worktree, commit on `claude/<topic>` and push.
   - Open a draft PR with [assets/pr-body.md](assets/pr-body.md). Each member's final position is quoted there, word for word.
   - Run `npm run build && npm run ci:local` on the pushed head, and post the SHA and result on the PR. Without Swift, use
     `npm run ci:local -- --web-only`, and say that the Swift package went unchecked.
10. **The owner's review page.** Read [references/owner-review.md](references/owner-review.md); it sends you to the basalt-html skill to
    build the page. One question gets a page of its own; a stream gets one page at its end.
11. **Merge.** Read [references/merge.md](references/merge.md). It covers a thumbs down and named changes too.

For a code review, read [references/code-review.md](references/code-review.md); its brief is [assets/review-brief.md](assets/review-brief.md).

## Delegating

- **The task line.** Every delegate gets one line; the brief carries everything else. Write it with `MAIN` already replaced:
  > You are `<Member>`, a member of Basalt's design council; your slug is `<slug>`. Your brief is the file
  > `</absolute/path>/.review/council/<file>`. Read it first and follow it exactly. Return the full text of your answer as your final
  > message.
  - For the builder, write "You are the builder" instead.
  - Always use `isolation: "worktree"`.
- **Notes.** Keep each delegate's task id and worktree path in your notes; you'll copy its files from there.
- **Independence.** No member sees another's answer within a round. Hold each answer in your thread, and copy a round's answers into
  `MAIN` only when all of them are back: members read `MAIN` while they work. In the vote, members do read all three prototypes;
  that's the point of it.
- **Failures.** Completion wakes you, so don't poll.
  - If a delegate errors, stops or returns nothing usable, resume its thread once with `t3_thread_send`.
  - If that fails too, start it again once with the same target and brief.
  - Then stop and tell the owner. Never tally a round with a missing answer.
  - If the owner stopped a delegate himself, resume it only if he says it was by accident.

## Checking a brief

Before any delegate starts, run `node scripts/check-brief.mjs <brief.md>` (the path is relative to this skill's folder,
`MAIN/.agent/skills/council/`).
- It **fails** on a placeholder left unfilled, or a `MAIN/` left unreplaced.
- It **warns** about a council path that doesn't exist. That's fine for a file a delegate will create, and a typo otherwise.

Fix what it reports, then run it again until it passes.

## Gotchas

- **Fonts in tests:** behaviour tests load no web font, so text widths differ between macOS and CI's Linux runner. Keep a test's margins
  wider than a fallback font's width.
- **Parallel PRs conflict** in the shared files (see [references/merge.md](references/merge.md)). Keep both sides, and reword any
  sentence one side made false.
- **Sample data is synthetic only.** Never open N1's real health data (N1 is the owner's training app), and put no personal or employer
  details in fixtures. A builder once put the owner's email in sample data.
- **"Approve" covers what was built.** A recommendation the owner didn't name stays open in `BACKLOG.md`.
