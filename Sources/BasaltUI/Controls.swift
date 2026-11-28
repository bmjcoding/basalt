#if canImport(SwiftUI)
import SwiftUI
import BasaltTokens

extension View {
  /// Basalt's focus ring, 4pt outside the control. macOS only: iOS and visionOS keep the
  /// system ring that Full Keyboard Access draws, so the two never double up.
  @ViewBuilder func basaltFocusRing(_ focused: Bool, radius: Double) -> some View {
    #if os(macOS)
    overlay(RoundedRectangle(cornerRadius: radius + 4).strokeBorder(focused ? Basalt.Colors.borderFocus.color : .clear, lineWidth: Basalt.Size.focusWidth).padding(-4))
    #else
    self
    #endif
  }

  /// Hides the system focus effect only where Basalt draws its own ring.
  @ViewBuilder func basaltFocusEffectDisabled() -> some View {
    #if os(macOS)
    focusEffectDisabled()
    #else
    self
    #endif
  }
}

/// A colour a control draws: a themed colour at an opacity, or nothing (`clear`). What a control's paint function returns, so a test can ask it.
struct BasaltPaint: Equatable {
  var color: Basalt.ThemedColor?
  var opacity: Double = 1
  static let clear = BasaltPaint(color: nil)
  init(_ color: Basalt.ThemedColor?, opacity: Double = 1) { self.color = color; self.opacity = opacity }
  init(color: Basalt.ThemedColor?) { self.color = color }
  var swiftUI: Color { color.map { opacity == 1 ? $0.color : $0.color.opacity(opacity) } ?? .clear }
}

public enum BasaltButtonVariant: Sendable, CaseIterable {
  case primary, secondary, ghost, danger
}

public enum BasaltControlSize: Sendable, CaseIterable {
  case xs, sm, md, lg, xl

  public var minimumHeight: Double {
    let height: Double
    switch self {
    case .xs: height = Basalt.Size.controlXs
    case .sm: height = Basalt.Size.controlSm
    case .md: height = Basalt.Size.controlMd
    case .lg: height = Basalt.Size.controlLg
    case .xl: height = Basalt.Size.controlXl
    }
    #if os(iOS) || os(visionOS)
    return max(Basalt.Size.tapMin, height)
    #else
    return height
    #endif
  }

  /// Radius follows the box as it is drawn (decision 138): on iOS and visionOS every control is drawn at least 44 tall, so it is 8.
  var radius: Double {
    #if os(iOS) || os(visionOS)
    return Basalt.Radius.md
    #else
    return self == .lg || self == .xl ? Basalt.Radius.md : Basalt.Radius.sm
    #endif
  }

  /// A Button's corner in a palette: its first step where Basalt draws `Radius.sm`, its second where `Radius.md` (cimip-gaps-3 T9).
  func buttonRadius(_ palette: Basalt.Palette) -> Double { palette.buttonCorner(radius) }
  /// A field's corner in a palette, the same way.
  func fieldRadius(_ palette: Basalt.Palette) -> Double { palette.fieldCorner(radius) }
}

/// What a Basalt button draws in one state (cimip-gaps-3 T9): its ink, fill, edge, corner and press scale, from the variant, the state, the palette and the
/// contrast setting. Both colour schemes are in each themed colour. With `Basalt.Palettes.basalt` it is Basalt's own paint.
struct BasaltButtonPaint: Equatable {
  var text: BasaltPaint
  var fill: BasaltPaint
  var edge: BasaltPaint
  var radius: Double
  var pressScale: Double

  static func of(_ variant: BasaltButtonVariant, size: BasaltControlSize, enabled: Bool, pressed: Bool, hovered: Bool, palette: Basalt.Palette, contrast: ColorSchemeContrast) -> BasaltButtonPaint {
    let C = Basalt.Colors.self
    let p = palette
    var text: BasaltPaint
    if !enabled {
      text = BasaltPaint(variant == .primary ? p.resolve(\.buttonPrimaryInkDisabled, or: C.textDisabled) : C.textDisabled)
    } else {
      switch variant {
      case .primary: text = BasaltPaint(p.resolve(\.buttonPrimaryInk, or: C.actionPrimaryText))
      case .danger: text = BasaltPaint(C.statusDanger)
      case .ghost: text = BasaltPaint(hovered ? p.resolve(\.buttonGhostInkHover, or: C.textPrimary) : p.resolve(\.buttonGhostInk, or: C.textSecondary))
      case .secondary: text = BasaltPaint(p.resolve(\.buttonSecondaryInk, or: C.textPrimary))
      }
    }
    var fill: BasaltPaint
    if variant == .primary {
      if !enabled { fill = BasaltPaint(p.resolve(\.buttonPrimaryFillDisabled, or: C.stateSelected)) }
      else if pressed { fill = BasaltPaint(p.resolve(\.buttonPrimaryFillPress, or: C.actionPrimaryPress)) }
      else { fill = BasaltPaint(hovered ? p.resolve(\.buttonPrimaryFillHover, or: C.actionPrimaryHover) : p.resolve(\.buttonPrimaryFill, or: C.actionPrimary)) }
    } else if enabled && pressed {
      fill = BasaltPaint(variant == .secondary ? p.resolve(\.buttonSecondaryFillPress, or: C.stateSelected) : C.stateSelected)
    } else if enabled && hovered && variant != .secondary {
      fill = BasaltPaint(C.stateHover)
    } else {
      fill = variant == .secondary ? BasaltPaint(p.resolve(\.buttonSecondaryFill, or: C.surfaceRaised)) : .clear
    }
    var edge: BasaltPaint
    switch variant {
    case .primary:
      // A palette's primary edge is drawn only while the button is enabled.
      edge = enabled ? BasaltPaint(p.value(\.buttonPrimaryEdge, contrast: contrast)) : .clear
    case .ghost:
      edge = .clear
    case .danger:
      edge = enabled ? BasaltPaint(C.statusDanger, opacity: hovered ? 0.7 : 0.45) : BasaltPaint(contrast == .increased ? C.lineContrast : C.borderHairline)
    case .secondary:
      if hovered && enabled {
        edge = BasaltPaint(p.value(\.buttonSecondaryEdgeHover, contrast: contrast) ?? (contrast == .increased ? C.textSecondary : C.borderHover))
      } else {
        edge = BasaltPaint(p.value(\.buttonSecondaryEdge, contrast: contrast) ?? (contrast == .increased ? C.lineContrast : C.borderHairline))
      }
    }
    return BasaltButtonPaint(text: text, fill: fill, edge: edge, radius: size.buttonRadius(palette), pressScale: palette.pressScale)
  }
}

/// What a Basalt text field's boundary draws (cimip-gaps-3 T9): an error outranks the active edge, which outranks the resting one.
struct BasaltFieldPaint: Equatable {
  var edge: BasaltPaint
  static func of(error: Bool, focused: Bool, palette: Basalt.Palette, contrast: ColorSchemeContrast) -> BasaltFieldPaint {
    if error { return BasaltFieldPaint(edge: BasaltPaint(Basalt.Colors.statusDanger)) }
    let resting = palette.value(\.fieldEdge, contrast: contrast) ?? (contrast == .increased ? Basalt.Colors.fieldContrast : Basalt.Colors.borderField)
    return BasaltFieldPaint(edge: BasaltPaint(focused ? palette.value(\.fieldEdgeActive, contrast: contrast) ?? resting : resting))
  }
}

/// What a Basalt switch draws (cimip-gaps-3 T9): on, the track is the checked fill, the thumb the checked ink, and the checked edge a hairline when set.
struct BasaltTogglePaint: Equatable {
  var track: BasaltPaint
  var thumb: BasaltPaint
  var edge: BasaltPaint
  static func of(on: Bool, palette: Basalt.Palette, contrast: ColorSchemeContrast) -> BasaltTogglePaint {
    let C = Basalt.Colors.self
    if on {
      return BasaltTogglePaint(track: BasaltPaint(palette.resolve(\.checkedFill, or: C.actionPrimary)), thumb: BasaltPaint(palette.resolve(\.checkedInk, or: C.actionPrimaryText)), edge: BasaltPaint(palette.value(\.checkedEdge, contrast: contrast)))
    }
    return BasaltTogglePaint(track: BasaltPaint(C.surfaceRaised), thumb: BasaltPaint(contrast == .increased ? C.inkContrast : C.textTertiary), edge: BasaltPaint(contrast == .increased ? C.fieldContrast : C.borderField))
  }
}

/// Style any native SwiftUI Button with Basalt's variants. Hover is a colour step. A press is a colour step
/// and a scale to 0.98 over `Basalt.Duration.fast` on ease-out: not under Reduce Motion, not when disabled.
public struct BasaltButtonStyle: ButtonStyle {
  public var variant: BasaltButtonVariant
  public var size: BasaltControlSize

  public init(_ variant: BasaltButtonVariant = .secondary, size: BasaltControlSize = .md) {
    self.variant = variant
    self.size = size
  }

  public func makeBody(configuration: Configuration) -> some View {
    ButtonSurface(configuration: configuration, variant: variant, size: size)
  }

  private struct ButtonSurface: View {
    let configuration: ButtonStyleConfiguration
    let variant: BasaltButtonVariant
    let size: BasaltControlSize
    @Environment(\.isEnabled) private var enabled
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    @Environment(\.isFocused) private var focused
    @Environment(\.colorSchemeContrast) private var contrast
    @Environment(\.basaltPalette) private var palette
    @State private var hovered = false

    var paint: BasaltButtonPaint {
      BasaltButtonPaint.of(variant, size: size, enabled: enabled, pressed: configuration.isPressed, hovered: hovered, palette: palette, contrast: contrast)
    }

    var text: Color { paint.text.swiftUI }
    var fill: Color { paint.fill.swiftUI }
    var edge: Color { paint.edge.swiftUI }

    var body: some View {
      configuration.label
        .basaltType(size == .xs || size == .sm ? Basalt.TypeScale.sm : size == .xl ? Basalt.TypeScale.md : Basalt.TypeScale.base, weight: .medium)
        .foregroundStyle(text)
        .padding(.horizontal, Basalt.Space.s3)
        .padding(.vertical, size == .xs ? Basalt.Space.s1 : Basalt.Space.s1_5)
        .frame(minWidth: size.minimumHeight, minHeight: size.minimumHeight)
        .background(fill, in: RoundedRectangle(cornerRadius: paint.radius))
        .overlay(RoundedRectangle(cornerRadius: paint.radius).strokeBorder(edge))
        .basaltFocusRing(focused, radius: paint.radius)
        .scaleEffect(enabled && configuration.isPressed && !reducedMotion ? paint.pressScale : 1)
        .animation(reducedMotion ? nil : .basalt(Basalt.Duration.fast), value: configuration.isPressed)
        // The hit shape goes on after the scale: scaleEffect keeps the layout size, so the target stays its full rest size
        // (44pt on iOS) while the drawn surface shrinks, as the web's pressed ::after does.
        .contentShape(RoundedRectangle(cornerRadius: paint.radius))
        .onHover { hovered = $0 }
    }
  }
}

public struct BasaltButton: View {
  private let title: String
  private let variant: BasaltButtonVariant
  private let size: BasaltControlSize
  private let action: () -> Void

  public init(_ title: String, variant: BasaltButtonVariant = .secondary, size: BasaltControlSize = .md, action: @escaping () -> Void) {
    self.title = title; self.variant = variant; self.size = size; self.action = action
  }

  public var body: some View {
    Button(title, action: action).buttonStyle(BasaltButtonStyle(variant, size: size)).basaltFocusEffectDisabled()
  }
}

/// System concepts use SF Symbols. The accessible label is required.
public struct BasaltIconButton: View {
  private let title: String
  private let symbol: String
  private let action: () -> Void

  public init(_ title: String, systemImage: String, action: @escaping () -> Void) {
    self.title = title; self.symbol = systemImage; self.action = action
  }

  public var body: some View {
    Button(action: action) { Image(systemName: symbol).frame(minWidth: 16) }
      .buttonStyle(BasaltButtonStyle(.ghost))
      .basaltFocusEffectDisabled()
      .accessibilityLabel(Text(title))
  }
}

public struct BasaltTextField: View {
  private let title: String
  @Binding private var text: String
  private let help: String?
  private let error: String?
  private let prompt: String?
  @Environment(\.isEnabled) private var enabled
  @Environment(\.colorSchemeContrast) private var contrast
  @Environment(\.basaltPalette) private var palette
  @FocusState private var focused: Bool

  public init(_ title: String, text: Binding<String>, prompt: String? = nil, help: String? = nil, error: String? = nil) {
    self.title = title; self._text = text; self.prompt = prompt; self.help = help; self.error = error
  }

  public var body: some View {
    VStack(alignment: .leading, spacing: Basalt.Space.s1_5) {
      Text(title).basaltType(Basalt.TypeScale.sm, weight: .medium).foregroundStyle(Basalt.Colors.textPrimary.color)
      TextField(title, text: $text, prompt: prompt.map { Text($0) })
        .focused($focused)
        .basaltFocusEffectDisabled()
        .textFieldStyle(.plain)
        .basaltType(Basalt.TypeScale.base)
        .foregroundStyle(enabled ? Basalt.Colors.textPrimary.color : Basalt.Colors.textDisabled.color)
        .padding(.horizontal, Basalt.Space.s3)
        .padding(.vertical, Basalt.Space.s1_5)
        .frame(minHeight: BasaltControlSize.md.minimumHeight)
        .background(Basalt.Colors.surfaceRaised.color, in: RoundedRectangle(cornerRadius: BasaltControlSize.md.fieldRadius(palette)))
        .overlay(RoundedRectangle(cornerRadius: BasaltControlSize.md.fieldRadius(palette)).strokeBorder(BasaltFieldPaint.of(error: error != nil, focused: focused, palette: palette, contrast: contrast).edge.swiftUI))
        .basaltFocusRing(focused, radius: BasaltControlSize.md.fieldRadius(palette))
        .accessibilityLabel(Text(title))
        .accessibilityHint(Text(Self.hint(help: help, error: error) ?? ""))
      if let message = error ?? help {
        // The message is an element of its own, read after the field. An error is never the field's hint: a hint says what the control does.
        Text(message).basaltType(Basalt.TypeScale.xs).foregroundStyle(error == nil ? Basalt.Colors.textSecondary.color : Basalt.Colors.statusDanger.color)
      }
    }
    // A new error is said when it arrives (the field and its message are not together on the screen reader's cursor).
    .onChange(of: error) { _, new in if let new { AccessibilityNotification.Announcement(new).post() } }
  }

  /// What the field's accessibility hint says: its help text. An error is not a hint (Apple's guidance: a hint describes the result of acting on the
  /// control); it is the message element below the field, and is announced when it arrives.
  static func hint(help: String?, error: String?) -> String? { error == nil ? help : nil }
}

public struct BasaltTextEditor: View {
  private let title: String
  @Binding private var text: String
  @Environment(\.isEnabled) private var enabled
  @Environment(\.colorSchemeContrast) private var contrast
  @Environment(\.basaltPalette) private var palette
  @FocusState private var focused: Bool

  /// The editor is at least 100 tall, a box of 36 and up, so its fill, boundary and ring are radius 8 on every platform (decision 149).
  static let radius = Basalt.Radius.md

  public init(_ title: String, text: Binding<String>) { self.title = title; self._text = text }

  public var body: some View {
    VStack(alignment: .leading, spacing: Basalt.Space.s1_5) {
      Text(title).basaltType(Basalt.TypeScale.sm, weight: .medium).foregroundStyle(Basalt.Colors.textPrimary.color)
      TextEditor(text: $text)
        .focused($focused)
        .basaltFocusEffectDisabled()
        .basaltType(Basalt.TypeScale.base)
        .foregroundStyle(enabled ? Basalt.Colors.textPrimary.color : Basalt.Colors.textDisabled.color)
        .scrollContentBackground(.hidden)
        .padding(Basalt.Space.s2)
        .frame(minHeight: 100)
        .background(Basalt.Colors.surfaceRaised.color, in: RoundedRectangle(cornerRadius: palette.fieldCorner(Self.radius)))
        .overlay(RoundedRectangle(cornerRadius: palette.fieldCorner(Self.radius)).strokeBorder(BasaltFieldPaint.of(error: false, focused: focused, palette: palette, contrast: contrast).edge.swiftUI))
        .basaltFocusRing(focused, radius: palette.fieldCorner(Self.radius))
        .accessibilityLabel(Text(title))
    }
  }
}

public struct BasaltToggleStyle: ToggleStyle {
  public init() {}
  /// For the tests, which render the increased mode with it (see `BasaltCallout`). Internal, so no app sees it.
  var contrastOverride: ColorSchemeContrast?
  public func makeBody(configuration: Configuration) -> some View { ToggleSurface(configuration: configuration, contrastOverride: contrastOverride) }

  private struct ToggleSurface: View {
    let configuration: ToggleStyleConfiguration
    let contrastOverride: ColorSchemeContrast?
    @Environment(\.isEnabled) private var enabled
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    @Environment(\.colorSchemeContrast) private var systemContrast
    @Environment(\.basaltPalette) private var palette
    private var contrast: ColorSchemeContrast { contrastOverride ?? systemContrast }
    private var paint: BasaltTogglePaint { BasaltTogglePaint.of(on: configuration.isOn, palette: palette, contrast: contrast) }
    @FocusState private var focused: Bool

    var body: some View {
      Button { configuration.isOn.toggle() } label: {
        HStack(spacing: Basalt.Space.s3) {
          configuration.label.basaltType(Basalt.TypeScale.base).foregroundStyle(enabled ? Basalt.Colors.textPrimary.color : Basalt.Colors.textDisabled.color)
          Spacer(minLength: Basalt.Space.s3)
          Capsule()
            .fill(paint.track.swiftUI)
            .frame(width: Basalt.Size.switchWidth, height: Basalt.Size.switchHeight)
            .overlay(Capsule().strokeBorder(paint.edge.swiftUI))
            .overlay(Circle().fill(paint.thumb.swiftUI).frame(width: Basalt.Size.switchThumb, height: Basalt.Size.switchThumb).offset(x: configuration.isOn ? 7 : -7))
            .opacity(enabled ? 1 : 0.5)
        }
        .frame(minHeight: BasaltControlSize.md.minimumHeight)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .focused($focused)
      .basaltFocusEffectDisabled()
      .basaltFocusRing(focused, radius: BasaltControlSize.md.radius)
      .animation(reducedMotion ? nil : .basalt(Basalt.Duration.fast), value: configuration.isOn)
      .accessibilityRepresentation { Toggle(isOn: configuration.$isOn) { configuration.label }.toggleStyle(.switch) }
    }
  }
}

public struct BasaltToggle: View {
  private let title: String
  @Binding private var isOn: Bool

  public init(_ title: String, isOn: Binding<Bool>) { self.title = title; self._isOn = isOn }
  public var body: some View { Toggle(title, isOn: $isOn).toggleStyle(BasaltToggleStyle()) }
}
#endif
