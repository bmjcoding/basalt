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

- The page owns the entries, their read state and persistence; call `setEntries` after any change; `onClearAll` adds Clear all. Entries run newest first. An entry with `href` is a link, one without is a button. `time` is the words you write ("2m ago"); `status` is `success`, `warning` or `danger`.
- It is where a toast's `home: 'centre'` lives. Keep an entry's action reachable while it is valid.
- Put it in a bar's end, 32px. The unread count is in the button's name, never drawn.
- On touch a one-line entry is 44 tall, its line centred.
