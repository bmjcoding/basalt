# Basalt on Apple platforms

SwiftPM exposes two products: `BasaltTokens` for platform-neutral design values and
`BasaltUI` for native SwiftUI controls. Deployment targets are iOS 17, macOS 14 and
visionOS 1. Add the local package during this review; the new product is not on main yet.

```swift
import SwiftUI
import BasaltTokens
import BasaltUI

struct SandboxSettings: View {
  @State private var name = "blacksand-api"
  @State private var task = ""
  @State private var automatic = true

  var body: some View {
    VStack(alignment: .leading, spacing: Basalt.Space.s4) {
      BasaltTextField("Sandbox name", text: $name,
        help: "Lowercase, 3 to 32 characters.")
      BasaltTextEditor("Task", text: $task)
      BasaltToggle("Auto-deploy", isOn: $automatic)
      BasaltButton("Save settings", variant: .primary) { save() }
    }
    .padding(Basalt.Space.s6)
    .background(Basalt.Colors.surfacePage.color)
  }

  private func save() { /* validate and persist in the application */ }
}
```

Call `Basalt.Fonts.register()` once at application launch. The token helpers scale Geist
using the platform's type metrics and follow appearance automatically. Use SF Symbols for
system concepts; BasaltIconButton requires an accessible title separate from its symbol.

| Component/style | Use |
|---|---|
| `BasaltButton`, `BasaltButtonStyle` | primary, secondary, ghost, danger; xs–xl. Press changes colour without scaling. `.disabled` propagates. |
| `BasaltIconButton` | A ghost action with a required title and SF Symbol name. |
| `BasaltTextField` | Required visible label, binding, optional prompt/help/error, monochrome focus outline. Validation is supplied by the app. |
| `BasaltTextEditor` | A labelled native editor with a binding, internal scrolling and focus outline. Give it height appropriate to its task. |
| `BasaltToggle`, `BasaltToggleStyle` | Native on/off accessibility representation with a monochrome track and positional state. |
| `BasaltCard`, `BasaltBadge` | Quiet framed content and a status word with optional decorative dot. |
| `BasaltCallout` | Neutral information, success, warning or danger message, optional action builder. It does not post unsolicited announcements. |
| `BasaltProgress`, `BasaltProgressStyle` | Named determinate progress with a visible 4-point track; nil value uses the platform spinner. |
| `BasaltEmptyState` | Heading, explanation, optional SF Symbol and action builder. |
| `BasaltDivider` | Quiet horizontal visual division, hidden from accessibility. |

Use `.buttonStyle(BasaltButtonStyle(.primary))` or `.toggleStyle(BasaltToggleStyle())` to
style an existing native control. Use the tokens for native navigation and other platform
components rather than wrapping web behaviour in SwiftUI. Keep one primary action per
task and pair status colour with words or distinct symbol shapes.

`BasaltControlSize.minimumHeight` retains the 24–40 point desktop scale and enforces
a 44-point floor on iOS and visionOS. Buttons also keep that minimum width. Content can
grow vertically with large type. On macOS, buttons, toggles and inputs draw the same neutral
focus ring as web controls; iOS and visionOS keep the system ring that Full Keyboard Access
draws, so the two never double up. Reduced motion removes custom toggle/press animation.

## Verify

```sh
BASALT_SNAPSHOT_DIR="$PWD/.review/native" swift test
```

The macOS suite checks generated values, font registration and native renders. BasaltUI
uses an actual `NSHostingView` render because `ImageRenderer` cannot render the embedded
AppKit text controls correctly. Both appearances include disabled actions, normal and
invalid inputs, an editor, toggle states, surfaces, status, progress and an empty state.
Tests check image dimensions, appearance colour and nonempty output; the PNGs are also
review artifacts, not pixel-perfect golden snapshots.

This pass verifies macOS compilation and rendering. It does not claim VoiceOver interaction,
simulator, device or visionOS runtime verification. Those checks belong to a consuming
app, alongside native menu/sheet/alert behaviour and persistence.
