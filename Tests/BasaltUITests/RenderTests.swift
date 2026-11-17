#if canImport(SwiftUI) && os(macOS)
import AppKit
import SwiftUI
import XCTest
import BasaltTokens
import BasaltUI

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
