// SwiftUI helpers over the generated tokens: colours that follow the system appearance,
// Geist at Basalt's type scale, and animations on Basalt's curves.

#if canImport(SwiftUI)
  import SwiftUI

  #if canImport(UIKit)
    import UIKit
  #elseif canImport(AppKit)
    import AppKit
  #endif

  extension Basalt.RGBA {
    /// This colour, fixed (it doesn't follow the appearance).
    public var color: Color { Color(.sRGB, red: red, green: green, blue: blue, opacity: alpha) }

    #if canImport(UIKit)
      var platformColor: UIColor { UIColor(red: red, green: green, blue: blue, alpha: alpha) }
    #elseif canImport(AppKit)
      var platformColor: NSColor { NSColor(srgbRed: red, green: green, blue: blue, alpha: alpha) }
    #endif
  }

  extension Basalt.ThemedColor {
    /// This colour, following the system's light or dark appearance.
    public var color: Color {
      #if canImport(UIKit)
        let light = light.platformColor, dark = dark.platformColor
        return Color(UIColor { $0.userInterfaceStyle == .dark ? dark : light })
      #elseif canImport(AppKit)
        let light = light.platformColor, dark = dark.platformColor
        return Color(NSColor(name: nil) { appearance in
          appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light
        })
      #else
        return light.color
      #endif
    }
  }

  extension Basalt.ThemedColor {
    /// This colour, or `increased` when a person has asked for more contrast (Increase Contrast, which SwiftUI reads as
    /// `colorSchemeContrast == .increased`). Three aliases and no new colour: lines step to `Basalt.Colors.lineContrast`, tertiary
    /// ink to `inkContrast` and a field's boundary to `fieldContrast` (decisions 138 and 139; the web does the same under
    /// `prefers-contrast: more`).
    public func color(_ contrast: ColorSchemeContrast, increased: Basalt.ThemedColor) -> Color {
      contrast == .increased ? increased.color : color
    }
  }

  extension Font {
    /// Geist at a Basalt type step. Scales with Dynamic Type relative to `textStyle`.
    /// Register the fonts first: `Basalt.Fonts.register()`.
    public static func basalt(
      _ style: Basalt.TypeStyle,
      weight: Basalt.Weight = .regular,
      mono: Bool = false,
      relativeTo textStyle: Font.TextStyle = .body
    ) -> Font {
      .custom(Basalt.Fonts.postScriptName(weight: weight, mono: mono), size: style.size, relativeTo: textStyle)
    }
  }

  extension View {
    /// Sets Geist at a Basalt type step, with its tracking. SwiftUI sets line height through the
    /// font, so the step's line height is approximated by spacing between lines.
    public func basaltType(
      _ style: Basalt.TypeStyle,
      weight: Basalt.Weight = .regular,
      mono: Bool = false,
      relativeTo textStyle: Font.TextStyle = .body
    ) -> some View {
      font(.basalt(style, weight: weight, mono: mono, relativeTo: textStyle))
        .tracking(style.tracking * style.size)
        .lineSpacing(max(0, style.lineHeight - style.size * 1.2))
    }
  }

  extension Animation {
    /// An animation on a Basalt curve: entries ease out, exits ease in at 0.75 of the entry.
    public static func basalt(_ duration: Double, curve: Basalt.Curve = Basalt.Easing.out) -> Animation {
      .timingCurve(curve.x1, curve.y1, curve.x2, curve.y2, duration: duration)
    }
  }
#endif
