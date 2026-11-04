# Basalt implementation status

The core library through round 4 is merged in [PR #5](https://github.com/bmjcoding/basalt/pull/5).
The completion work is proposed as three focused stages.

## Stage 1 · Forms and overlays (round 5)

Form, Fieldset, Combobox, NumberField and scalar/range Slider join the existing labelled
inputs. AlertDialog provides safe confirmation focus; Sheet uses the modal contract in
right, left and bottom panels. Menu adds checkbox, radio and submenu items.

Shared portal layers keep floating controls above their parent modal. Tooltip explicitly
links its accessible description to its trigger. Forced colours retain real boundaries,
and sheets honour reduced motion and device safe areas.

The new APIs have working examples, browser checks, reference guides/previews and the round 5
offline walkthrough. They await owner review; automated checks do not imply design approval.

## Subsequent stages

- Stage 2 adds navigation, typography, avatars, separators and empty states (round 6).
- Stage 3 adds the native SwiftUI core, standalone package verification and the final
  adoption/review documentation (round 7).

Product integration, product accents/icons, hosted reference publication, release
versioning and Apple device interaction review remain separate adoption/release steps.
