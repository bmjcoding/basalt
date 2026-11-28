// The consumer lint's exception, in source (the vocabulary lint's form): a comment on the line before, naming the rule, with a reason after "--":
//   // basalt-lint-disable-next-line basalt/no-restyle -- the owner's recorded exception (DECISIONS 213)
//   {/* basalt-lint-disable-next-line basalt/primitive -- a row action, not a button */}
// A disable without a reason, one that names a rule that does not exist, and one that disables nothing all fail (`basalt/disable`).
const MARKER = /basalt-lint-disable-next-line\b([^\n]*)/;

/**
 * The disables in one file's comments.
 * @param {{ type: string, value: string, start: number, end: number }[]} comments the parser's comments
 * @param {(offset: number) => number} lineOf
 * @returns {{ line: number, target: number, rules: string[], reason: string, used: Set<string> }[]}
 */
export function readDisables(comments, lineOf) {
  const out = [];
  for (const comment of comments) {
    const m = MARKER.exec(comment.value);
    if (!m) continue;
    const [names, ...rest] = m[1].replace(/\*\/\s*$/, "").split(/\s--\s?/);
    const reason = rest.join(" -- ").trim();
    const rules = names.split(/[\s,]+/).map((r) => r.trim()).filter(Boolean);
    out.push({ line: lineOf(comment.start), target: lineOf(comment.end) + 1, rules, reason, used: new Set() });
  }
  return out;
}

/**
 * Removes the findings a disable excuses, and adds a `basalt/disable` finding for each disable that is malformed or excuses nothing.
 * @param {{ rule: string, line: number }[]} findings
 * @param {ReturnType<typeof readDisables>} disables
 * @param {Set<string>} known every rule name the command can report
 */
export function applyDisables(findings, disables, known) {
  const kept = [];
  for (const finding of findings) {
    const disable = disables.find((d) => d.target === finding.line && d.reason && d.rules.includes(finding.rule));
    if (disable) disable.used.add(finding.rule);
    else kept.push(finding);
  }
  for (const d of disables) {
    const at = { rule: "basalt/disable", severity: "error", line: d.line, column: 1 };
    if (!d.rules.length) kept.push({ ...at, message: "basalt-lint-disable-next-line names no rule: write the rule it excuses, then `-- <reason>`" });
    for (const rule of d.rules.filter((r) => !known.has(r))) kept.push({ ...at, message: `basalt-lint-disable-next-line names "${rule}", which is not a basalt-lint rule (${[...known].filter((r) => r !== "basalt/disable").join(", ")})` });
    if (!d.reason) kept.push({ ...at, message: "basalt-lint-disable-next-line has no reason: write why after ` -- `, so a reviewer reads it where the exception is" });
    else for (const rule of d.rules.filter((r) => known.has(r) && !d.used.has(r))) kept.push({ ...at, message: `basalt-lint-disable-next-line ${rule} disables nothing on line ${d.target}: remove it` });
  }
  return kept;
}
