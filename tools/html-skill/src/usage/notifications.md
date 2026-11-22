# notifications

`Basalt.notifications(host, options)` builds the bell and its popover into an empty element and returns `{ setEntries, open, close }`.

```html
<span id="bell"></span>
<script>
var centre = Basalt.notifications('#bell', {
  entries: [{ id: 'a', title: 'Deploy finished', description: 'api, production', time: '2m ago', status: 'success', unread: true }],
  onSelect: function (entry) {}, onMarkAllRead: function () { /* update unread, then centre.setEntries(next) */ }, viewAllHref: '/notifications'
});
</script>
```

- The page owns the entries and read state; call `setEntries` after a change. Newest first; `href` makes a link, else a button. `time` is your words ("2m ago"); `status`: `success`, `warning`, `danger`, `pending` (waiting; the title says it).
- A group: `entries: [...]` on an entry, its title naming who and what; the row adds "×N" (`count`) and opens to them.
- Home of a toast's `home: 'centre'`. In a bar's end, 32px; the unread count is in the button's name.
