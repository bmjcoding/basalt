# links

`ul.links > li > a`: a social link, the glyph then the service's name. Any `target="_blank"` link gets the new-tab arrow from the script.

```html
<ul class="links" aria-label="Elsewhere">
  <li><a href="https://example.test/gh"><i data-icon="GithubLogo"></i>GitHub</a></li>
  <li><a href="https://example.test/sub">Substack</a></li>
</ul>
```

- **Glyphs** (Phosphor Bold, quoted names): GithubLogo, XLogo, LinkedinLogo, InstagramLogo, YoutubeLogo, EnvelopeSimple (email). A service without a mark (Substack, Bluesky, any other) is the word alone: no glyph, no stand-in, no empty seat, never a brand's own mark.
- **The link:** secondary ink, primary on hover and focus, the name underlined and the glyph not. The visible name is the accessible name; the link takes its container's text size (a footer's 13px, a profile's 14px). Same tab by default.
- **Beside 18 to 24px text** put `data-size="20"` on the `ul`: the glyphs become 20.
- **Touch:** each link is at least 44 by 44, wrapped lines touch and never overlap.
- **Icon only,** for a row made entirely of marks (an author card): `<ul class="links" data-icon-only aria-label="Elsewhere">` with `<li><a class="btn" data-variant="ghost" data-icon-only href aria-label="GitHub"><i data-icon="GithubLogo"></i></a></li>`. The first link takes `data-edge="start"`: in a `.card` its glyph sits on the card's line. A row that needs Email or a service without a mark is the labelled row.
- **New tab:** `target="_blank"` draws the arrow after the name and adds "(opens in a new tab)" to the name (`data-new-tab-label="words"` translates it); `mailto:` gets no arrow, and neither does an icon-only link, whose name takes the words. Never write the arrow or the words yourself.
- The long form, a profile list with handles, is a `rows` list: `--usage rows`.
- Not in the top bar.
