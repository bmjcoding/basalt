// `npm run check`: everything CI runs on Linux, each step to the end, then one summary. It used to be one `&&` chain, which stopped at the first failing step.
// ci.yml's own steps are unchanged; scripts/ci-local.mjs runs the same list (WEB) through the same runner.
import { isMain } from "./is-main.mjs";
import { runSteps } from "./run-steps.mjs";

export const CHECK = ["npm run lint", "npm test", "npm run artifact", "npm run typecheck:review", "npm run test:packages"];

if (isMain(import.meta.url)) await runSteps(CHECK.map((command) => ({ command })), { title: "npm run check" });
