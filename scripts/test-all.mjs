// `npm test`: every suite, one after another, none skipped because an earlier one failed. See scripts/run-steps.mjs for the summary.
import { runSteps } from "./run-steps.mjs";

export const SUITES = [
  { label: "tokens", command: "npm test -w packages/tokens" },
  { label: "react", command: "npm test -w packages/react" },
  { label: "html skill", command: "npm run test:html-skill" },
  { label: "brand", command: "npm run test:brand" },
  { label: "sites", command: "npm run test:sites" },
];

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await runSteps(SUITES, { title: "npm test" });
