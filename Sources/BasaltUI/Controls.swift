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

  var radius: Double { self == .lg || self == .xl ? Basalt.Radius.md : Basalt.Radius.sm }
}

/// Style any native SwiftUI Button with Basalt's variants. Press and hover change colour only.
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
    @State private var hovered = false

    var text: Color {
      if !enabled { return Basalt.Colors.textDisabled.color }
      switch variant {
      case .primary: return Basalt.Colors.actionPrimaryText.color
      case .danger: return Basalt.Colors.statusDanger.color
      case .ghost: return hovered ? Basalt.Colors.textPrimary.color : Basalt.Colors.textSecondary.color
      case .secondary: return Basalt.Colors.textPrimary.color
      }
    }

    var fill: Color {
      if variant == .primary {
        if !enabled { return Basalt.Colors.stateSelected.color }
        return hovered || configuration.isPressed ? Basalt.Colors.actionPrimaryHover.color : Basalt.Colors.actionPrimary.color
      }
      if enabled && configuration.isPressed { return Basalt.Colors.stateSelected.color }
      if enabled && hovered && variant != .secondary { return Basalt.Colors.stateHover.color }
      return variant == .secondary ? Basalt.Colors.surfaceRaised.color : .clear
    }

    var edge: Color {
      if variant == .primary || variant == .ghost { return .clear }
      if variant == .danger && enabled { return Basalt.Colors.statusDanger.color.opacity(hovered ? 0.7 : 0.45) }
      return hovered && enabled ? Basalt.Colors.borderHover.color : Basalt.Colors.borderHairline.color
    }

    var body: some View {
      configuration.label
        .basaltType(size == .xs || size == .sm ? Basalt.TypeScale.sm : size == .xl ? Basalt.TypeScale.md : Basalt.TypeScale.base, weight: .medium)
        .foregroundStyle(text)
        .padding(.horizontal, Basalt.Space.s3)
        .padding(.vertical, size == .xs ? Basalt.Space.s1 : Basalt.Space.s1_5)
        .frame(minWidth: size.minimumHeight, minHeight: size.minimumHeight)
        .background(fill, in: RoundedRectangle(cornerRadius: size.radius))
        .overlay(RoundedRectangle(cornerRadius: size.radius).strokeBorder(edge))
        .basaltFocusRing(focused, radius: size.radius)
        .contentShape(RoundedRectangle(cornerRadius: size.radius))
        .onHover { hovered = $0 }
        .animation(reducedMotion ? nil : .basalt(Basalt.Duration.fast), value: configuration.isPressed)
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
        .background(Basalt.Colors.surfaceRaised.color, in: RoundedRectangle(cornerRadius: Basalt.Radius.sm))
        .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.sm).strokeBorder(error == nil ? Basalt.Colors.borderInput.color : Basalt.Colors.statusDanger.color))
        .basaltFocusRing(focused, radius: Basalt.Radius.sm)
        .accessibilityLabel(Text(title))
        .accessibilityHint(Text(error ?? help ?? ""))
      if let message = error ?? help {
        Text(message).basaltType(Basalt.TypeScale.xs).foregroundStyle(error == nil ? Basalt.Colors.textSecondary.color : Basalt.Colors.statusDanger.color)
      }
    }
  }
}

public struct BasaltTextEditor: View {
  private let title: String
  @Binding private var text: String
  @Environment(\.isEnabled) private var enabled
  @FocusState private var focused: Bool

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
        .background(Basalt.Colors.surfaceRaised.color, in: RoundedRectangle(cornerRadius: Basalt.Radius.sm))
        .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.sm).strokeBorder(Basalt.Colors.borderInput.color))
        .basaltFocusRing(focused, radius: Basalt.Radius.sm)
        .accessibilityLabel(Text(title))
    }
  }
}

public struct BasaltToggleStyle: ToggleStyle {
  public init() {}
  public func makeBody(configuration: Configuration) -> some View { ToggleSurface(configuration: configuration) }

  private struct ToggleSurface: View {
    let configuration: ToggleStyleConfiguration
    @Environment(\.isEnabled) private var enabled
    @Environment(\.accessibilityReduceMotion) private var reducedMotion
    @FocusState private var focused: Bool

    var body: some View {
      Button { configuration.isOn.toggle() } label: {
        HStack(spacing: Basalt.Space.s3) {
          configuration.label.basaltType(Basalt.TypeScale.base).foregroundStyle(enabled ? Basalt.Colors.textPrimary.color : Basalt.Colors.textDisabled.color)
          Spacer(minLength: Basalt.Space.s3)
          Capsule()
            .fill(configuration.isOn ? Basalt.Colors.actionPrimary.color : Basalt.Colors.surfaceRaised.color)
            .frame(width: 32, height: 18)
            .overlay(Capsule().strokeBorder(configuration.isOn ? .clear : Basalt.Colors.borderInput.color))
            .overlay(Circle().fill(configuration.isOn ? Basalt.Colors.actionPrimaryText.color : Basalt.Colors.textTertiary.color).frame(width: 14, height: 14).offset(x: configuration.isOn ? 7 : -7))
            .opacity(enabled ? 1 : 0.5)
        }
        .frame(minHeight: BasaltControlSize.md.minimumHeight)
        .contentShape(Rectangle())
      }
      .buttonStyle(.plain)
      .focused($focused)
      .basaltFocusEffectDisabled()
      .basaltFocusRing(focused, radius: Basalt.Radius.sm)
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
