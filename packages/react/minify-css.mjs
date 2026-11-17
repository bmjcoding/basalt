// How the two shipped style sheets are written (build.mjs), in a module of its own so a test can run the same transform on the source.
//
// Only comments and whitespace go: for the browsers the package supports (docs/foundations.md, "Browser support") nothing is lowered. An app that links
// the sheets as they are, with no minifier of its own, pays for every comment (a third of the file) and indent. A comment that begins /*! is kept; the
// sources have none.
import * as esbuild from "esbuild";

export const SUPPORTED = ["chrome123", "safari17.5", "firefox121"];

export const minifyCss = (css) => esbuild.transformSync(css, { loader: "css", minifyWhitespace: true, legalComments: "inline", target: SUPPORTED, logLevel: "warning" }).code;
