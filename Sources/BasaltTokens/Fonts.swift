import Foundation

#if canImport(CoreText)
  import CoreText
#endif

extension Basalt {
  /// Geist Sans and Geist Mono (SIL Open Font License 1.1), bundled with this package.
  public enum Fonts {
    /// The PostScript name of the bundled face for a weight.
    public static func postScriptName(weight: Weight, mono: Bool = false) -> String {
      switch (mono, weight) {
      case (false, .regular): return "Geist-Regular"
      case (false, .medium): return "Geist-Medium"
      case (false, .semibold): return "Geist-SemiBold"
      case (true, .regular): return "GeistMono-Regular"
      // Mono ships Regular and Medium: identifiers and code never need semibold.
      case (true, .medium), (true, .semibold): return "GeistMono-Medium"
      }
    }

    /// The bundled font files.
    public static var urls: [URL] {
      Bundle.module.urls(forResourcesWithExtension: "ttf", subdirectory: nil) ?? []
    }

    #if canImport(CoreText)
      /// Registers Geist for this process. Call once at launch, before any Basalt text draws.
      /// Safe to call more than once. Returns the faces now available.
      @discardableResult
      public static func register() -> [String] {
        for url in urls {
          // Already registered (a second call) is not an error worth surfacing.
          CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
        return Weight.allCases.flatMap { [postScriptName(weight: $0), postScriptName(weight: $0, mono: true)] }
          .filter { name in
            let font = CTFontCreateWithName(name as CFString, 12, nil)
            return (CTFontCopyPostScriptName(font) as String) == name
          }
      }
    #endif
  }
}
