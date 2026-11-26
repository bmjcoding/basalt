# rich-text

Type and rhythm for text a renderer made (Markdown, a forge's comment): `<div class="rich-text">` round the elements. It sets no width: put it inside a `.prose` in a card, or bare in a column.

```html
<div class="rich-text">
  <p>Retry the upload with <code>--resume</code>. See <a href="https://example.com/notes">the notes</a>.</p>
  <ul><li>Two loaves</li><li>One jar</li></ul>
</div>
```

- Body 14/20; paragraphs, lists, quotes and `pre` are `space-3` apart; every heading is 14/20 at 600, whatever its level.
- Inline `code` is the sunken chip; a link keeps its line. A long word or address wraps, so it never widens the column.
- Write the elements yourself; never paste a string of untrusted markup. Tables, task lists and footnotes are not styled.
