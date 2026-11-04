#if canImport(SwiftUI) && os(macOS)
  import AppKit
  import SwiftUI
  import XCTest

  @testable import BasaltTokens

  /// Renders a sample screen built only from Basalt tokens, in light and dark, with Apple's own
  /// renderer. With BASALT_SNAPSHOT_DIR set (CI does), writes the PNGs there for review.
  @MainActor
  final class SnapshotTests: XCTestCase {
    struct Sample: View {
      var body: some View {
        VStack(alignment: .leading, spacing: Basalt.Space.s4) {
          Text("Sandboxes")
            .basaltType(Basalt.TypeScale.xl3, weight: .semibold, relativeTo: .largeTitle)
            .foregroundStyle(Basalt.Colors.textPrimary.color)

          VStack(alignment: .leading, spacing: Basalt.Space.s1) {
            Text("blacksand-api")
              .basaltType(Basalt.TypeScale.base, weight: .semibold)
              .foregroundStyle(Basalt.Colors.textPrimary.color)
            Text("k3s · single node · 3 sandboxes")
              .basaltType(Basalt.TypeScale.sm)
              .foregroundStyle(Basalt.Colors.textSecondary.color)
            HStack(spacing: Basalt.Space.s1_5) {
              Circle().fill(Basalt.Colors.statusSuccess.color).frame(width: 6, height: 6)
              Text("Ready").basaltType(Basalt.TypeScale.sm).foregroundStyle(Basalt.Colors.textSecondary.color)
              Text("a81f3c2").basaltType(Basalt.TypeScale.xs, mono: true).foregroundStyle(Basalt.Colors.textTertiary.color)
            }
            .padding(.top, Basalt.Space.s2)
          }
          .padding(Basalt.Space.s4)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Basalt.Colors.surfaceRaised.color, in: .rect(cornerRadius: Basalt.Radius.lg))
          .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.lg).strokeBorder(Basalt.Colors.borderHairline.color))

          HStack(spacing: Basalt.Space.s2) {
            Spacer()
            Text("Cancel")
              .basaltType(Basalt.TypeScale.base, weight: .medium)
              .foregroundStyle(Basalt.Colors.textPrimary.color)
              .padding(.horizontal, Basalt.Space.s3)
              .frame(height: Basalt.Size.controlMd)
              .background(Basalt.Colors.surfaceRaised.color, in: .rect(cornerRadius: Basalt.Radius.sm))
              .overlay(RoundedRectangle(cornerRadius: Basalt.Radius.sm).strokeBorder(Basalt.Colors.borderHairline.color))
            Text("Deploy")
              .basaltType(Basalt.TypeScale.base, weight: .medium)
              .foregroundStyle(Basalt.Colors.actionPrimaryText.color)
              .padding(.horizontal, Basalt.Space.s3)
              .frame(height: Basalt.Size.controlMd)
              .background(Basalt.Colors.actionPrimary.color, in: .rect(cornerRadius: Basalt.Radius.sm))
          }
        }
        .padding(Basalt.Space.s8)
        .frame(width: 480)
        .background(Basalt.Colors.surfacePage.color)
      }
    }

    func testRenderSampleInBothAppearances() throws {
      Basalt.Fonts.register()
      for (name, appearance, scheme) in [("light", NSAppearance.Name.aqua, ColorScheme.light), ("dark", .darkAqua, .dark)] {
        var data: Data?
        NSAppearance(named: appearance)!.performAsCurrentDrawingAppearance {
          let renderer = ImageRenderer(content: Sample().environment(\.colorScheme, scheme))
          renderer.scale = 2
          if let image = renderer.nsImage, let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff) {
            data = rep.representation(using: .png, properties: [:])
          }
        }
        let png = try XCTUnwrap(data, "\(name): nothing rendered")
        XCTAssertGreaterThan(png.count, 1000)
        if let dir = ProcessInfo.processInfo.environment["BASALT_SNAPSHOT_DIR"] {
          try FileManager.default.createDirectory(atPath: dir, withIntermediateDirectories: true)
          try png.write(to: URL(fileURLWithPath: dir).appendingPathComponent("swiftui-sample-\(name).png"))
        }
      }
    }
  }
#endif
