# dlist

```
<dl class="dlist">
  <div><dt>Region</dt><dd>Ashburn (us-east)</dd></div>
  <div><dt>Allowed hosts</dt><dd data-mono>api.example.test</dd><dd data-mono>cdn.example.test</dd></div>
  <div><dt>Last seen</dt><dd data-missing>Not observed</dd></div>
</dl>
```

Facts about one thing, on the page: no panel and no rim (put it in a card only when the card is the object). A `dl` of `div` rows, each one `dt` and one or more `dd`.

- The label column is a fixed 160px; the list stacks (label over value) when its own width, not the viewport's, is under 480px.
- `dd[data-mono]` for identifiers (IDs, hosts, images, addresses); prose and numbers are not mono.
- A fact with no value keeps its row: `<dd data-missing>Not observed</dd>`, tertiary, no mark. Write the words.
- Several values for one label are several `dd`s in its row. A link in a value is a 44 by 44 target on touch.
