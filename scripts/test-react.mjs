// `npm test -w packages/react`: the typecheck and the build-and-browser tests are two steps, and both run and both report. They were one `&&` chain, so a type error
// hid every browser test behind it (and the root `npm test` shows this package as one suite). The cwd is packages/react, where npm starts a workspace's script.
import { runSteps } from "./run-steps.mjs";

export const STEPS = [
  { label: "react typecheck", command: "npm run typecheck" },
  // The build comes first in this step: a failed build would leave the tests reading an old dist, so they do not run on it.
  { label: "react build and tests", command: "node build.mjs && node --test test/*.test.mjs" },
];

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) await runSteps(STEPS, { title: "react tests" });
