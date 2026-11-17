// `npm run lint`: the stylelint run and the dependency allowlist, both to the end, then one summary (scripts/run-steps.mjs). The pre-commit hook runs this.
import { runSteps } from "./run-steps.mjs";

export const LINT = [
  { label: "stylelint", command: 'stylelint "packages/react/src/styles/**/*.css" "tools/html-skill/src/**/*.css" "sites/**/*.css"' },
  { label: "dependency allowlist", command: "node scripts/check-deps.mjs" },
];

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await runSteps(LINT, { title: "npm run lint" });
