---
name: council
description: Trigger this if the user says 'council'. Basalt's design-system council - four delegates from four providers review design and code, each scoring out of 10 per round.
---

# Council

Before an audit, address outstanding PR comments, fix known issues, and run
relevant checks. Give council the updated implementation; do not defer known
fixes until reviews return. If the user wants to discard the implementation
and explore new ideas, skip fixes to code being replaced.

Bring in three delegates to help with the user's request, usually for review
or feedback. Use one strong model from each of three different providers, at
high reasoning effort. If the user's instructions name council members, use
those. Otherwise pick the latest flagship model from each provider, for
example Claude Opus, GPT Sol, and Gemini Pro.

In T3 Code, use `orchestrator_capabilities` to resolve the models, then
`delegate_task` to start one delegate per model in parallel. Elsewhere, use
the harness's subagent tools. If you cannot reach three providers, or a named
member is unavailable, report it instead of substituting.

Give each delegate the request and relevant context. For review or feedback,
keep their work read-only. Collect their responses and summarize the useful
findings, disagreements, and recommended next steps.

For a code review, ask each delegate for a score out of 10.
Count each full review pass as one round.
A fresh review after fixes starts a new round.

If the work ends in a pull request, put the results in the PR description.
Put this section before the model and harness line at the end:

```markdown
## Council review

Rounds: 2

| Delegate | Round 1 | Round 2 |
| --- | --- | --- |
| Opus 5.5 | 7/10 | 9/10 |
| 6.1 Sol | 8/10 | 10/10 |
| Muse Wonder Full | 7/10 | 9.5/10 |
| Grok 4.7 | 7.5/10 | 9/10 |
```

If a delegate gives no score, write `no score`. Do not invent one.
If the PR is open, edit the description. Do not post a comment for this.
If there is no PR, put the same results in the final reply only.

If you agree with their recommendations, make the changes and request a fresh
review after. Continue this process until all delegates are satisfied with the
outcome.

Do not let repeated reviews result in scope creep. It is your job to fight to
keep scope limited.

## Members for Basalt

This is the design-system council. Its members replace the defaults above: four delegates from four
providers, every one at xhigh reasoning effort. Resolve each provider's current flagship with
`orchestrator_capabilities`.

| Member | Provider | Role |
| --- | --- | --- |
| Claude Opus | Claude | Design and reasoning |
| Muse Wonder Full | Muse | Design and reasoning |
| GPT Sol (fast service tier) | Codex | Performance and correctness, plus input on the design primitives |
| Grok | Grok | Judges the work against the standards of the designers at X and SpaceXSI, and brings concrete references to the council: screenshots and measured values, not links |

- Sonnet is not a member. It writes the code, at high effort.
- Every member scores out of 10 in every round, design reviews included.
- `docs/foundations.md` and AGENTS.md stay the contract. The council proposes changes to them; the owner approves with previews in
  both themes before anything merges.
