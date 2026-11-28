# toast

Script only: `Basalt.toast({ title, description?, status?, action?, home?, timeout?, group?, running? })` returns an id.

```js
var id = Basalt.toast({ title: 'Sandbox deleted', status: 'success', home: 'centre', action: { label: 'Undo', onClick: undo } });
Basalt.toast.update(id, { title: 'Restored' });
Basalt.toast.close(id);
Basalt.toast.promise(save(), { running: 'Saving…', success: 'Saved', error: 'Could not save' });
```

- `promise` shows its running toast only once the work has run 300ms (a quicker answer shows the result alone), and its result no sooner than 400ms after the running toast entered (`showAfter`, `minShown`).
- An action whose `onClick` returns a promise waits (`Basalt.wait`): presses do nothing until it settles, and that toast's clock and line pause. For Undo, update the toast with `action: undefined` once it has worked (an update keeps the action otherwise); a failed change is an update to `status: 'danger'` with no `home`.

- `status` is `success`, `warning`, `danger` (a mark in the seat and the word); none is neutral. Never tinted.
- **A toast with no `home` stays until dismissed** (it is the only copy). `home` is where the same information lives after it goes: `centre` (a notification entry), `row`, `key`, `page`; with one it closes after 5000ms. An action needs a home other than `page`.
- `group` makes repeats one toast with a count (×2). `running: true` shows work under way; update it to its result.
- Three show at once; hover or focus expands the stack and holds every clock. Danger is announced assertively, the rest politely. Don't build your own.
