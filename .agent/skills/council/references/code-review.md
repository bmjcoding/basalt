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
3. **Sort each finding:**
   - **A defect you can verify** (a failing case, a measured regression, a security or correctness fault): fix it, whoever raised it.
   - **A preference that isn't a defect:** apply it only if 3 of 4 raise it.
   - **Anything that changes a rendered pixel the council hasn't decided:** not a fix. Send it to a design round.
4. **Rounds:** one review pass by all four is one round, and a review after fixes is a new round. Stop when a round leaves no blocking
   finding you accept, or after three rounds. List anything still open in the PR description.
5. **Record the scores** in the PR description, before the harness's attribution line. Edit the description; don't post a comment. If
   there's no PR, put the table in your final reply. A member that gives no score gets `no score`; never invent one.

```markdown
## Council review

Rounds: <n>

| Member | Round 1 | <one column per round> |
| --- | --- | --- |
| <slug> (<model as run>) | <score>/10 | … |
```
