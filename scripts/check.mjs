// `npm run check`: everything CI runs on Linux, each step to the end, then one summary. It used to be one `&&` chain, which stopped at the first failing step.
// ci.yml's own steps are unchanged; scripts/ci-local.mjs runs the same list (WEB) through the same runner.
import { runSteps } from "./run-steps.mjs";

export const CHECK = ["npm run lint", "npm test", "npm run artifact", "npm run typecheck:review", "npm run test:packages"];

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await runSteps(CHECK.map((command) => ({ command })), { title: "npm run check" });
