# tabs

```
<div data-tabs>
  <div class="tabs" role="tablist" aria-label="…">
    <button class="tab" role="tab" id aria-controls aria-selected>…</button>
  </div>
  <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id role="tabpanel" aria-labelledby>…</div>
</div>
```

Every tab has `aria-controls`, every panel `aria-labelledby`. The panel adds no space under the tab bar; set it as above. The script selects a tab on click, and hides the unselected panels when it starts; write `hidden` on them too so the page reads right before it runs. The selected tab keeps its underline, and its label is 600 against 400 for the rest (the script reserves the width). Tabs don't slide their indicator in static files.
