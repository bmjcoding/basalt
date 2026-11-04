# Basalt implementation status

The core library through round 4 is merged in [PR #5](https://github.com/bmjcoding/basalt/pull/5).
The completion work is proposed as three focused stages.

## Stage 1 · Forms and overlays (round 5)

[PR #6](https://github.com/bmjcoding/basalt/pull/6) adds Form, Fieldset, Combobox, NumberField,
scalar/range Slider, AlertDialog, Sheet and stateful menus. Shared portal layers keep
floating controls above their parent modal. Tooltip explicitly links its accessible
description to its trigger. Forced colours, motion preferences and device safe areas are
covered by browser checks and the round 5 walkthrough.

## Stage 2 · Navigation and composition (round 6)

Text, Heading and InlineCode use the shared type scale, keeping structural heading levels
independent from visual size. Breadcrumbs, Pagination and Link retain native semantics.
Avatar provides named image/initials fallback; Separator and EmptyState add neutral
composition and next-step guidance. Pagination renders a bounded page window and preserves
44px touch targets. The new APIs have examples, guides, previews, keyboard/semantic checks
and the round 6 walkthrough. This stage builds on stage 1.

## Subsequent stage

Stage 3 adds the native SwiftUI core, standalone package verification and the final
adoption/review documentation (round 7). New design decisions await owner review; passing
automated checks does not imply approval.

Product integration, product accents/icons, hosted reference publication, release
versioning and Apple device interaction review remain separate adoption/release steps.
