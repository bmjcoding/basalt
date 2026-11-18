#if canImport(SwiftUI)
import SwiftUI

/// A symbol drawn at a design size that follows Dynamic Type, the way the type scale's text does (`Font.custom(_:size:relativeTo:)`): a fixed
/// `.system(size:)` stays 16 or 24 points at the largest accessibility size while the words beside it grow (audit A3-15).
struct BasaltScaledSymbol: ViewModifier {
  @ScaledMetric private var size: CGFloat
  private let weight: Font.Weight

  init(size: CGFloat, weight: Font.Weight, relativeTo style: Font.TextStyle) {
    self._size = ScaledMetric(wrappedValue: size, relativeTo: style)
    self.weight = weight
  }

  func body(content: Content) -> some View { content.font(.system(size: size, weight: weight)) }
}

extension View {
  /// A symbol at `size` points at the default text size, scaling with Dynamic Type relative to `style` (body by default).
  func basaltScaledSymbol(_ size: CGFloat, weight: Font.Weight = .regular, relativeTo style: Font.TextStyle = .body) -> some View {
    modifier(BasaltScaledSymbol(size: size, weight: weight, relativeTo: style))
  }
}
#endif
