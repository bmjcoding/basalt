// Runs a list of commands one after another and does not stop at the first that fails: every step runs, its output streams as it would alone, and the
// run ends with one line a step (passed or failed, how long, and for a failed step the test files that failed) and fails if any step did.
//
// Why: a check that stops at its first failure hides every later step's result, so one flaky file cost a rerun of everything behind it (the components
// stream's gate, 14 to 17 Nov 2026). To see which step failed first: the steps print in order, each under its own "── step" header, so the first failure's
// output is the first failing section of the log; the summary marks it "failed first" and repeats the order.
import { spawn } from "node:child_process";

const ANSI = /\u001B\[[0-9;]*[A-Za-z]/g;

/**
 * The test files a captured run says failed. Reads the two reporters Node's test runner writes: the spec reporter's "test at FILE:LINE:COL" lines in its
 * "failing tests" block, and the TAP reporter's top-level "not ok N - FILE". Each file once, in the order they were reported.
 */
export function failingFiles(output) {
  const text = output.replace(ANSI, "");
  const files = [];
  for (const m of text.matchAll(/^test at (\S+?):\d+:\d+\s*$/gm)) files.push(m[1]);
  for (const m of text.matchAll(/^not ok \d+ - (\S+\.(?:test\.)?mjs)\s*$/gm)) files.push(m[1]);
  return [...new Set(files)];
}

/** Runs one command in a shell, streaming its output to ours and keeping a copy. Resolves with { status, output, seconds }. */
export function runStep(command, { cwd, env } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, { cwd, env, shell: true, stdio: ["inherit", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; process.stdout.write(chunk); });
    child.stderr.on("data", (chunk) => { output += chunk; process.stderr.write(chunk); });
    child.on("error", (error) => { output += String(error); resolve({ status: 1, output, seconds: (Date.now() - started) / 1000 }); });
    child.on("close", (status, signal) => resolve({ status: status ?? (signal ? 1 : 0), output, seconds: (Date.now() - started) / 1000 }));
  });
}

/** One summary line a step: "✔ npm test (212s)" or "✖ npm test (212s), failed first: a.test.mjs, b.test.mjs". */
export function summaryLines(results) {
  const firstFailed = results.findIndex((r) => r.status !== 0);
  return results.map((r, i) => {
    const time = `${r.seconds.toFixed(0)}s`;
    if (r.status === 0) return `  ✔ passed  ${r.label} (${time})`;
    const files = failingFiles(r.output);
    return `  ✖ FAILED  ${r.label} (${time}, exit ${r.status})${i === firstFailed ? ", failed first" : ""}${files.length ? `\n      failing files: ${files.join(", ")}` : ""}`;
  });
}

/**
 * Runs every step; returns the results. `steps` are { label, command, cwd?, env? } (the label defaults to the command). Prints a header before each step and the
 * summary after the last, and sets `process.exitCode = 1` if any failed.
 */
export async function runSteps(steps, { title = "steps", header = (step) => `\n── ${step.label}` } = {}) {
  const results = [];
  for (const step of steps) {
    const label = step.label ?? step.command;
    console.log(header({ ...step, label }));
    const result = await runStep(step.command, { cwd: step.cwd, env: step.env });
    results.push({ ...result, label });
    console.log(`── ${label} ${result.status === 0 ? "passed" : `FAILED (exit ${result.status})`} in ${result.seconds.toFixed(0)}s`);
  }
  const failed = results.filter((r) => r.status !== 0);
  console.log(`\n${title}: ${results.length - failed.length} of ${results.length} steps passed${failed.length ? `, ${failed.length} failed` : ""}\n${summaryLines(results).join("\n")}`);
  if (failed.length) process.exitCode = 1;
  return results;
}
