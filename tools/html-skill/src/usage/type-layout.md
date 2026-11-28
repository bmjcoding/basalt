# type-layout

Display type, the page lead, the page row, sections and columns (React's `Heading size="hero"` and `"display"`, `Lead`, `PageRow`, `PageSections`, `PageSection`, `SectionIntro`, `SectionActions` and `Columns`). For a site's pages; a report or data page keeps `.page`, `.section` and `.lead`.

```html
<main class="page-sections">
  <section class="page-section" aria-labelledby="hero">
    <div class="section-intro">
      <h1 class="text-hero" id="hero">Every field note in one plain book.</h1>
      <p class="text-lead">Fieldbook keeps notes, tables and sketches side by side.</p>
      <div class="section-actions"><a class="btn" data-variant="primary" data-size="lg" href="#start">Start a book</a> <a class="btn" data-size="lg" href="#guide">Read the guide</a></div>
    </div>
  </section>
  <section class="page-section" aria-labelledby="kinds">
    <div class="section-intro"><h2 class="text-display" id="kinds">Three kinds of page in one book</h2></div>
    <div class="columns" data-layout="3">…</div>
  </section>
</main>
<footer class="page-row">…</footer>
```

- **Two roles** step at 720 and 1024 on the viewport and never fluidly: `.text-hero` is 96/96, then 72/76 from 720 to 1023, then 44/48; `.text-display` is 72/76, then 56/60, then 36/40. One hero a page, as its `h1` when the first screen is type; display is a section's headline, an inner page's `h1`, and the `h1` of a first screen that shares the window with art or a figure. `.text-6xl` (72/76) and `.text-7xl` (96/96) are the fixed steps the roles are made of, like `.text-5xl`: never write a fixed one for a phone.
- **Display type** is 600 in primary ink, balanced, and at most 13em wide (`--basalt-size-display-measure`), in the full row or a span of 7 columns or more. No `<br>`: two sentences meant as two lines are two `<span class="text-line">` blocks. A word longer than the row breaks (the safety net, never the plan: a headline that needs it has too long a word).
- **`.text-lead`** is the lead under a display headline: `text-xl` 20/28 from 720 and `text-lg` 18/26 under it, 400 in secondary ink, 34rem on the row's start edge. It is not the core's `.lead` (16/24, under a report's `h1`), which stays as it is. In a `.section-intro` it sits `space-6` under the headline (`space-4` under 720) and the buttons `space-8` below it (`space-6`).
- **`.page-row`** is the row (72rem, the gutter inside), the site header's exactly, for a first screen too; art that wants more is full-bleed in a `.stage`. **`.page-sections`** holds the sections one gap apart (`--basalt-section-gap`: 128 from 1024, 96 from 720, 64 under it): the first half a gap below the bar, the last a gap above the footer. A section's `.section-intro` is half a gap above its body. Never give a section the window's height (`vh`, `svh`) or a height to scroll through: the widest empty band on a page is one gap.
- **`.columns`** are twelve tracks on the row, the gutter between them and `space-8` between rows, for pages only (a component answers its own width, with `.grid`). `data-layout` is `2`, `3`, `4`, `7-5`, `5-7`, `8-4` or `4-8`; an item's own span is `style="--span: 7"`, and it counts from 1024 only. From 720 to 1023 the layout decides: `2` and `3` hold, `4` becomes two rows of two, and everything else (the uneven splits, an item's own span, a grid with no `data-layout`) is a full row; under 720 every item takes the full row, in source order.
- **A page before the app** (signed out, no access, a link that expired; never a loading screen): `<main class="message-page"><div class="message-page-body"><h1>…</h1><p>…</p><div class="cluster">…buttons…</div></div></main>`, the page's one `main`, centred, its lines on their start edge. No panel, no header.
