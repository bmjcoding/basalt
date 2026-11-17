// Round 43: audit-fix-c3, the fifth fix batch from the full audit (stream components-nov14, DECISIONS 133). Engineering only: nothing here changes a pixel, a token's
// value or a design rule, so there is nothing to approve in a screenshot. The round shows the numbers the batch moved, and the lint's probe file with what it now
// catches. The design panel did not review it and the council did not vote on it, because AGENTS.md calls this class of change engineering.
//
// Every figure is written here as it was measured (the commands are in the pull request); this page measures nothing in the browser. Where a figure could only be
// measured on a single test file, it says so.

import * as React from "react";

import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, Text } from "../../packages/react/src/index";
import type { Round } from "./rounds";

const col: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 24 };
const mono: React.CSSProperties = { margin: 0, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--basalt-border-input)", background: "var(--basalt-surface-1)", color: "var(--basalt-text-primary)", font: "var(--basalt-font-weight-regular) var(--basalt-text-sm-size)/var(--basalt-text-sm-line-height) var(--basalt-font-family-mono)", overflowX: "auto" };

const fmt = (n: number) => n.toLocaleString("en");

type Figure = { what: string; before: number | string; after: number | string; unit?: string; note: string };

const FIGURES: Figure[] = [
  { what: "styles.css, as shipped", before: 392_076, after: 261_310, unit: "bytes", note: "Comments and whitespace out (build.mjs); every value is the source's own. 56% smaller over gzip." },
  { what: "styles.css, gzipped", before: 77_000, after: 34_099, unit: "bytes", note: "What an app that links the sheet with no minifier of its own downloads." },
  { what: "components.css, as shipped", before: 370_918, after: 242_566, unit: "bytes", note: "The same transform." },
  { what: "composition.d.ts", before: 208_735, after: 22_521, unit: "bytes", note: "Text and Heading declare React.JSX.Element, so the declaration no longer writes out every HTML attribute twice." },
  { what: "All declaration files", before: 550_375, after: 364_161, unit: "bytes", note: "dist/*.d.ts together." },
  { what: "Warnings from an esbuild build of dist", before: 16, after: 0, note: "The bare imports of Basalt's own chunks are gone (the chunks are still imported by name)." },
  { what: "Exports held to a recorded size", before: "81 of 295", after: "295 of 295", note: "(Before: counted from the limit lists in the test on main.) Each runtime export, the whole package up front and styles.css (minified and gzipped) are held to the table in test/export-sizes.json plus 5%." },
  { what: "Files in dist whose load is checked to do nothing", before: 9, after: "every one (288 files)", note: "Each is imported in a process of its own; a Set, Map or formatter that the file allocates while loading, or a throw, fails the test." },
  { what: "Raw values the lint can see", before: "px, hex, named colours, lower-case colour functions", after: "also rem, em, ch, the viewport, absolute and time units, any-case colour functions, @container lengths", note: "72 existing lines needed an exception with a reason; no value changed." },
  { what: "Runtime exports the README names", before: "224 of 295", after: "295 of 295", note: "A test fails when one is missing. Three wrong shapes corrected (CommandMenu's groups, the sheet's four sides, the demo page)." },
  { what: "figures.test.mjs, CPU time (user + sys), one run each", before: "63.4 s", after: "42.9 s", note: "94 tests, the same 94 pass. A fixture is bundled in one esbuild context for the process, so the package and React are parsed once and not for each page." },
  { what: "feedback.test.mjs, CPU time (user + sys), one run each", before: "43.0 s", after: "28.8 s", note: "58 tests, the same 58 pass. One file each, on a machine with other work on it, so rough; the whole suite before and after is the lead's run." },
];

function NumbersDemo() {
  return (
    <div style={col}>
      <Text size="sm" tone="secondary">Measured on the batch's branch against main at e355550. Nothing on this page is drawn by the batch: it is a table of what moved.</Text>
      <TableContainer label="What the batch moved">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Figure</TableHead>
              <TableHead numeric>Before</TableHead>
              <TableHead numeric>After</TableHead>
              <TableHead>What it is</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FIGURES.map((f) => (
              <TableRow key={f.what}>
                <TableCell>{f.what}</TableCell>
                <TableCell numeric>{typeof f.before === "number" ? `${fmt(f.before)}${f.unit ? ` ${f.unit}` : ""}` : f.before}</TableCell>
                <TableCell numeric>{typeof f.after === "number" ? `${fmt(f.after)}${f.unit ? ` ${f.unit}` : ""}` : f.after}</TableCell>
                <TableCell>{f.note}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

const PROBE = `.a { color: RGB(255 0 0); }
.b { width: 30rem; height: 20vh; margin: 3em; padding: 42ch; }
.c { width: 12Q; height: 1cm; line-height: 13pt; }
.d { animation: x 1.4s ease infinite; transition-duration: 173ms; }
@container (width < 480px) { .e { margin: 0; } }
/* stylelint-disable-next-line unit-disallowed-list -- one line of a digit strip is 1em */
.f { height: 1em; }
/* stylelint-disable-next-line basalt/container-length -- size-breakpoint-container (480px); a query cannot read a custom property */
@container (width < 480px) { .g { margin: 0; } }
.h { width: var(--basalt-size-dialog-width); transition: opacity var(--basalt-duration-base) var(--basalt-ease-out); }`;

const CAUGHT: [string, string, string][] = [
  [".a", "RGB(255 0 0)", "refused (a colour function is matched in any case)"],
  [".b", "30rem, 20vh, 3em, 42ch", "refused (font-relative and viewport units)"],
  [".c", "12Q, 1cm, 13pt", "refused (the absolute units)"],
  [".d", "1.4s, 173ms", "refused (a duration comes from a token)"],
  ["@container", "(width < 480px)", "refused (the new basalt/container-length rule)"],
  [".f", "1em, with an exception and its reason", "passes"],
  ["@container", "(width < 480px), with an exception naming the token", "passes"],
  [".h", "tokens only", "passes"],
];

function LintDemo() {
  return (
    <div style={col}>
      <Text size="sm" tone="secondary">A probe file, run through the repository's own Stylelint config. Before the batch none of the lines marked refused raised anything.</Text>
      <pre style={mono} tabIndex={0} aria-label="The probe file">{PROBE}</pre>
      <TableContainer label="What the lint says about each rule">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Now</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CAUGHT.map(([rule, value, now], i) => (
              <TableRow key={i}>
                <TableCell mono>{rule}</TableCell>
                <TableCell mono>{value}</TableCell>
                <TableCell>{now}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Text size="sm" tone="secondary">The two loop durations (1.4s, 2s) carry an exception that says a token for them is the council's to decide. The linear and ease keywords are not linted: the token for linear is a cubic-bezier, whose computed value is not the keyword's.</Text>
    </div>
  );
}

const common = { widths: [1440, 390], scales: [1, 2] };

export const ROUND_43: Round = {
  id: "43",
  title: "audit-fix-c3: the package's build, the lint, the test suite's cost and documents that state a fact",
  reviewed: false,
  summary:
    "The fifth engineering batch from the full audit. It changes no rendered pixel, no token's value and no design rule, so there is nothing to approve here: this round shows the numbers it moved. The style sheets ship without their comments and whitespace, Text and Heading declare their return type, a consumer's build prints no warning, the bundle test holds every export to a recorded size, the lint sees what AGENTS.md says it sees, the browser floor is written down and checked, the README names every export, and ci:local can start from a fresh worktree. Not reviewed by the panel or the council (engineering).",
  steps: [
    {
      id: "numbers",
      name: "What the batch moved",
      intro: "Sizes, warnings and checks, before and after.",
      ...common,
      height: 900,
      decisions: ["Engineering, so no vote. The style sheets keep every value: the build removes comments and whitespace and nothing else, so selectors, numbers and functions are the source's text (a test proves the shipped file is the minified source and nothing more).", "The whole suite's time before and after is a run the lead schedules; the figure shown is one test file."],
      tryIt: ["Read the table at 1440 and at 390: the first column keeps its place and the rest scroll."],
      demo: () => <NumbersDemo />,
    },
    {
      id: "lint",
      name: "What the lint now catches",
      intro: "A probe file through the repository's Stylelint config.",
      ...common,
      height: 900,
      decisions: ["A new rule, basalt/container-length, reads the length inside an @container query, which Stylelint's own unit rules do not look at. It is a plugin in scripts/, with no new dependency.", "Every raw value in the tree that was right now has an exception on the line before with its reason (72 of them); no value changed."],
      tryIt: ["Compare the probe with the table: the lines marked refused are the ones that raised nothing before."],
      demo: () => <LintDemo />,
    },
  ],
};
