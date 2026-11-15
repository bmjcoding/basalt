#if canImport(SwiftUI)
import XCTest
import BasaltTokens
@testable import BasaltUI

final class CalloutTests: XCTestCase {
  /// DECISIONS 138 and 139 (E8): a status callout's rim is the status colour at 45% mixed in sRGB over its own level, one solid colour.
  func testStatusRimIsFortyFivePercentOverTheCalloutsLevel() {
    XCTAssertNil(BasaltStatus.info.rim, "info keeps the neutral rim")
    for (status, color) in [(BasaltStatus.success, Basalt.Colors.statusSuccess), (.warning, Basalt.Colors.statusWarning), (.danger, Basalt.Colors.statusDanger)] {
      let rim = status.rim
      XCTAssertNotNil(rim)
      for (got, ink, level) in [(rim!.light, color.light, Basalt.Colors.surfaceRaised.light), (rim!.dark, color.dark, Basalt.Colors.surfaceRaised.dark)] {
        XCTAssertEqual(got.red, ink.red * 0.45 + level.red * 0.55, accuracy: 1e-9)
        XCTAssertEqual(got.green, ink.green * 0.45 + level.green * 0.55, accuracy: 1e-9)
        XCTAssertEqual(got.blue, ink.blue * 0.45 + level.blue * 0.55, accuracy: 1e-9)
        XCTAssertEqual(got.alpha, 1, "one solid colour")
      }
    }
  }

  func testMixingTakesNothingFromTheBaseAtOne() {
    let a = Basalt.Colors.statusDanger.light
    let b = Basalt.Colors.surfaceRaised.light
    XCTAssertEqual(a.mixed(over: b, amount: 1), a)
    XCTAssertEqual(a.mixed(over: b, amount: 0), b)
  }
}
#endif
