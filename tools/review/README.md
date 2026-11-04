# Review rounds

Every round of component work ends with a walkthrough and screenshots for the owner:

```sh
npm run build
npm run review            # every round, into .review/
npm run review -- 2       # one round
npm run review -- 5 6 7   # completion rounds
npm run typecheck:review  # validate every walkthrough's examples
```

For each round, `build.mjs` writes:

- `basalt-round-<n>-walkthrough.html`: one self-contained page that works offline. It has a
  step per component, each with the live component, what to try, and its design decisions.
  Includes a theme switch; Option + arrow keys move between steps.
- `basalt-round-<n>-screenshots.zip`: every step in dark and light at 2x, plus open states
  (menus, dialogs, toasts), and the walkthrough itself.

The build fails if any step logs an error, so a broken demo can't ship.

Add a round to `rounds.tsx` at the end of each review: its steps, the decisions, and what
to try. A round without a PR link is shown as awaiting owner review. Set `reviewed: false` on
new rounds even when they have a PR link, so the walkthrough never implies design approval
before review has occurred.

## SwiftUI renders

The macOS CI job renders a sample SwiftUI screen from the tokens in light and dark, and prints
the PNGs into its log. Pull them into a round's assets with:

```sh
node tools/review/fetch-swiftui-renders.mjs <commit-sha> <round>
```

For the local native component round, run `BASALT_SNAPSHOT_DIR="$PWD/.review/native"
swift test`, then copy the resulting `swiftui-components-*.png` into `assets/round-7/`
before rebuilding. These images are actual NSHostingView renders, distinct from the
token-only sample used by round 3.
