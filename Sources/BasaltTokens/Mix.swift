// Mixing, by hand (not generated): what CSS `color-mix(in srgb, …)` gives, for the one place foundations asks for it, a status callout's rim.

extension Basalt.RGBA {
  /// This colour at `amount` (0 to 1) mixed over `base` in sRGB, opaque: `color-mix(in srgb, this amount, base)`.
  public func mixed(over base: Basalt.RGBA, amount: Double) -> Basalt.RGBA {
    Basalt.RGBA(
      red: red * amount + base.red * (1 - amount),
      green: green * amount + base.green * (1 - amount),
      blue: blue * amount + base.blue * (1 - amount),
      alpha: 1
    )
  }
}

extension Basalt.ThemedColor {
  /// This colour at `amount` mixed over `base` in each theme, opaque.
  public func mixed(over base: Basalt.ThemedColor, amount: Double) -> Basalt.ThemedColor {
    Basalt.ThemedColor(light: light.mixed(over: base.light, amount: amount), dark: dark.mixed(over: base.dark, amount: amount))
  }
}
