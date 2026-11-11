# meter

```
<div class="meter" role="meter" aria-labelledby="m1" aria-valuemin="0" aria-valuemax="3000" aria-valuenow="2240"
     aria-valuetext="2,240 of 3,000 min, Target 2,500 min, 760 min left" style="--value: 74.7%; --target: 83.3%">
  <div class="meter-head"><span class="meter-label" id="m1">Build minutes</span><span class="meter-reading"><span class="meter-value">2,240</span> of 3,000 min</span></div>
  <div class="meter-track"><span class="meter-fill"></span><span class="meter-tick"></span></div>
  <div class="meter-foot"><span class="meter-left">760 min left</span><span class="meter-target">Target 2,500 min</span></div>
</div>
```

How much of a cap is used: a standing reading with units, the cap, what is left and, optionally, a target. Not `.progress` (a task finishing).

- The slot is the cap and never rescales: `--value` and `--target` are percentages of it (the fill stops at the slot's end). Write `aria-valuetext` as the sentence the foot says; it is the spoken reading.
- No target: leave out `.meter-tick` and `.meter-target`. Over the cap the fill stays full and the foot says by how much, in words in primary ink (`<span class="meter-left" data-over>24,000 over</span>`); there is no status colour.
- The foot is always one line, so a change of state never adds one.
