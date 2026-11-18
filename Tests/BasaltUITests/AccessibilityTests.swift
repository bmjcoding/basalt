#if canImport(SwiftUI)
import Foundation
import SwiftUI
import XCTest
@testable import BasaltUI

/// The second audit's A3-15: a field's error is not carried on the accessibility hint, and the two symbols that were drawn at a fixed point size scale with Dynamic Type.
final class AccessibilityTests: XCTestCase {
  func testAnErrorIsNeverTheFieldsHint() {
    XCTAssertNil(BasaltTextField.hint(help: "Lowercase, 3 to 32 characters.", error: "Enter a host."), "an error is the message element below the field, not the hint")
    XCTAssertNil(BasaltTextField.hint(help: nil, error: "Enter a host."))
    XCTAssertEqual(BasaltTextField.hint(help: "Lowercase, 3 to 32 characters.", error: nil), "Lowercase, 3 to 32 characters.", "help is still the hint")
    XCTAssertNil(BasaltTextField.hint(help: nil, error: nil))
  }

  /// Every symbol in BasaltUI goes through `basaltScaledSymbol`: a `.system(size:)` with a fixed number does not move with Dynamic Type.
  func testNoSymbolIsDrawnAtAFixedPointSize() throws {
    let sources = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Sources/BasaltUI")
    let files = try FileManager.default.contentsOfDirectory(at: sources, includingPropertiesForKeys: nil).filter { $0.pathExtension == "swift" }
    XCTAssertFalse(files.isEmpty)
    for file in files where file.lastPathComponent != "ScaledSymbol.swift" {
      let text = try String(contentsOf: file, encoding: .utf8)
      XCTAssertFalse(text.contains(".system(size: 16") || text.contains(".system(size: 24"), "\(file.lastPathComponent) draws a symbol at a fixed size")
    }
  }
}

/// macOS has no Dynamic Type, so a hosting view there never scales a `ScaledMetric`: the test reads what the modifier holds, and the scan above reads who uses it.
final class ScaledSymbolTests: XCTestCase {
  func testTheModifierHoldsAScaledMetricAtTheDesignSize() throws {
    for size in [16.0, 24.0] {
      let modifier = BasaltScaledSymbol(size: size, weight: .semibold, relativeTo: .body)
      let metric = try XCTUnwrap(Mirror(reflecting: modifier).children.first { $0.label == "_size" }?.value as? ScaledMetric<CGFloat>, "the size is a ScaledMetric, which follows Dynamic Type where the platform has it")
      XCTAssertEqual(metric.wrappedValue, size, "outside a view it is the design size")
    }
  }
}
#endif
