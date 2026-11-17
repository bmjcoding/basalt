#if canImport(SwiftUI)
import SwiftUI
import BasaltTokens

public enum BasaltStatus: Sendable, CaseIterable {
  case info, success, warning, danger

  var color: Color {
    switch self {
    case .info: return Basalt.Colors.textSecondary.color
    case .success: return Basalt.Colors.statusSuccess.color
    case .warning: return Basalt.Colors.statusWarning.color
    case .danger: return Basalt.Colors.statusDanger.color
    }
  }
  var symbol: String {
    switch self {
    case .info: return "info.circle"
    case .success: return "checkmark.circle"
    case .warning: return "exclamationmark.triangle"
    case .danger: return "exclamationmark.circle"
    }
  }
}

public struct BasaltCard<Content: View>: View {
  private let content: Content
  @Environment(\.colorSchemeContrast) private var contrast
  public init(@ViewBuilder content: () -> Content) { self.content = content() }

  public var body: some View {
    VStack(alignment: .leading, spacing: Basalt.Space.s4) { content }
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding(Basalt.Space.s4)
      .background(Basalt.Colors.surfaceRaised.color, in: RoundedRectangle(cornerRadius: Basalt.Radius.lg))
      .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.lg).strokeBorder(Basalt.Colors.borderRim.color(contrast, increased: Basalt.Colors.lineContrast)))
      // The rim's top edge is one solid line a little lighter in dark, over the straight part only. No gradient.
      .overlay(alignment: .top) {
        Rectangle().fill(Basalt.Colors.borderRimTop.color(contrast, increased: Basalt.Colors.lineContrast)).frame(height: 1).padding(.horizontal, Basalt.Radius.lg)
      }
  }
}

public struct BasaltBadge: View {
  @Environment(\.colorSchemeContrast) private var contrast
  private let title: String
  private let status: BasaltStatus?
  private let plain: Bool
  public init(_ title: String, status: BasaltStatus? = nil, plain: Bool = false) {
    self.title = title; self.status = status; self.plain = plain
  }

  public var body: some View {
    HStack(spacing: Basalt.Space.s1_5) {
      if let status { Circle().fill(status.color).frame(width: Basalt.Size.dot, height: Basalt.Size.dot).accessibilityHidden(true) }
      Text(title).basaltType(Basalt.TypeScale.xs, weight: .medium).foregroundStyle(Basalt.Colors.textSecondary.color)
    }
    .padding(.horizontal, plain ? 0 : Basalt.Space.s2)
    .padding(.vertical, plain ? 0 : Basalt.Space.s0_5)
    .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.xs).strokeBorder(plain ? .clear : Basalt.Colors.borderHairline.color(contrast, increased: Basalt.Colors.lineContrast)))
    .accessibilityElement(children: .combine)
  }
}

public struct BasaltCallout<Actions: View>: View {
  private let title: String
  private let description: String?
  private let status: BasaltStatus
  private let actions: Actions

  public init(_ title: String, description: String? = nil, status: BasaltStatus = .info, @ViewBuilder actions: () -> Actions) {
    self.title = title; self.description = description; self.status = status; self.actions = actions()
  }

  public var body: some View {
    HStack(alignment: .top, spacing: Basalt.Space.s3) {
      Image(systemName: status.symbol).font(.system(size: 16, weight: .semibold)).foregroundStyle(status.color).accessibilityHidden(true)
      VStack(alignment: .leading, spacing: Basalt.Space.s1) {
        Text(title).basaltType(Basalt.TypeScale.sm, weight: .medium).foregroundStyle(status == .danger ? Basalt.Colors.statusDanger.color : Basalt.Colors.textPrimary.color)
        if let description { Text(description).basaltType(Basalt.TypeScale.sm).foregroundStyle(Basalt.Colors.textSecondary.color) }
        actions
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding(Basalt.Space.s4)
    // Radius 8, as the web callout and foundations have it. Success, warning and danger draw their rim in the status colour at 45%
    // mixed in sRGB over the callout's own level (surfaceRaised), one solid colour on every side; info keeps the neutral hairline.
    .background(Basalt.Colors.surfaceRaised.color, in: RoundedRectangle(cornerRadius: Basalt.Radius.md))
    .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.md).strokeBorder(rim))
  }

  private var rim: Color {
    guard let rim = status.rim else { return Basalt.Colors.borderHairline.color }
    return rim.color
  }
}

extension BasaltStatus {
  /// The callout's rim: the status colour at 45% mixed in sRGB over the callout's own level, in each appearance. Info has none (it
  /// keeps the neutral rim), and a toast takes neither.
  var rim: Basalt.ThemedColor? {
    let base = Basalt.Colors.surfaceRaised
    let status: Basalt.ThemedColor
    switch self {
    case .info: return nil
    case .success: status = Basalt.Colors.statusSuccess
    case .warning: status = Basalt.Colors.statusWarning
    case .danger: status = Basalt.Colors.statusDanger
    }
    return status.mixed(over: base, amount: 0.45)
  }
}

extension BasaltCallout where Actions == EmptyView {
  public init(_ title: String, description: String? = nil, status: BasaltStatus = .info) {
    self.init(title, description: description, status: status) { EmptyView() }
  }
}

public struct BasaltProgress: View {
  private let title: String
  private let value: Double?
  private let total: Double

  public init(_ title: String, value: Double? = nil, total: Double = 1) {
    self.title = title; self.value = value; self.total = total
  }

  public var body: some View {
    ProgressView(title, value: value, total: total)
      .progressViewStyle(BasaltProgressStyle())
      .basaltType(Basalt.TypeScale.sm)
      .foregroundStyle(Basalt.Colors.textPrimary.color)
      .tint(Basalt.Colors.actionPrimary.color)
      .accessibilityLabel(Text(title))
  }
}

public struct BasaltProgressStyle: ProgressViewStyle {
  public init() {}
  public func makeBody(configuration: Configuration) -> some View {
    VStack(alignment: .leading, spacing: Basalt.Space.s1_5) {
      configuration.label
      if let fraction = configuration.fractionCompleted {
        GeometryReader { geometry in
          Capsule().fill(Basalt.Colors.borderInput.color)
            .overlay(alignment: .leading) { Capsule().fill(Basalt.Colors.actionPrimary.color).frame(width: geometry.size.width * min(1, max(0, fraction))) }
        }
        .frame(height: Basalt.Size.track)
      } else {
        ProgressView().progressViewStyle(.circular).controlSize(.small).tint(Basalt.Colors.textSecondary.color)
      }
    }
  }
}

public struct BasaltEmptyState<Actions: View>: View {
  private let title: String
  private let description: String
  private let symbol: String?
  private let actions: Actions

  public init(_ title: String, description: String, systemImage: String? = nil, @ViewBuilder actions: () -> Actions) {
    self.title = title; self.description = description; self.symbol = systemImage; self.actions = actions()
  }

  public var body: some View {
    VStack(spacing: Basalt.Space.s2) {
      if let symbol { Image(systemName: symbol).font(.system(size: 24)).foregroundStyle(Basalt.Colors.textSecondary.color).accessibilityHidden(true) }
      Text(title).basaltType(Basalt.TypeScale.lg, weight: .medium).foregroundStyle(Basalt.Colors.textPrimary.color).accessibilityAddTraits(.isHeader)
      Text(description).basaltType(Basalt.TypeScale.base).foregroundStyle(Basalt.Colors.textSecondary.color)
      actions.padding(.top, Basalt.Space.s3)
    }
    .multilineTextAlignment(.center)
    .frame(maxWidth: .infinity)
    .padding(Basalt.Space.s6)
  }
}

extension BasaltEmptyState where Actions == EmptyView {
  public init(_ title: String, description: String, systemImage: String? = nil) {
    self.init(title, description: description, systemImage: systemImage) { EmptyView() }
  }
}

public struct BasaltDivider: View {
  @Environment(\.colorSchemeContrast) private var contrast
  public init() {}
  public var body: some View { Rectangle().fill(Basalt.Colors.borderDivider.color(contrast, increased: Basalt.Colors.lineContrast)).frame(height: Basalt.Size.hairline).accessibilityHidden(true) }
}
#endif
