# Basalt implementation status

Assessed from source on main after the completion stack merged through
[PR #9](https://github.com/bmjcoding/basalt/pull/9). Rounds 5–7 are no longer proposed:
forms and overlays landed with [PR #6](https://github.com/bmjcoding/basalt/pull/6),
navigation and composition with [PR #7](https://github.com/bmjcoding/basalt/pull/7), and
the SwiftUI layer and package checks with the rest of that stack. The mineral redesign
is a separate review and is not merged.

| Area | Implemented |
|---|---|
| Foundations | Warm mineral neutrals in both themes, distinct surface steps, semantic text, boundaries, accent roles per `data-brand`, focus, status, chart grammar, syntax, type, spacing, control sizes, radii, layers and motion. |
| Density and touch | Compact control scale, nested density reset, portalled control sizing, 44px labelled targets and 16px touch text entry. |
| Token outputs | DTCG sources generate CSS, exact-key TypeScript, JSON, shadcn aliases and Swift. Contrast, sRGB and theme parity are checked. |
| Actions and forms | Button, IconButton, Field, Input, Textarea, Checkbox, Switch, RadioGroup, Select, Form, Fieldset, Combobox, NumberField and Slider/range. |
| Navigation | Tabs, SegmentedControl, Breadcrumbs, Pagination and Link. |
| Overlays | Menu with checkbox/radio/submenu items, Dialog, AlertDialog, Sheet, Tooltip, Popover and CommandMenu; modal-aware portal layers. |
| Display and composition | Text, Heading, InlineCode, Avatar, Separator, EmptyState, Badge, Card, Table, Kbd and Icon. |
| Feedback and content | Toast, Callout, Progress, Spinner (ring, dots, braille), NumberTicker, Skeleton, syntax-aware CodeBlock, Accordion and ChartGrammar. |
| Apple tokens | SwiftPM for iOS 17+, macOS 14+ and visionOS 1+; bundled Geist, appearance-aware colours, scaled type and motion helpers. |
| Apple components | BasaltUI buttons, icon buttons, labelled text fields/editor, toggles, cards, badges, callouts, progress, empty states and dividers, plus reusable styles. macOS renders verified in both appearances. |
| Distribution | Real npm archives install outside the workspace and pass strict consumer type, runtime, SSR, CSS, font and export checks. React declares its client boundary. Packages remain private and unpublished. |
| Review and reference | Eight offline rounds. Rounds 5–7 are the shipped completion. Round 8 is the mineral redesign, with a brand switch on every round. Every reference family has a guide and live preview, checked in both themes. |

The paused Claude round is finished, and this continuation fills the general-purpose
shared-library gaps identified by the audit. The library is ready for owner review and
local adoption. Implementation and automated verification do not imply that the new
design decisions have already been approved.

## Next steps after review

1. The completion stack is on main. The open review is the mineral redesign: brand accents,
   the warm neutral core, and the craft components. It is not merged.
2. Republish the reference from the generated project when that redesign is accepted.
   The hosted artifact has not been updated.
3. Integrate a real product. Routing, data loading, form persistence and product layouts
   belong to the consuming app. The accent is now `data-brand`, not an app-local colour.
5. Run native interaction and assistive-technology review on a real Apple app. macOS
   rendering is tested here; iOS and visionOS runtime review has not been performed.
6. Choose release versioning and distribution before publishing. npm tarballs are local
   adoption artifacts, not a registry release.

## Deliberately outside this pass

Date/calendar/time-zone pickers, uploads, rich text, a full chart library, virtualized data grids and
full product layouts need concrete product requirements. `ChartGrammar` is the grammar, not that library. They are not unfinished pieces
of the paused session. Custom 16px product icons and Kotlin output remain future work.
The native core is not a one-for-one port of every web overlay; apps should use platform
navigation, menus, sheets and alerts with Basalt tokens as their requirements emerge.
