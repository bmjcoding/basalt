# runs

```
<ol class="run-stages" aria-label="Deploy 812 stages">
  <li class="run-stage" data-state="failed"><span class="run-mark" data-state="failed" aria-hidden="true"></span>
    <span class="run-stage-name">Test</span><span class="run-stage-word">Failed</span>
    <span class="run-stage-meta">unit and e2e</span><span class="run-stage-time">1.4 s</span>
    <div class="run-stage-detail"><p><strong>3 tests failed</strong> in <code>session.test.ts</code></p><small>Exit 1</small></div></li>
</ol>
```

A run's stages and steps as states (React's StageList, StageRail and RunTimeline's full rows). `data-state` is `queued`, `running`, `success`, `failed`, `skipped`, `canceled` or `retrying`, on the `li` and on its `.run-mark` (always `aria-hidden="true"`: the word says the state).

- **Words:** write every state's word in `.run-stage-word` (a step's in `.run-step-word`). A list draws all but a passed stage's; a rail draws failed, skipped, canceled and retrying, in the place of the time; a step draws queued, failed, skipped, canceled and retrying, so a running or passed step's word goes in a `.visually-hidden` span.
- `<ol class="run-rail">` takes the same `li`, word beside the name (two to four stages; five or six are rows under 480px): the link fills when a stage passes.
- `<ol class="run-steps">` of `<li class="run-step" data-state>`: the mark, `.run-step-sentence`, `.run-step-meta` (its time in `.run-step-time`), an optional `.run-step-detail`. A page shows the whole record: no counter.
- Times are text the page writes. A status that changes is the `status` module's badge, swapped at once. The ring and the queued mark join the hold.
