// Shared by the changelog tool's tests: a throwaway git repository with a config, entry files written and committed as a person would.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after } from "node:test";

const made = [];
after(() => { for (const dir of made) fs.rmSync(dir, { recursive: true, force: true }); });

/** A made-up config: Linear-like and Jira-like trackers and one person. Every value is invented. */
export const CONFIG = {
  product: "Example",
  repository: "https://github.com/example/repo",
  trackers: [
    { name: "Linear", pattern: "(?:ENG|DES)-[1-9][0-9]*", url: "https://linear.app/example/issue/{id}" },
    { name: "Jira", pattern: "PROJ-[1-9][0-9]*", url: "https://example.atlassian.net/browse/{id}", show: "text" },
    { name: "GitHub", pattern: "repo#(?<n>[1-9][0-9]*)", url: "https://github.com/example/repo/issues/{n}", label: "issue #{n}" },
  ],
  people: { sam: { name: "Sam Rivera" } },
};

export function tempDir(prefix = "changelog-test-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  made.push(dir);
  return dir;
}

/** An entry file's text from its head fields and sentence. */
export function entryText(head, text = "Fixed the example list losing its place when a row was removed") {
  const lines = ["---", ...Object.entries(head).map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(", ")}]` : value}`), "---", text, ""];
  return lines.join("\n");
}

/** A repository with the config committed. `git(...)` runs in it; `entry(id, head, text, subject)` writes and commits one entry file. */
export function repository(config = CONFIG) {
  const dir = tempDir();
  let clock = Date.UTC(2026, 10, 1, 9);
  const env = () => {
    clock += 60_000;
    const when = new Date(clock).toISOString();
    return { ...process.env, GIT_AUTHOR_NAME: "Example", GIT_AUTHOR_EMAIL: "example@example.com", GIT_COMMITTER_NAME: "Example", GIT_COMMITTER_EMAIL: "example@example.com", GIT_AUTHOR_DATE: when, GIT_COMMITTER_DATE: when };
  };
  const git = (...args) => execFileSync("git", args, { cwd: dir, env: env(), encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  git("init", "-q", "-b", "main");
  git("config", "commit.gpgsign", "false");
  fs.writeFileSync(path.join(dir, "changelog.config.json"), JSON.stringify(config, null, 2));
  git("add", "-A");
  git("commit", "-q", "-m", "Start");
  const write = (id, head, text) => {
    fs.mkdirSync(path.join(dir, ".changes"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".changes", `${id}.md`), entryText(head, text));
  };
  const entry = (id, head, text, subject = `Change ${id}${head.pr ? ` (#${head.pr})` : ""}`) => {
    write(id, head, text);
    git("add", "-A");
    git("commit", "-q", "-m", subject);
    return git("rev-parse", "HEAD");
  };
  const notes = (source) => {
    fs.mkdirSync(path.join(dir, ".changes"), { recursive: true });
    fs.writeFileSync(path.join(dir, ".changes", "release.md"), source);
    git("add", "-A");
    git("commit", "-q", "-m", "Release notes");
  };
  const commitAll = (message) => { git("add", "-A"); git("commit", "-q", "-m", message); };
  const record = (version) => JSON.parse(fs.readFileSync(path.join(dir, "changelog", "releases", `${version}.json`), "utf8"));
  const pending = () => (fs.existsSync(path.join(dir, ".changes")) ? fs.readdirSync(path.join(dir, ".changes")).sort() : []);
  return { dir, git, write, entry, notes, commitAll, record, pending };
}

/** Write a record by hand (a release that happened before the test). */
export function writeRecord(dir, record) {
  const file = path.join(dir, "changelog", "releases", `${record.version}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
}

/** Run `fn` and return the message it stopped with, or fail when it did not stop. */
export function stops(fn) {
  try {
    fn();
  } catch (error) {
    return error.message;
  }
  throw new Error("expected it to stop, and it went on");
}
