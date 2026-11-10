# Code review rounds

Read this when the owner asks the council to review or score code, not to decide a design.

1. **Before you start:**
   - answer outstanding PR comments;
   - fix the issues you already know about;
   - run the checks.

   The council then reviews the current code, not old faults. If the owner wants to throw the code away and explore new ideas, skip
   fixes to code being replaced.
2. **Brief all four.**
   - Copy `assets/review-brief.md` to `MAIN/.review/council/<topic>-review-brief.md` and check it.
   - Start all four with `role: "review"`, read-only.
   - Each returns `<topic>-review/<slug>.md`: findings marked **blocking** or **polish**, the words "no blocking findings" when there
     are none, and a score out of 10.
3. **Sort each finding once,** testing these in order and stopping at the first that fits:
   1. **It would change a rendered pixel,** other than to restore a decided value that was built wrong. Don't apply it, even if 3 of 4
      prefer it. Send it to a design round: a decided pixel reopens only by a new round.
   2. **It's a defect you can verify** (a failing case, a measured regression, a security or correctness fault, or a decided value
      built wrong). Fix it, whoever raised it.
   3. **It's a preference that changes no pixel.** Apply it only if 3 of 4 raise it.
4. **Rounds:** one review pass by all four is one round, and a review after fixes is a new round.
   - **When to stop:** when a round turns up no verifiable defect and no pixel-free preference that 3 of 4 raise, or after three
     rounds, whichever comes first.
   - **What's left:** list it in the PR description, including findings sent to a design round.
5. **Record the scores** in the PR description, before the harness's attribution line. Edit the description; don't post a comment. If
   there's no PR, put the table in your final reply. A member that gives no score gets `no score`; never invent one.

```markdown
## Council review

Rounds: <n>

| Member | Round 1 | <one column per round> |
| --- | --- | --- |
| <slug> (<model as run>) | <score>/10 | … |
```
