---
name: council
description: >-
  Runs Basalt's design council: a scout researches, drafters prototype, a checker attacks the drafts, a decider writes the
  decision, then a builder builds it and the council reviews the PR. Use when the owner says "council", sends a Basalt design
  question to it, asks what it thinks of a design, hands it design work to finish, or asks it to review or score code. Don't use
  it for engineering inside a decided design (refactors, tests, build, performance, bug fixes that restore documented behaviour,
  a rename that changes no pixel).
compatibility: >-
  T3 Code with delegate_task and the claudeAgent, codex, antigravity, muse and grok providers.
---

# Council

You are the lead: you brief the seats, run them, keep the record and keep scope fixed. You never draft, check or decide, and never
write a seat's answer. A council round replaces the two-reviewer panel in `AGENTS.md`.

## Seats

| Seat | Target | Light | Heavy |
| --- | --- | --- | --- |
| Scout | `grok` / `grok-4.7` | `reasoningEffort: "xhigh"` | same |
| Drafter | `antigravity` / `gemini-4-neon` | `thought_level: "high"` | `thought_level: "xhigh"` |
| Drafter | `muse` / `muse-wonder-full-1.0` | sits out | `reasoningEffort: "xhigh"` |
| Checker | `codex` / `gpt-6.2-astra` | `reasoningEffort: "medium"` | `reasoningEffort: "xhigh"`, `serviceTier: "priority"` |
| Decider | `claudeAgent` / `claude-opus-5-5` | `effort: "high"` | `claude-fable-5-2`, `effort: "high"` |
| Builder | see Choosing the builder | | |
| Measurements, audits | `codex` / `gpt-6.2-sol`, `reasoningEffort: "high"` | | |

- The scout researches. Drafters build prototypes. The checker attacks drafts and reviews code. The decider writes the decision and
  owns tokens, components and variants.
- Never raise effort past high on a Claude model; move up a model instead.

**Heavy** when any of these holds (log which one); otherwise light:
- it adds or changes a token, component or variant;
- it adds a pattern, layout or interaction model Basalt doesn't ship;
- a light round ends with a blocking finding the decider couldn't resolve, or an objection that survives step 5;
- the owner asks.

**Models.** Resolve targets with `orchestrator_capabilities`. Only two seats have a fallback: Astra falls back to `gpt-6.2-sol` at
`xhigh`, and Fable to Opus at `high`. Record any swap.

A drafter that can't run (not offered, failed, or out of usage) sits out the round unless the owner asks to wait. With no drafter
left, or a checker or decider that can't run and has no fallback, pause the round and tell the owner. Don't retry a usage limit.
Say in the PR who sat out or swapped.

## Who decides

- **Handoff** ("send it to the council", "let the council decide"): the decision is approval to build. The owner sees the PR before
  merge.
- **Opinion** ("what does the council think"), or unclear: the decision is a proposal. Show him pictures; build after his logged
  approval.
- **The owner keeps** direction, scope, brand and logos. His visual ideas are proposals the drafters build and any seat may oppose.
- **An objection that survives** step 5 goes to the owner as a choice, with a picture of each option. Nothing that depends on it is
  built. Never re-run seats to clear an objection.
- **No council** (owner says so): Opus decides at high, the builder builds, Astra at medium reviews code, Opus checks pixels.

## Choosing the builder

Sonnet (`claudeAgent` / `claude-sonnet-5-5`, `effort: "medium"`, `"high"` for existing code) builds only when every value is
decided, the change stays in one component or token set, tests or screenshots would catch a wrong result, and it isn't a migration,
performance change or tangled fix. Otherwise Opus at high builds. Switch the rest of a topic to Opus after a Sonnet build is sent back
twice for a blocking finding, or when a fix means rewriting much of the diff; log the switch in `DECISIONS.md`.

## Records

`MAIN` is `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`. Council files are in `MAIN/.review/council/`
(git-ignored; give delegates absolute paths):
- `DECISIONS.md`: numbered log of the owner's words (quoted exactly), decisions, approvals and merges.
- `BACKLOG.md`: open work, with who found it and its entry number.
- `<topic>/`: briefs and answers.

## A design round

0. **Log** the owner's words; mark "handoff" or "opinion".
1. **Scout** (skip on a light round). Grok finds what practitioners on X and in the industry do with the pattern and what works or
   fails, with a link per claim and screenshots for anything visual, in `<topic>/scout.md`. Seats get it headed "unverified leads";
   a decision resting on one cites the source, checked by the decider.
2. **Draft.** Same brief to each drafter: the question, the owner's words, the relevant foundations, what ships today, the states to
   show. Each builds a working prototype (Basalt components or the HTML skill) in its own worktree, with a note on its choices.
3. **Check.** Give the checker the drafts, not your view. It opens each in both themes, at 1440 and 390, at 2x, plus forced colours
   and reduced motion where relevant. Findings are **blocking** or **polish**, with measured evidence (a blocking finding without
   evidence is polish), plus a score out of 10.
4. **Decide.** Give the decider the drafts and the check; two drafts go as "Draft A" and "Draft B", in random order, model names
   removed. It writes every value, which draft each part comes from, and each finding accepted or rejected with a reason. Log it.
5. **Final positions.** Each drafter and the checker reads the decision in a fresh brief and answers "agree" or "object", with why.
   The decider answers each objection once, revising or holding.
6. **Opinion only:** send the owner the decision, pictures and open objections. Wait for his logged approval.
7. **Build.** Brief the builder: the decision, the reference prototype per part, prototype defects not to copy, foundations edits,
   tests, and the next free review-round number. It works uncommitted on `claude/<topic>` in its own worktree, and reports visual
   questions with two or three options without picking one.
8. **Review.** The checker reviews code and frontend; the decider checks pixels against the decision. Each scores. Fix non-visual
   defects yourself. A wrong pixel goes to the builder; an undecided one to the decider. A reviewer still blocking after two
   re-checks fixes its own findings, and another seat reviews them.
9. **PR.** Commit, push, open a draft PR quoting each seat's final position word for word, with the score table. Run
   `npm run ci:local` on the pushed head (`npm test` and `npm run lint` while the owner has CI paused); post what ran.
10. **Owner's look.** Embed screenshots in the reply (both themes, 1440 and 390, before and after) and link the walkthrough
    (`npm run review -- <round>`). A thumbs up merges; a PR that only builds what he already decided merges without asking.

**A stream** (several topics, or open-ended work): batch topics that share no component file, propose scope and order to the owner
once, run independent batches in parallel. A gap inside an in-scope item belongs to it; anything else goes to `BACKLOG.md`.

## Code review

First answer open PR comments, fix known issues and run the checks (skip fixes to code being thrown away). Then brief Opus, Astra and
Neon read-only, each in its own worktree; each returns blocking or polish findings and a score out of 10. The checks are the gate;
scores are opinions. Verify each finding as it arrives. Fix verifiable defects; apply a preference only if two raise it; send
pixel changes to a design round. Don't edit a checkout under review. A full pass is a round; stop when a round finds nothing to fix,
or after three. List what's left in the PR.

Put the table in the PR description before the attribution line (edit, don't comment), or in the final reply with no PR. A seat
with no score gets `no score`.

```markdown
## Council review

Rounds: 2

| Seat | Round 1 | Round 2 |
| --- | --- | --- |
| Opus 5.5 | 7/10 | 9/10 |
| GPT-6.2 Astra | 8/10 | 10/10 |
| Gemini 4 Neon | 7/10 | 9/10 |
```

## Delegating

- `delegate_task` with `isolation: "worktree"` and a one-line task: the seat and the absolute path of its brief. Before starting,
  check every path in the brief exists and nothing is unfilled.
- The checker never sees the decider's view before checking. Copy answers into `MAIN` only after their step is done.
- Completion wakes you; don't poll. Resume a failed delegate once, restart it once, then follow Models and tell the owner.

## Rules

- Sample data is synthetic: never open N1's real health data; no real names, emails or employers.
- Nothing from an employer goes to any seat.
- A seat's new idea goes to `BACKLOG.md` unless it fixes a defect in what was asked.
- If something skipped a seat, the PR says so.
