#if canImport(SwiftUI)
import XCTest
import BasaltTokens
@testable import BasaltUI

/// Radius follows the box as it is drawn (decisions 138, 145 and 149), checked from the source's own numbers, without a render.
final class RadiusTests: XCTestCase {
  /// On iOS and visionOS every control is drawn at least 44 tall, so every size is radius 8; on macOS a control up to 32 is 6 and 36 and up is 8.
  func testControlRadiusFollowsTheDrawnBox() {
    for size in BasaltControlSize.allCases {
      #if os(iOS) || os(visionOS)
      XCTAssertEqual(size.radius, Basalt.Radius.md, "\(size)")
      #else
      XCTAssertEqual(size.radius, size.minimumHeight >= Basalt.Size.controlLg ? Basalt.Radius.md : Basalt.Radius.sm, "\(size)")
      #endif
    }
  }

  /// A text field takes the radius of its medium control.
  func testTextFieldIsTheMediumControlsRadius() {
    #if os(iOS) || os(visionOS)
    XCTAssertEqual(BasaltControlSize.md.radius, 8)
    #else
    XCTAssertEqual(BasaltControlSize.md.radius, 6)
    #endif
  }

  /// The editor is at least 100 tall, a box of 36 and up, so it is radius 8 on every platform.
  func testTextEditorIsRadius8OnEveryPlatform() {
    XCTAssertGreaterThanOrEqual(100, Basalt.Size.controlLg)
    XCTAssertEqual(BasaltTextEditor.radius, 8)
  }
}
#endif
