# release

A package's changelog or a product's release notes (React's `ReleaseNotes` and `ReleaseIndex`), from the records `tools/changelog` writes. Don't write the markup by hand: run `node tools/changelog/skill-body.mjs --form reference|notes --out body.html` (`--running 1.4.0` marks "Your version") and compose that body. Its words follow the release-words skill.

```html
<div class="release-notes" data-release-form="reference">
  <section class="release" id="v0.2.0" aria-labelledby="v0.2.0-heading">
    <header class="release-head">…the number and date in one h2, the counts, Copy link…</header>
    <div class="callout release-action" data-status="warning" id="v0.2.0-action">…Action needed…</div>
    <section class="release-section"><h3 class="release-section-title">Added<span class="release-count">…</span></h3><ul class="release-list">…</ul></section>
  </section>
</div>
```

- Releases highest first; a release is `#v1.4.0`, an entry its permanent id. Arriving at either opens its folds, scrolls to it, focuses it and marks it "Linked" until the reader acts; a candidate's address opens the release that replaces it (`data-replaces`).
- `data-release-form="reference"`: the list open, only Fixed folds (past 3, in a release of more than 10). `"notes"`: the audience paragraphs lead and the list (with the summary) is one fold, "All changes", or "Other changes" under Action needed.
- Folds are `button.disclosure.release-fold` in their heading, the panel written open: the script closes it (`hidden="until-found"`), so without script and in print everything shows. Never write `hidden` yourself.
- A source line opens a `.release-sources` popover: Pull request, Tickets, Commit, and Author only when the entry has one. Copy link buttons copy the page's own address (`data-base` on `.release-notes`, or the window's) and the fragment.
- The versions: `nav.release-index` in a `.pane-layout`'s pane, and a second one with `data-release-form="fold"` before the notes; each shows only where it belongs.
- Build details sits on the release this session runs, with the running build's rows; never a row from a release.
