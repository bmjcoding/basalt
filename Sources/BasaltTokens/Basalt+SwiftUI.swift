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

  // Palettes (cimip-gaps-3 T9, DECISIONS 403): a palette rides the environment (`.basaltPalette(.beryl)`); with no modifier it is `Basalt.Palettes.basalt`,
  // every hook unset, so a control draws Basalt's own tokens. The resolver returns the palette's value or Basalt's token, and drops the hooks that stand in for
  // a line that steps under Increase Contrast (`colorSchemeContrast == .increased`), as the web's more-contrast block does.
  extension Basalt.Palette {
    /// The hooks that stand in for a line that steps under more contrast: Basalt's own there.
    static let steppingLines: [KeyPath<Basalt.Palette, Basalt.ThemedColor?>] = [
      \.chosenEdge, \.buttonSecondaryEdge, \.buttonSecondaryEdgeHover, \.fieldEdge, \.fieldEdgeHover, \.fieldEdgeActive,
    ]

    /// The palette's colour for `hook`, or nil where it sets none (or where the hook is a stepping line and contrast is increased).
    public func value(_ hook: KeyPath<Basalt.Palette, Basalt.ThemedColor?>, contrast: ColorSchemeContrast = .standard) -> Basalt.ThemedColor? {
      if contrast == .increased && Self.steppingLines.contains(hook) { return nil }
      return self[keyPath: hook]
    }

    /// The palette's colour for `hook`, or Basalt's `token`.
    public func resolve(_ hook: KeyPath<Basalt.Palette, Basalt.ThemedColor?>, or token: Basalt.ThemedColor, contrast: ColorSchemeContrast = .standard) -> Basalt.ThemedColor {
      value(hook, contrast: contrast) ?? token
    }

    /// A Button's corner where Basalt draws `basalt` (`Radius.sm` takes the first step, `Radius.md` the second).
    public func buttonCorner(_ basalt: Double) -> Double {
      basalt == Basalt.Radius.sm ? (buttonRadius ?? basalt) : basalt == Basalt.Radius.md ? (buttonRadiusLarge ?? basalt) : basalt
    }

    /// A field's corner where Basalt draws `basalt`, as `buttonCorner`.
    public func fieldCorner(_ basalt: Double) -> Double {
      basalt == Basalt.Radius.sm ? (fieldRadius ?? basalt) : basalt == Basalt.Radius.md ? (fieldRadiusLarge ?? basalt) : basalt
    }
  }

  private struct BasaltPaletteKey: EnvironmentKey {
    static let defaultValue = Basalt.Palettes.basalt
  }

  extension EnvironmentValues {
    /// The palette the views here are drawn in. `Basalt.Palettes.basalt` (Basalt's own look) unless a view sets one.
    public var basaltPalette: Basalt.Palette {
      get { self[BasaltPaletteKey.self] }
      set { self[BasaltPaletteKey.self] = newValue }
    }
  }

  extension View {
    /// Draws Basalt's controls here in `palette`: its fills, inks, edges, corners and press; never status colours, the focus ring or type.
    public func basaltPalette(_ palette: Basalt.Palette) -> some View {
      environment(\.basaltPalette, palette)
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
