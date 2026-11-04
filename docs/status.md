# Basalt implementation status

Assessed from the recovered Claude session and the repository on November 3, 2026. This
describes the core library, including the Round 4 changes in [PR #5](https://github.com/bmjcoding/basalt/pull/5).

| Area | Implemented |
|---|---|
| Foundations | True-black dark theme, light theme, semantic surfaces, text, boundaries, focus, status, type, spacing, control sizes, radii, layers and motion. |
| Density and touch | Compact control scale, resettable density scopes, portalled menu sizing, complete Select size scale, and 44px labelled touch targets; text entry avoids iOS focus zoom. |
| Token outputs | DTCG sources generate CSS, TypeScript, JSON, shadcn aliases and Swift. Contrast, sRGB gamut and theme parity checks run in CI. |
| Actions and forms | Button, IconButton, Field, Input, Textarea, Checkbox, Switch, RadioGroup and Select. |
| Navigation and overlays | Tabs, SegmentedControl, Menu, Dialog, Tooltip, Popover and CommandMenu. |
| Display and feedback | Badge, Card, Table, Kbd, Icon, Toast, Callout, Progress, Spinner, Skeleton, CodeBlock and Accordion. |
| Syntax | Twelve editor grammars, theme-aware semantic colours, plain-text fallback, original-text copying, server rendering and offline use. |
| Apple foundation | SwiftPM package for iOS 17+, macOS 14+ and visionOS 1+, bundled Geist, appearance-aware colours, type and motion helpers; tested with SwiftUI renders. |
| Review materials | Offline interactive walkthroughs and screenshot archives for rounds 1–4, generated from the real components. Round 4 includes syntax samples. |
| Reference | Generated guides and live previews from the same tokens and components; checked in both themes. |

The core foundation has no known unfinished implementation from the paused round. The
continuation fixes Textarea's integration with Field, completes density and touch sizing,
and adds the syntax highlighting requested just before Claude reached its usage limit.

## Remaining work

- **Round 4 delivery.** PR #5 tracks this implementation. Its walkthrough and screenshots
  can be generated with `npm run build && npm run review -- 4`.
- **Republish the Claude Design System reference after merge.** The recovered session says
  the hosted reference still shows rounds 1 and 2. The repository can build the full reference
  with `npm run artifact`; publishing to that existing Claude artifact is a separate step.
- **Integrate a real product.** Blacksand, the sites and N1 still need to consume the packages
  and establish product accents. This is where additional components should be justified.
- **Native components.** The Apple package provides tokens and helpers, not a SwiftUI
  component library. Build native components around a real Apple app's flows. Kotlin output
  was explicitly deferred until an Android app needs it.
- **Custom product icons.** Phosphor covers the shared interface. Custom 16px icons for
  sandboxes, routes and environments were discussed as future product work.
- **Distribution.** npm packages remain private workspace packages. Versioning, publishing
  and a public reference site are separate release work.

There is no recorded, approved backlog requiring every component from Base UI or shadcn.
Searchable selection, number fields, drawers, date inputs, pagination and product layouts
can be added when a product flow needs them; they are not hidden prerequisites for using
the existing foundation.
