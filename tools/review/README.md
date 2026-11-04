# Review rounds

Every round of component work ends with a walkthrough and screenshots for the owner:

```sh
npm run build
npm run review            # every round, into .review/
npm run review -- 5 6     # forms, navigation and composition
npm run typecheck:review  # validate walkthrough examples
```

For each round, `build.mjs` writes:

- `basalt-round-<n>-walkthrough.html`: one self-contained page that works offline. It has a
  step per component, each with the live component, what to try, and its design decisions.
  Includes a theme switch; Option + arrow keys move between steps.
- `basalt-round-<n>-screenshots.zip`: every step in dark and light at 2x, plus open states
  (menus, dialogs, toasts), and the walkthrough itself.

The build fails if any step logs an error, so a broken demo can't ship.

Add a round to `rounds.tsx` at the end of each review: its steps, the decisions, and what
to try. Rounds without a PR link are shown as awaiting review.

## SwiftUI renders

The macOS CI job renders a sample SwiftUI screen from the tokens in light and dark, and prints
the PNGs into its log. Pull them into a round's assets with:

```sh
node tools/review/fetch-swiftui-renders.mjs <commit-sha> <round>
```
