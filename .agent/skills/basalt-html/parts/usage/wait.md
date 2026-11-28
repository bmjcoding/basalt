# wait

Script only: `Basalt.wait(button, work)` makes a `.btn` wait for a promise, as a React Button does. `work` is the promise, or a function that returns one (called only when the button is not already waiting).

```js
save.addEventListener('click', function () { Basalt.wait(save, function () { return send(form); }); });
```

- From the call the button is `aria-busy` and `aria-disabled` (its label, width, ink and focus stay; never set `disabled`), and a second press, Enter or Space calls nothing and submits nothing. The ring shows only after 300ms (`Basalt.wait.SHOW_AFTER`) and stays at least 400ms (`Basalt.wait.MIN_SHOWN`); `{ showAfter, minShown }` change them.
- The answer frees the button at once, either way; a rejection is passed on, so say why on the page. The call returns the promise, or `undefined` when the button was already waiting.
- Static `aria-busy="true"` still shows the ring at once, for work the button did not start.
