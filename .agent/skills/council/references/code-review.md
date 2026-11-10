# Code review rounds

Read this when the owner asks the council to review or score code, not to decide a design.

1. **Before the review:** answer outstanding PR comments, fix the issues you already know about, and run the checks. Give the council the
   updated implementation, so it doesn't spend a round on known faults. If the owner wants to discard the implementation and explore
   new ideas, skip fixes to code being replaced.
2. **Start all four members in parallel,** read-only, each in its own worktree. Give each the request, the PR or diff, and the context
   it needs. Ask each for a score out of 10.
3. **Rounds:** one full review pass by all four is one round. A fresh review after fixes is a new round.
4. **Collect the findings:** what's useful, where members disagree, and what to do next.
   - Make the changes you agree with, then ask for a fresh round.
   - Continue until every member is satisfied.
   - Hold the scope: repeated reviews tend to grow it, and limiting that is your job.
5. **Record the scores** in the PR description, before the model and harness line. Edit the description; don't post a comment. If there's
   no PR, put the table in your final reply. If a member gives no score, write `no score`; never invent one.

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
