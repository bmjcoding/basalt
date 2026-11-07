# Review the Basalt completion stack

Rounds 5–7 have since merged to main, through PR #9. This page describes that stack as it
was reviewed. It is not a list of open proposals. The mineral redesign is a later change;
its decisions are in [foundations](foundations.md), [brands](brands.md) and the changelog.

The completion work shipped as three stages. The original unsigned source/patch bundle remains
an archived pre-PR backup; it does not describe the current Git state.

| Stage | PR / branch | Review scope |
|---|---|---|
| 1 · Round 5 | [PR #6](https://github.com/bmjcoding/basalt/pull/6) → main | Form/Fieldset, Combobox, NumberField, Slider/range, AlertDialog, Sheet, stateful menus, modal portal layers and accessible tooltips. |
| 2 · Round 6 | [PR #7](https://github.com/bmjcoding/basalt/pull/7) → stage 1 | Navigation, typography, Avatar, Separator, EmptyState, pagination semantics and touch targets. |
| 3 · Round 7 | `feat/native-and-package-readiness` → stage 2 | BasaltUI for SwiftUI, exact token types, React client boundary, standalone tarball verification, CI and adoption docs. |

Merge in stage order. Later PRs target the preceding stage branch so their diffs contain
only that stage. Retarget the remaining PRs as parent branches merge. New design decisions
await owner review; a PR link and automated checks do not imply design approval.

## Open the working examples

```sh
npm ci
npx --workspace packages/react playwright install chromium
npm run build
npm run review -- 5 6 7
```

Each `.review/basalt-round-<n>-walkthrough.html` is a self-contained offline page with a theme
switch and working local examples. Download/open it in a browser if the file viewer shows
source. Example actions only update in-memory state; they do not operate on real sandboxes.
Round 5 produces 28 screenshots, round 6 produces 12, and round 7 produces 12.

- Submit the empty form, fill its required fields and submit again. Search the combobox,
  try a disabled option, step the bounded number and adjust each range thumb.
- Check confirmation wording, safe initial focus, outside clicks and Escape. Open a sheet,
  choose its agent, cancel the nested confirmation, then save settings.
- Toggle menu settings and use Export from the keyboard. Compare both themes, navigate
  result pages, inspect avatar initials and clear the no-results search.
- Compare the two actual macOS native renders. Open Route settings and use its Select,
  Menu, Popover and keyboard tooltip to review composition inside a modal task.

See [React usage](../packages/react/README.md), [Apple usage](apple.md) and the
[implementation inventory](status.md) for API details and adoption boundaries.

## Validation by stage

| Stage | Local verification |
|---|---|
| 1 | 101 web/token checks, 66 reference previews, strict walkthrough types, round 5 build and 28 screenshots. |
| 2 | 103 web/token checks, 80 reference previews, strict walkthrough types, round 6 build and 12 screenshots. |
| 3 | 103 web/token checks, 80 reference previews, strict walkthrough types, standalone npm consumer, 9 Swift tests, and round 7 build with 12 screenshots. |

Reproduce the final stage with:

```sh
npm run check
BASALT_SNAPSHOT_DIR="$PWD/.review/native" swift test
npm run review -- 5 6 7
git diff --check
```

The browser checks use pinned Chromium. Open editable-combobox audits cover the active
widget, verify Tab leaves no hidden focused sibling, then audit the full page after close.
Open submenus are audited as active popups, then the full page is audited after dismissal,
so covered background buttons are not treated as partially usable menu targets. Only
Base UI's transient focus guards are excluded globally; other axe rules remain enabled.

The distribution check installs actual token/React archives outside the workspace using
the tested lockfile resolution. It compiles a strict TypeScript consumer and checks exact
token keys, generic form/slider types, runtime imports, SSR, syntax, CSS, fonts and the
React client boundary. Packages remain private at 0.1.0, and no registry release was made.

The native test uses a real NSHostingView because ImageRenderer cannot draw AppKit-backed
entry controls correctly. It checks nonempty output and appearance in both themes, not
golden-image equality or VoiceOver interaction. Local macOS validation does not claim
Apple device or visionOS runtime review. GitHub CI separately checks Linux web and macOS
Swift after each push.

## After review

Review and merge the signed stage commits, then republish the generated Claude reference
and choose release distribution/versioning. The hosted reference has not been updated.
Product integration, data loading/persistence, product accents/icons and Apple device
interaction review are separate adoption steps; they are listed in [status](status.md).

The local pre-PR bundle is `.review/basalt-morning-review.zip`. Its complete unsigned patch
was restored and byte-checked against baseline `c050b23`, including all 44 then-changed
files. It is a backup, not another patch to apply to the current checkout. The live source
now splits walkthroughs into round5.tsx, round6.tsx and round7.tsx to keep the PRs isolated.
