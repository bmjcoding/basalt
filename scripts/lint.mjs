// `npm run lint`: stylelint, oxlint (type-aware JS/TS/JSX correctness), the dependency allowlist, the sink check and the public surface's vocabulary, each to the end, then one summary (scripts/run-steps.mjs). The pre-commit hook runs this.
import { isMain } from "./is-main.mjs";
import { runSteps } from "./run-steps.mjs";

export const LINT = [
  { label: "stylelint", command: 'stylelint "packages/react/src/styles/**/*.css" "tools/html-skill/src/**/*.css" "sites/**/*.css"' },
  { label: "oxlint", command: "oxlint --type-aware ." },
  { label: "dependency allowlist", command: "node scripts/check-deps.mjs" },
  { label: "sink check", command: "node scripts/check-sinks.mjs" },
  { label: "public-surface vocabulary", command: "node scripts/check-vocabulary.mjs" },
];

if (isMain(import.meta.url)) await runSteps(LINT, { title: "npm run lint" });
