#if canImport(SwiftUI) && os(macOS)
import AppKit
import SwiftUI
import XCTest
import BasaltTokens
@testable import BasaltUI

@MainActor
final class RenderTests: XCTestCase {
  struct Sample: View {
    var body: some View {
      VStack(alignment: .leading, spacing: Basalt.Space.s4) {
        Text("Sandbox settings").basaltType(Basalt.TypeScale.xl2, weight: .semibold).foregroundStyle(Basalt.Colors.textPrimary.color)
        HStack {
          BasaltButton("Deploy", variant: .primary) {}
          BasaltButton("Cancel") {}
          BasaltButton("Remove", variant: .danger) {}
          BasaltIconButton("Settings", systemImage: "gearshape") {}
          BasaltButton("Disabled") {}.disabled(true)
        }
        BasaltTextField("Sandbox name", text: .constant("blacksand-api"), help: "Lowercase, 3 to 32 characters.")
        BasaltTextField("Route", text: .constant("https://"), error: "Enter a host, for example api.anthropic.com.")
        BasaltTextEditor("Task", text: .constant("Pin the tools image, then start the next run.")).frame(height: 140)
        BasaltToggle("Auto-deploy", isOn: .constant(true))
        BasaltToggle("Verbose logs", isOn: .constant(false))
        BasaltCard {
          Text("blacksand-api").basaltType(Basalt.TypeScale.base, weight: .medium).foregroundStyle(Basalt.Colors.textPrimary.color)
          HStack { BasaltBadge("Ready", status: .success, plain: true); BasaltBadge("Building", status: .warning, plain: true); BasaltBadge("Error", status: .danger, plain: true) }
        }
        BasaltCallout("Route refused", description: "This run isn't allowed to reach that host.", status: .danger)
        BasaltProgress("Building image", value: 0.42)
        BasaltDivider()
        BasaltEmptyState("No runs yet", description: "Start a task to see its record here.", systemImage: "terminal") { BasaltButton("Start task", variant: .primary) {} }
      }
      .padding(Basalt.Space.s6)
      .frame(width: 560)
      .background(Basalt.Colors.surfacePage.color)
    }
  }

  /// One callout per status, as the audit's A5-06 asks to see them (decisions 138 and 139): radius 8, and for success, warning and
  /// danger a rim in the status colour at 45% over the callout's own level. Written to BASALT_SNAPSHOT_DIR for the review round.
  struct CalloutSample: View {
    var body: some View {
      VStack(alignment: .leading, spacing: Basalt.Space.s4) {
        BasaltCallout("Heads up", description: "Runs stop at midnight UTC.", status: .info)
        BasaltCallout("Deploy finished", description: "blacksand-api is live in production.", status: .success)
        BasaltCallout("Quota nearly used", description: "You have used 92% of this month's runs.", status: .warning)
        BasaltCallout("Route refused", description: "This run isn't allowed to reach that host.", status: .danger)
      }
      .padding(Basalt.Space.s6)
      .frame(width: 420)
      .background(Basalt.Colors.surfacePage.color)
    }
  }

  func testCalloutsRenderInBothAppearances() throws {
    Basalt.Fonts.register()
    for (name, appearance, scheme) in [("light", NSAppearance.Name.aqua, ColorScheme.light), ("dark", .darkAqua, .dark)] {
      var png: Data?
      NSAppearance(named: appearance)!.performAsCurrentDrawingAppearance {
        let host = NSHostingView(rootView: CalloutSample().environment(\.colorScheme, scheme))
        host.appearance = NSAppearance(named: appearance)
        host.frame = NSRect(origin: .zero, size: host.fittingSize)
        host.layoutSubtreeIfNeeded()
        if let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) {
          host.cacheDisplay(in: host.bounds, to: rep)
          png = rep.representation(using: .png, properties: [:])
        }
      }
      let data = try XCTUnwrap(png)
      XCTAssertGreaterThan(data.count, 5_000, "\(name) callout render is unexpectedly empty")
      if let dir = ProcessInfo.processInfo.environment["BASALT_SNAPSHOT_DIR"] {
        try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try data.write(to: URL(fileURLWithPath: dir).appendingPathComponent("swiftui-callouts-\(name).png"))
      }
    }
  }

  /// A bitmap of `view` drawn under a named appearance (aqua and dark aqua), and the scale of the bitmap to the view's points.
  private func render<V: View>(_ view: V, appearance name: NSAppearance.Name) throws -> (rep: NSBitmapImageRep, size: CGSize, scale: CGFloat) {
    Basalt.Fonts.register()
    var png: Data?
    var size = CGSize.zero
    let appearance = try XCTUnwrap(NSAppearance(named: name))
    appearance.performAsCurrentDrawingAppearance {
      let host = NSHostingView(rootView: view)
      host.appearance = appearance
      host.frame = NSRect(origin: .zero, size: host.fittingSize)
      host.layoutSubtreeIfNeeded()
      size = host.bounds.size
      if let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) {
        host.cacheDisplay(in: host.bounds, to: rep)
        png = rep.representation(using: .png, properties: [:])
      }
    }
    let rep = try XCTUnwrap(NSBitmapImageRep(data: try XCTUnwrap(png)))
    return (rep, size, CGFloat(rep.pixelsWide) / size.width)
  }

  /// A colour as three sRGB components (BasaltTokens' own RGBA cannot be made outside its module).
  private struct Rgb { var red: Double, green: Double, blue: Double }

  /// The pixel at a point of the view, in sRGB.
  private func pixel(_ image: (rep: NSBitmapImageRep, size: CGSize, scale: CGFloat), x: CGFloat, y: CGFloat) throws -> Rgb {
    let color = try XCTUnwrap(image.rep.colorAt(x: Int(x * image.scale), y: Int(y * image.scale))?.usingColorSpace(.sRGB))
    return Rgb(red: color.redComponent, green: color.greenComponent, blue: color.blueComponent)
  }

  private func rgb(_ color: Basalt.RGBA) -> Rgb { Rgb(red: color.red, green: color.green, blue: color.blue) }

  private func assertColor(_ got: Rgb, _ want: Rgb, _ message: String, file: StaticString = #filePath, line: UInt = #line) {
    XCTAssertEqual(got.red, want.red, accuracy: 0.03, message, file: file, line: line)
    XCTAssertEqual(got.green, want.green, accuracy: 0.03, message, file: file, line: line)
    XCTAssertEqual(got.blue, want.blue, accuracy: 0.03, message, file: file, line: line)
  }

  /// A5-20: under Increase Contrast every Basalt line steps to `line-contrast` and tertiary ink to `ink-contrast` (foundations, "More contrast").
  /// The info callout's edge and a switch's off thumb were the two that did not. Each is read off a real render, in both appearances and both
  /// modes (the increased mode through the views' internal `contrastOverride`: SwiftUI's `colorSchemeContrast` is read-only, and a hosted view,
  /// even in a window, does not take it from a high-contrast appearance).
  func testIncreaseContrastStepsTheInfoCalloutEdgeAndTheSwitchThumb() throws {
    let padding = Basalt.Space.s6
    for (name, dark) in [(NSAppearance.Name.aqua, false), (.darkAqua, true)] {
      for increased in [false, true] {
        let label = "\(dark ? "dark" : "light"), \(increased ? "increased" : "standard") contrast"
        let contrast: ColorSchemeContrast? = increased ? .increased : nil
        // The info callout: its edge is the straight left side, a point in from the page's padding, halfway down.
        var callout = BasaltCallout("Heads up", description: "Runs stop at midnight UTC.", status: .info)
        callout.contrastOverride = contrast
        let drawn = try render(callout.padding(padding).frame(width: 420).background(Basalt.Colors.surfacePage.color), appearance: name)
        // What an edge of that colour looks like at that place, drawn the plain way (a stroke of the token's colour over the callout's level), so the
        // blend of a translucent line over the level is the renderer's, not this test's arithmetic.
        let line = increased ? Basalt.Colors.lineContrast : Basalt.Colors.borderHairline
        let reference = try render(
          RoundedRectangle(cornerRadius: Basalt.Radius.md).fill(Basalt.Colors.surfaceRaised.color).overlay(RoundedRectangle(cornerRadius: Basalt.Radius.md).strokeBorder(line.color))
            .frame(width: drawn.size.width - 2 * padding, height: drawn.size.height - 2 * padding).padding(padding).frame(width: 420).background(Basalt.Colors.surfacePage.color),
          appearance: name)
        assertColor(try pixel(drawn, x: padding + 0.5, y: drawn.size.height / 2), try pixel(reference, x: padding + 0.5, y: drawn.size.height / 2), "info callout's edge, \(label)")
        // The switch, off: the thumb sits at the track's start, which is the view's trailing end.
        var style = BasaltToggleStyle()
        style.contrastOverride = contrast
        let toggle = try render(Toggle("Verbose logs", isOn: .constant(false)).toggleStyle(style).padding(padding).frame(width: 320).background(Basalt.Colors.surfacePage.color), appearance: name)
        let ink = increased ? Basalt.Colors.inkContrast : Basalt.Colors.textTertiary
        let thumbX = 320 - padding - Basalt.Size.switchWidth / 2 - 7
        assertColor(try pixel(toggle, x: thumbX, y: toggle.size.height / 2), rgb(dark ? ink.dark : ink.light), "off thumb, \(label)")
        if increased {
          // And the two are not the standard ones: a render that ignored the mode would pass the lines above only if the tokens were equal.
          XCTAssertNotEqual(Basalt.Colors.lineContrast, Basalt.Colors.borderHairline)
          XCTAssertNotEqual(Basalt.Colors.inkContrast, Basalt.Colors.textTertiary)
        }
      }
    }
  }

  func testNativeComponentsRenderInBothAppearances() throws {
    Basalt.Fonts.register()
    var images: [Data] = []
    for (name, appearance, scheme) in [("light", NSAppearance.Name.aqua, ColorScheme.light), ("dark", .darkAqua, .dark)] {
      var png: Data?
      NSAppearance(named: appearance)!.performAsCurrentDrawingAppearance {
        // ImageRenderer cannot draw AppKit-backed text fields or progress indicators. A real
        // NSHostingView renders those native controls too, without substituting placeholders.
        let host = NSHostingView(rootView: Sample().environment(\.colorScheme, scheme))
        host.appearance = NSAppearance(named: appearance)
        host.frame = NSRect(origin: .zero, size: host.fittingSize)
        host.layoutSubtreeIfNeeded()
        if let rep = host.bitmapImageRepForCachingDisplay(in: host.bounds) {
          host.cacheDisplay(in: host.bounds, to: rep)
          png = rep.representation(using: .png, properties: [:])
        }
      }
      let data = try XCTUnwrap(png)
      let image = try XCTUnwrap(NSBitmapImageRep(data: data))
      XCTAssertGreaterThanOrEqual(image.pixelsWide, 560)
      XCTAssertGreaterThan(image.pixelsHigh, 900)
      XCTAssertGreaterThan(data.count, 10_000, "\(name) render is unexpectedly empty")
      let corner = try XCTUnwrap(image.colorAt(x: 0, y: 0)?.usingColorSpace(.sRGB))
      let expected = name == "dark" ? Basalt.Colors.surfacePage.dark : Basalt.Colors.surfacePage.light
      XCTAssertEqual(corner.redComponent, expected.red, accuracy: 0.01, "The native page did not follow its appearance")
      images.append(data)
      if let dir = ProcessInfo.processInfo.environment["BASALT_SNAPSHOT_DIR"] {
        try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
        try data.write(to: URL(fileURLWithPath: dir).appendingPathComponent("swiftui-components-\(name).png"))
      }
    }
    XCTAssertNotEqual(images[0], images[1], "Native components did not follow the appearance")
  }
}
#endif
