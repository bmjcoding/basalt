# Basalt implementation status

Assessed from the recovered Claude session, source, tests and distribution checks on
November 3–4, 2026. [PR #5](https://github.com/bmjcoding/basalt/pull/5) is merged at `c050b23`.
Completion rounds 5–7 are implemented and proposed as a stack of signed PRs, awaiting owner
review. [Stage 1 / #6](https://github.com/bmjcoding/basalt/pull/6) covers forms and overlays;
[stage 2 / #7](https://github.com/bmjcoding/basalt/pull/7) covers navigation and composition.
Stage 3 is on `feat/native-and-package-readiness` and adds SwiftUI and distribution checks.

| Area | Implemented |
|---|---|
| Foundations | True-black dark theme, light theme, semantic surfaces, text, boundaries, focus, status, syntax, type, spacing, control sizes, radii, layers and motion. |
| Density and touch | Compact control scale, nested density reset, portalled control sizing, 44px labelled targets and 16px touch text entry. |
| Token outputs | DTCG sources generate CSS, exact-key TypeScript, JSON, shadcn aliases and Swift. Contrast, sRGB and theme parity are checked. |
| Actions and forms | Button, IconButton, Field, Input, Textarea, Checkbox, Switch, RadioGroup, Select, Form, Fieldset, Combobox, NumberField and Slider/range. |
| Navigation | Tabs, SegmentedControl, Breadcrumbs, Pagination and Link. |
| Overlays | Menu with checkbox/radio/submenu items, Dialog, AlertDialog, Sheet, Tooltip, Popover and CommandMenu; modal-aware portal layers. |
| Display and composition | Text, Heading, InlineCode, Avatar, Separator, EmptyState, Badge, Card, Table, Kbd and Icon. |
| Feedback and content | Toast, Callout, Progress, Spinner, Skeleton, syntax-aware CodeBlock and Accordion. |
| Apple tokens | SwiftPM for iOS 17+, macOS 14+ and visionOS 1+; bundled Geist, appearance-aware colours, scaled type and motion helpers. |
| Apple components | BasaltUI buttons, icon buttons, labelled text fields/editor, toggles, cards, badges, callouts, progress, empty states and dividers, plus reusable styles. macOS renders verified in both appearances. |
| Distribution | Real npm archives install outside the workspace and pass strict consumer type, runtime, SSR, CSS, font and export checks. React declares its client boundary. Packages remain private and unpublished. |
| Review and reference | Seven offline rounds; rounds 5–7 are new proposed review material. Every reference family has a guide and live preview, checked in both themes. |

The paused Claude round is finished, and this continuation fills the general-purpose
shared-library gaps identified by the audit. The library is ready for owner review and
local adoption. Implementation and automated verification do not imply that the new
design decisions have already been approved.

## Next steps after review

1. Review [the stage PRs and completion walkthroughs](morning-review.md). Merge stage 1,
   then stage 2, then stage 3; each later PR is based on the preceding stage branch.
2. Let the web and Apple CI jobs pass before merging. Retarget remaining PRs when their
   parent merges. The changes are already signed and pushed for review, not published.
3. Republish the existing Claude Design System reference from the generated project.
   The updated reference is built locally; the hosted artifact has not been updated.
4. Integrate a real product. Product accents, routing, data loading, form persistence,
   announcements after result changes and product layouts belong to the consuming app.
5. Run native interaction and assistive-technology review on a real Apple app. macOS
   rendering is tested here; iOS and visionOS runtime review has not been performed.
6. Choose release versioning and distribution before publishing. npm tarballs are local
   adoption artifacts, not a registry release.

## Known defects for the next round

- **Ctrl / Alt / Shift labels off Apple platforms.** Shortcut chips draw the Apple glyphs
  (⌘ ⌥ ⌃ ⇧) everywhere. Off Apple platforms Ctrl, Alt and Shift should be Geist Mono text
  ("Ctrl", "Alt", "Shift"), read from the platform after mount. Recorded by the kit panel
  (owner decision pending); not built.

## Deliberately outside this pass

Date/calendar/time-zone pickers, uploads, rich text, virtualized data grids and
full product layouts need concrete product requirements. They are not unfinished pieces
of the paused session. `Sparkline` (renamed from `Chart`, which was never released) is a
monochrome line and its latest value, for a live number that needs a shape beside it. It is not
a charting component and has no general chart grammar. `SharedElement` was withdrawn from the
public API by the panel and remains an internal module. Custom 16px product icons and Kotlin output remain future work.
The native core is not a one-for-one port of every web overlay; apps should use platform
navigation, menus, sheets and alerts with Basalt tokens as their requirements emerge.
