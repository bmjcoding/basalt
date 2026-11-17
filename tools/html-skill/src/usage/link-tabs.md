# link-tabs

Tabs that are links: a `nav` of links on a hairline, one current, and under 720 wide a select of the same links. Each link goes to a page, so this is not a `tablist`: no panels, every link a tab stop.

```html
<nav class="link-tabs" aria-label="What it is" data-size="3xl">
  <ul>
    <li><a class="link-tab" href="/shop" aria-current="page"><span>Everything</span><span class="link-tab-line" aria-hidden="true"></span></a></li>
    <li><a class="link-tab" href="/shop/protein"><span>Protein</span><span class="link-tab-line" aria-hidden="true"></span></a></li>
  </ul>
  <div class="link-tabs-select"><span class="select"><span class="link-tabs-select-label" aria-hidden="true">Go to</span><select class="input" data-size="lg" aria-label="Go to Everything">
    <option value="/shop" selected>Everything</option>
    <option value="/shop/protein">Protein</option>
  </select></span></div>
</nav>
```

- Write both, always, with the same links in the same order: CSS shows the row from 720 and the select under it, so nothing moves on load, and the one not shown is out of the Tab order and the accessibility tree. Its `selected` option is the current link.
- The select's height follows the nav's size (36, Castle's 44 for `3xl`, 48 for `5xl`); write `data-size="lg"` on it as above. If a page that routes itself moves `aria-current`, the select follows it.
- `aria-current="page"` on the link of the page you are on; its `.link-tab-line` is the 2px underline. It does not slide.
- Put a link's label in its own `<span>` before `.link-tab-line`. The current one is 600 in primary ink, the rest 400 in secondary, each reserving its 600 width, so nothing moves when `aria-current` moves. Script off, the current one is 600 itself.
- The select navigates at once and says so first: "Go to" is drawn before the current page's name (the text of `.link-tabs-select-label`; replace it there, and in the `aria-label`, which the script then keeps as those words and the chosen page's name). Only a choice from the open list navigates; a key on the closed select (a letter, an arrow, Home, End, a Page key) is held: the value goes back to the current page.
- A choice navigates to its `href`. A page that routes itself listens for `linktabsnavigate` (`detail.href`) and calls `preventDefault()`: focus then stays on the select. Otherwise a new page loads and focus starts over there.
- `data-size` is `3xl` (48) or `5xl` (56); none is 36. The row wraps and never scrolls. A 56 row is 48 in a container narrower than 640.
