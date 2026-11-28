# tabs

```
<div data-tabs>
  <div class="tabs-scroll">
    <div class="tabs" role="tablist" aria-label="…">
      <button class="tab" role="tab" id aria-controls aria-selected>…</button>
    </div>
  </div>
  <div class="tabpanel" style="padding-top: var(--basalt-space-4)" id role="tabpanel" aria-labelledby>…</div>
</div>
```

Every tab has `aria-controls`, every panel `aria-labelledby`. The panel adds no space under the tab bar; set it as above. The script selects a tab on click, and hides the unselected panels when it starts; write `hidden` on them too so the page reads right before it runs. The selected tab keeps its underline, and its label is 600 against 400 for the rest (the script reserves the width). Tabs don't slide their indicator in static files.

`.tabs-scroll` is the row's scrollport: it keeps the focus ring's room, so the ring is outside the tab and a focused tab scrolls fully into view. The script adds it if missing. The first label is on the content line and each tab's box hangs into the padding: leave 12 at the box's start. The underline is as wide as the tab's content.

A reader's change of tab (a click or a key, never the first selection or a script's) dispatches `tabchange` from the `[data-tabs]` root, `detail: { value, tab, panel }` with the panel's `id` as `value`; `Basalt.selectTab(tab or id)` selects with no focus move, scroll, event or write, for a page putting its own state back on `popstate`. The address's fragment selects the panel that is or holds its target on load, at a same-page link's click and on Back and Forward; `data-tabs-hash` on the root mirrors the chosen panel into the fragment by replace, never a push.
