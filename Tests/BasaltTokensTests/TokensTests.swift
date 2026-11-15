import XCTest

@testable import BasaltTokens

/// The same WCAG checks the web tokens pass, run on the generated Swift values, so a mistake in
/// the conversion can't reach the Apple apps.
final class TokensTests: XCTestCase {
  private func luminance(_ c: Basalt.RGBA) -> Double {
    func lin(_ v: Double) -> Double { v <= 0.04045 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * lin(c.red) + 0.7152 * lin(c.green) + 0.0722 * lin(c.blue)
  }

  /// `top` composited over an opaque `under`, as the screen draws it.
  private func over(_ top: Basalt.RGBA, _ under: Basalt.RGBA) -> Basalt.RGBA {
    let a = top.alpha
    return .init(red: top.red * a + under.red * (1 - a), green: top.green * a + under.green * (1 - a), blue: top.blue * a + under.blue * (1 - a), alpha: 1)
  }

  private func contrast(_ a: Basalt.RGBA, _ b: Basalt.RGBA) -> Double {
    let (x, y) = (luminance(a), luminance(b))
    return (max(x, y) + 0.05) / (min(x, y) + 0.05)
  }

  private let surfaces: [Basalt.ThemedColor] = [
    Basalt.Colors.surfacePage, Basalt.Colors.surfaceRaised, Basalt.Colors.surfaceOverlay,
    Basalt.Colors.surfaceTop, Basalt.Colors.surfaceSunken, Basalt.Colors.surfaceSunkenStrong,
  ]

  private func check(_ fg: Basalt.ThemedColor, atLeast min: Double, _ name: String) {
    for theme in [\Basalt.ThemedColor.light, \Basalt.ThemedColor.dark] {
      for s in surfaces {
        let bg = s[keyPath: theme]
        let r = contrast(over(fg[keyPath: theme], bg), bg)
        XCTAssertGreaterThanOrEqual(r, min, "\(name) is \(String(format: "%.2f", r)):1")
      }
    }
  }

  func testTextMeetsAA() {
    check(Basalt.Colors.textPrimary, atLeast: 4.5, "text-primary")
    check(Basalt.Colors.textSecondary, atLeast: 4.5, "text-secondary")
    check(Basalt.Colors.textTertiary, atLeast: 4.5, "text-tertiary")
    check(Basalt.Colors.statusDanger, atLeast: 4.5, "status-danger")
  }

  func testBoundariesAndFocusMeet3To1() {
    check(Basalt.Colors.borderInput, atLeast: 3, "border-input")
    check(Basalt.Colors.borderFocus, atLeast: 3, "border-focus")
  }

  /// More contrast (decisions 138 and 139): three aliases and no new colour, each holding its contrast on every surface in both themes.
  func testMoreContrastAliasesAreTheColoursTheyNameAndHold() {
    XCTAssertEqual(Basalt.Colors.lineContrast, Basalt.Colors.borderInput)
    XCTAssertEqual(Basalt.Colors.inkContrast, Basalt.Colors.textSecondary)
    XCTAssertEqual(Basalt.Colors.fieldContrast, Basalt.Colors.textSecondary)
    XCTAssertEqual(Basalt.Colors.borderField, Basalt.Colors.borderInput, "outside the mode a field's boundary is the input boundary")
    check(Basalt.Colors.lineContrast, atLeast: 3, "line-contrast")
    check(Basalt.Colors.fieldContrast, atLeast: 3, "field-contrast")
    check(Basalt.Colors.inkContrast, atLeast: 4.5, "ink-contrast")
  }

  func testSyntaxMeetsAA() {
    check(Basalt.Colors.syntaxKeyword, atLeast: 4.5, "syntax-keyword")
    check(Basalt.Colors.syntaxString, atLeast: 4.5, "syntax-string")
    check(Basalt.Colors.syntaxConstant, atLeast: 4.5, "syntax-constant")
    check(Basalt.Colors.syntaxFunction, atLeast: 4.5, "syntax-function")
    check(Basalt.Colors.syntaxComment, atLeast: 4.5, "syntax-comment")
  }

  /// Every accent class is readable (4.5:1) on every surface in both themes, as the web tokens are.
  func testAccentClassesMeetAA() {
    XCTAssertEqual(Basalt.AccentClass.allCases.map(\.rawValue), ["cobalt"])
    for accent in Basalt.AccentClass.allCases {
      check(accent.color, atLeast: 4.5, "accent-\(accent.rawValue)")
    }
  }

  func testThePageIsTheDarkestLayer() {
    for theme in [\Basalt.ThemedColor.light, \Basalt.ThemedColor.dark] {
      let page = luminance(Basalt.Colors.surfacePage[keyPath: theme])
      for s in [Basalt.Colors.surfaceRaised, Basalt.Colors.surfaceOverlay, Basalt.Colors.surfaceTop] {
        XCTAssertGreaterThanOrEqual(luminance(s[keyPath: theme]), page)
      }
    }
  }

  func testDarkSurfaceLevelsStrictlyIncrease() {
    let levels = [Basalt.Colors.surface0, Basalt.Colors.surface1, Basalt.Colors.surface2, Basalt.Colors.surface3].map { luminance($0.dark) }
    XCTAssertEqual(levels, levels.sorted())
    XCTAssertEqual(Set(levels).count, levels.count, "every level is a distinct step")
  }

  func testScales() {
    XCTAssertEqual(Basalt.Space.s4, 16)
    XCTAssertEqual(Basalt.Size.controlMd, 32)
    XCTAssertEqual(Basalt.TypeScale.base, .init(size: 14, lineHeight: 20, tracking: 0))
    XCTAssertEqual(Basalt.Duration.fast, 0.1)
    XCTAssertEqual(Basalt.Easing.out.y1, 1, "entries settle without overshoot")
  }

  func testFontsAreBundled() {
    XCTAssertEqual(Basalt.Fonts.urls.count, 5)
  }

  #if canImport(CoreText)
    func testFontsRegisterUnderTheirPostScriptNames() {
      let available = Basalt.Fonts.register()
      for weight in Basalt.Weight.allCases {
        XCTAssertTrue(available.contains(Basalt.Fonts.postScriptName(weight: weight)), "Geist \(weight) didn't register")
      }
      XCTAssertTrue(available.contains("GeistMono-Regular"))
    }
  #endif
}
