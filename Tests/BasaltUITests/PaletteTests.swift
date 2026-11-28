#if canImport(SwiftUI)
import SwiftUI
import XCTest
import BasaltTokens
@testable import BasaltUI

/// cimip-gaps-3 T9 (DECISIONS 403, test 12): the generated palette, its resolver, and the controls that paint through it. With no palette (Basalt's own) each
/// paint is today's token; with `.beryl` a primary button's fill and ink, a focused field's edge and an on toggle's track and thumb are Beryl's, in both colour
/// schemes (each themed colour holds both), and under Increase Contrast the hooks that stand in for a stepping line are Basalt's again.
final class PaletteTests: XCTestCase {
  let C = Basalt.Colors.self
  let beryl = Basalt.Palettes.beryl
  let basalt = Basalt.Palettes.basalt

  func testTheGeneratedPalettes() {
    XCTAssertEqual(Basalt.Palettes.all.map(\.id), ["basalt", "beryl"])
    XCTAssertNil(basalt.linkInk)
    XCTAssertNil(basalt.buttonPrimaryFill)
    XCTAssertEqual(basalt.pressScale, 0.98)
    XCTAssertEqual(beryl.buttonRadius, 4)
    XCTAssertEqual(beryl.buttonRadiusLarge, 6)
    XCTAssertEqual(beryl.fieldRadius, 4)
    XCTAssertEqual(beryl.fieldRadiusLarge, 6)
    XCTAssertNotNil(beryl.buttonPrimaryFill)
    XCTAssertNil(beryl.chosenFill, "Beryl sets no chosen fill")
    XCTAssertEqual(Basalt.Palettes.named("nope").id, "basalt", "an unknown id is the default")
    XCTAssertEqual(Basalt.Palettes.storageKey, "basalt-palette")
  }

  func testAPressScaleIsClampedBetweenPoint98AndOne() {
    XCTAssertEqual(Basalt.Palette(id: "x", pressScale: 0.5).pressScale, 0.98)
    XCTAssertEqual(Basalt.Palette(id: "x", pressScale: 3).pressScale, 1)
    XCTAssertEqual(Basalt.Palette(id: "x", pressScale: 1).pressScale, 1)
  }

  func testTheResolverDropsSteppingLinesUnderIncreasedContrast() {
    let edge = Basalt.ThemedColor(light: Basalt.RGBA(red: 0.1, green: 0.2, blue: 0.3, alpha: 1), dark: Basalt.RGBA(red: 0.4, green: 0.5, blue: 0.6, alpha: 1))
    let p = Basalt.Palette(id: "x", linkInk: edge, fieldEdge: edge)
    XCTAssertEqual(p.value(\Basalt.Palette.fieldEdge), edge)
    XCTAssertNil(p.value(\Basalt.Palette.fieldEdge, contrast: .increased), "a field edge is a line that steps: Basalt's under more contrast")
    XCTAssertEqual(p.value(\Basalt.Palette.linkInk, contrast: .increased), edge, "an ink that already passed its floor stays")
    XCTAssertEqual(p.resolve(\Basalt.Palette.buttonPrimaryFill, or: C.actionPrimary), C.actionPrimary)
  }

  func testWithNoPaletteEveryPaintIsTodaysToken() {
    for contrast in [ColorSchemeContrast.standard, .increased] {
      let primary = BasaltButtonPaint.of(.primary, size: .md, enabled: true, pressed: false, hovered: false, palette: basalt, contrast: contrast)
      XCTAssertEqual(primary.fill, BasaltPaint(C.actionPrimary))
      XCTAssertEqual(primary.text, BasaltPaint(C.actionPrimaryText))
      XCTAssertEqual(primary.edge, .clear)
      XCTAssertEqual(primary.pressScale, 0.98)
      XCTAssertEqual(primary.radius, BasaltControlSize.md.radius)
      let pressed = BasaltButtonPaint.of(.primary, size: .md, enabled: true, pressed: true, hovered: true, palette: basalt, contrast: contrast)
      XCTAssertEqual(pressed.fill, BasaltPaint(C.actionPrimaryPress))
      let disabled = BasaltButtonPaint.of(.primary, size: .md, enabled: false, pressed: false, hovered: false, palette: basalt, contrast: contrast)
      XCTAssertEqual(disabled.fill, BasaltPaint(C.stateSelected))
      XCTAssertEqual(disabled.text, BasaltPaint(C.textDisabled))
      let secondary = BasaltButtonPaint.of(.secondary, size: .md, enabled: true, pressed: false, hovered: false, palette: basalt, contrast: contrast)
      XCTAssertEqual(secondary.edge, BasaltPaint(contrast == .increased ? C.lineContrast : C.borderHairline))
      XCTAssertEqual(BasaltFieldPaint.of(error: false, focused: true, palette: basalt, contrast: contrast).edge, BasaltPaint(contrast == .increased ? C.fieldContrast : C.borderField))
      let on = BasaltTogglePaint.of(on: true, palette: basalt, contrast: contrast)
      XCTAssertEqual(on.track, BasaltPaint(C.actionPrimary))
      XCTAssertEqual(on.thumb, BasaltPaint(C.actionPrimaryText))
      XCTAssertEqual(on.edge, .clear)
    }
  }

  func testBerylPaintsThroughThePublicModifier() {
    // `.basaltPalette(.beryl)` puts the palette in the environment the controls read.
    var env = EnvironmentValues()
    XCTAssertEqual(env.basaltPalette.id, "basalt")
    env.basaltPalette = beryl
    XCTAssertEqual(env.basaltPalette.id, "beryl")
    _ = BasaltButton("Save", variant: .primary) {}.basaltPalette(.beryl)

    let rest = BasaltButtonPaint.of(.primary, size: .md, enabled: true, pressed: false, hovered: false, palette: beryl, contrast: .standard)
    XCTAssertEqual(rest.fill, BasaltPaint(beryl.buttonPrimaryFill))
    XCTAssertEqual(rest.text, BasaltPaint(beryl.buttonPrimaryInk))
    XCTAssertEqual(rest.radius, 4, "md is Basalt's radius-sm on macOS: Beryl's first step")
    let pressed = BasaltButtonPaint.of(.primary, size: .md, enabled: true, pressed: true, hovered: true, palette: beryl, contrast: .standard)
    XCTAssertEqual(pressed.fill, BasaltPaint(beryl.buttonPrimaryFillPress))
    XCTAssertEqual(pressed.text, BasaltPaint(beryl.buttonPrimaryInk))
    XCTAssertEqual(BasaltButtonPaint.of(.primary, size: .lg, enabled: true, pressed: false, hovered: false, palette: beryl, contrast: .standard).radius, 6)

    let focused = BasaltFieldPaint.of(error: false, focused: true, palette: beryl, contrast: .standard)
    XCTAssertEqual(focused.edge, BasaltPaint(beryl.fieldEdgeActive))
    XCTAssertEqual(BasaltFieldPaint.of(error: true, focused: true, palette: beryl, contrast: .standard).edge, BasaltPaint(C.statusDanger), "an error outranks the active edge")
    XCTAssertEqual(BasaltFieldPaint.of(error: false, focused: true, palette: beryl, contrast: .increased).edge, BasaltPaint(C.fieldContrast), "Increase Contrast: Basalt's field edge")

    let on = BasaltTogglePaint.of(on: true, palette: beryl, contrast: .standard)
    XCTAssertEqual(on.track, BasaltPaint(beryl.checkedFill))
    XCTAssertEqual(on.thumb, BasaltPaint(beryl.checkedInk))

    // Both colour schemes: each themed colour holds Beryl's light and dark values.
    XCTAssertEqual(beryl.buttonPrimaryFill?.light, Basalt.RGBA(red: 0.027451, green: 0.294118, blue: 0.341176, alpha: 1))
    XCTAssertEqual(beryl.buttonPrimaryFill?.dark, Basalt.RGBA(red: 0.278431, green: 0.772549, blue: 0.827451, alpha: 1))
  }

  func testADisabledPrimaryDrawsNoPaletteEdge() {
    let edge = Basalt.ThemedColor(light: Basalt.RGBA(red: 0, green: 0, blue: 0, alpha: 1), dark: Basalt.RGBA(red: 1, green: 1, blue: 1, alpha: 1))
    let p = Basalt.Palette(id: "x", buttonPrimaryFill: edge, buttonPrimaryEdge: edge)
    XCTAssertEqual(BasaltButtonPaint.of(.primary, size: .md, enabled: true, pressed: false, hovered: false, palette: p, contrast: .standard).edge, BasaltPaint(edge))
    XCTAssertEqual(BasaltButtonPaint.of(.primary, size: .md, enabled: false, pressed: false, hovered: false, palette: p, contrast: .standard).edge, .clear)
  }
}
#endif
