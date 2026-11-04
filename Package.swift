// swift-tools-version: 5.9
// Basalt for Apple platforms. The tokens (Sources/BasaltTokens/Tokens.swift) are generated
// from packages/tokens by `npm run build`; never edit them by hand.

import PackageDescription

let package = Package(
  name: "Basalt",
  platforms: [.iOS(.v17), .macOS(.v14), .visionOS(.v1)],
  products: [
    .library(name: "BasaltTokens", targets: ["BasaltTokens"]),
  ],
  targets: [
    .target(
      name: "BasaltTokens",
      resources: [.process("Resources")]
    ),
    .testTarget(
      name: "BasaltTokensTests",
      dependencies: ["BasaltTokens"]
    ),
  ]
)
