// Types for the palette module (cimip-gaps-3 T9, DECISIONS 403). Copied into dist/js/palettes.d.ts by build.mjs.

/** An opaque sRGB colour, `#rrggbb`. */
export type Hex = `#${string}`;
/** A colour for each theme. */
export interface Pair { light: Hex; dark: Hex }
/** A corner step a palette may choose. */
export type Corner = 0 | 2 | 4 | 6 | 8 | 12;

/** A palette: values for the closed list of hooks. Every key is optional; an unset hook keeps Basalt's paint. */
export interface PaletteDefinition {
  /** Lowercase letters, digits and hyphens, starting with a letter, 32 at most. `basalt` is reserved for Basalt's own look. */
  id: string;
  link?: { ink?: Pair; underline?: Pair };
  chosen?: { line?: Pair; fill?: Pair; ink?: Pair; edge?: Pair };
  checked?: { fill?: Pair; ink?: Pair; edge?: Pair };
  /** The brand mark's colour, for a `BrandSvg tone="brand"` or `.basalt-brand-mark`. */
  mark?: Pair;
  button?: {
    primary?: { fill?: Pair; fillHover?: Pair; fillPress?: Pair; ink?: Pair; edge?: Pair; fillDisabled?: Pair; inkDisabled?: Pair };
    secondary?: { fill?: Pair; fillPress?: Pair; ink?: Pair; edge?: Pair; edgeHover?: Pair };
    outline?: { ink?: Pair; edge?: Pair; edgeHover?: Pair };
    ghost?: { ink?: Pair; inkHover?: Pair };
    /** The two corner steps (where Basalt draws 6, then 8), the first not above the second, or `full` for a capsule. */
    radius?: readonly [Corner, Corner] | "full";
    /** `scale` is Basalt's .98 press; `none` turns it off. */
    press?: "scale" | "none";
  };
  field?: { edge?: Pair; edgeHover?: Pair; edgeActive?: Pair; radius?: readonly [Corner, Corner] };
}

/** One measured pair that is under its floor. */
export interface PalettePair {
  kind: "contrast" | "status" | "identical";
  theme: "light" | "dark";
  /** The colour measured: a definition path (`link.ink`) or a Basalt token (`border-focus`). */
  subject: string;
  /** What it was measured on, or for the status distance, which status colour. */
  on: string;
  /** The WCAG ratio, raw; for the status distance, ΔEok. */
  ratio: number;
  /** The floor it needed. */
  floor: number;
}

/** sRGB floats `[r, g, b, alpha]`, by token name, for each theme: what the verifier measures on. */
export interface PaletteBase {
  amount: number;
  light: Record<string, readonly number[]>;
  dark: Record<string, readonly number[]>;
}

export interface VerifyOptions {
  /** The surfaces and inks to measure on. Basalt's own by default. */
  base?: PaletteBase;
  /** Basalt's own palette: the status distance is a failure, not an advisory. */
  own?: boolean;
}

export interface ChosenWordNames { root?: string; choice?: string; item?: string; pill?: string; pillEdge?: string; slide?: string }

export declare const COLOR_HOOKS: readonly (readonly [string, string])[];
export declare const SHAPE_HOOKS: readonly string[];
export declare const EDGE_DURATION: string;
export declare const HOOKS: readonly string[];
export declare const MORE_CONTRAST_RESET: readonly string[];
export declare const SWIFT_COLOR_NAMES: readonly string[];

/** Checks a definition's shape and returns it frozen; throws on a bad id, a non-hex colour, an unknown key, a bad corner or a set that must come together. */
export declare function definePalette<T extends PaletteDefinition>(def: T): Readonly<T>;
/** Measures every pair of the matrix in both themes. */
export declare function verifyPalette(def: PaletteDefinition, options?: VerifyOptions): { ok: boolean; failures: PalettePair[]; advisories: PalettePair[] };
/** Throws when a palette fails, listing each failing pair and its ratio. */
export declare function assertPalette(def: PaletteDefinition, options?: VerifyOptions): void;
/** One line describing a pair. */
export declare function describePair(pair: PalettePair): string;
/** Every hook a palette block declares, with its value or `initial`. */
export declare function paletteDeclarations(def: PaletteDefinition | undefined): [string, string][];
/** The palette choice's three first-frame rules for one id. */
export declare function chosenWordCss(id: string, names?: ChosenWordNames): string;
/** The CSS for a list of palettes; verifies each first and throws on a failure. */
export declare function paletteCss(defs: readonly PaletteDefinition[], options?: VerifyOptions & { chosenWord?: ChosenWordNames | false }): string;
/** Basalt's own block: every hook initial. */
export declare function basaltPaletteCss(): string;
/** The same values as a `Basalt.Palette` initialiser. */
export declare function paletteSwift(def: PaletteDefinition): string;
/** The WCAG contrast of two sRGB colours, raw. */
export declare function contrast(a: readonly number[], b: readonly number[]): number;
/** ΔEok between two sRGB colours. */
export declare function deltaEok(a: readonly number[], b: readonly number[]): number;
