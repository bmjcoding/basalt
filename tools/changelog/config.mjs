// `changelog.config.json`: the product, its repository, its trackers and its people (DECISIONS 320, 3.2). Read and checked before any entry.
import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE = "changelog.config.json";

const VARIABLE = /\{([A-Za-z][A-Za-z0-9]*)\}/g;
const TRACKER_KEYS = ["name", "pattern", "url", "label", "show"];
const TOP_KEYS = ["product", "repository", "trackers", "people"];
const PERSON_KEYS = ["name"];
export const SHOWS = ["link", "text", "none"];

const fail = (where, message) => { throw new Error(`${CONFIG_FILE}: ${where}: ${message}`); };

function checkHttps(where, url) {
  if (!/^https:\/\//.test(url)) fail(where, `"${url}" must be https`);
  // The variables go after the host only: in the path, the query or the fragment.
  if (!/^https:\/\/[^/?#{}]+(?:[/?#]|$)/.test(url)) fail(where, `"${url}" holds a variable in its host`);
  try {
    new URL(url.replace(VARIABLE, "x"));
  } catch {
    fail(where, `"${url}" is not a URL`);
  }
}

/**
 * Check a parsed config and return it ready to use: each tracker's pattern compiled to match the whole id. Stops on the first fault, naming it.
 */
export function readConfig(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("the file", "is not a JSON object");
  for (const key of Object.keys(raw)) if (!TOP_KEYS.includes(key)) fail("the file", `unknown key "${key}"`);
  if (typeof raw.product !== "string" || !raw.product.trim()) fail("product", "is the product's name, and is required");
  if (typeof raw.repository !== "string") fail("repository", "is the repository's https address, and is required");
  if (/[{}]/.test(raw.repository)) fail("repository", "holds no variable");
  checkHttps("repository", raw.repository);
  const repository = raw.repository.replace(/\/+$/, "");

  const names = new Set();
  const trackers = (raw.trackers ?? []).map((tracker, index) => {
    const at = `trackers[${index}]`;
    if (!tracker || typeof tracker !== "object") fail(at, "is not an object");
    for (const key of Object.keys(tracker)) if (!TRACKER_KEYS.includes(key)) fail(at, `unknown key "${key}"`);
    const { name, pattern, url, label } = tracker;
    const show = tracker.show ?? "link";
    if (typeof name !== "string" || !name.trim()) fail(at, `"name" is the word shown, and is required`);
    if (names.has(name)) fail(at, `the name "${name}" is used twice`);
    names.add(name);
    const where = `${at} (${name})`;
    if (typeof pattern !== "string" || !pattern) fail(where, `"pattern" is required`);
    if (pattern.startsWith("^") || pattern.endsWith("$")) fail(where, `write the pattern without ^ and $: it is matched against the whole id`);
    let regexp;
    try {
      regexp = new RegExp(`^(?:${pattern})$`, "u");
    } catch (error) {
      fail(where, `the pattern does not compile: ${error.message}`);
    }
    const groups = new Set([...pattern.matchAll(/\(\?<([A-Za-z][A-Za-z0-9]*)>/g)].map((match) => match[1]));
    for (const [field, template] of [["url", url], ["label", label]]) {
      if (template === undefined) continue;
      if (typeof template !== "string") fail(where, `"${field}" is a string`);
      for (const [, variable] of template.matchAll(VARIABLE)) {
        if (variable !== "id" && !groups.has(variable)) fail(where, `"{${variable}}" in "${field}" is neither {id} nor a named group of the pattern`);
      }
      if (/[{}]/.test(template.replace(VARIABLE, ""))) fail(where, `"${field}" holds a brace that is not a variable`);
    }
    if (!SHOWS.includes(show)) fail(where, `"show" is link, text or none`);
    if (show === "link" && url === undefined) fail(where, `a linked tracker needs "url"`);
    if (url !== undefined) checkHttps(where, url);
    return { name, pattern, regexp, url: url ?? null, label: label ?? null, show };
  });

  const people = {};
  for (const [key, person] of Object.entries(raw.people ?? {})) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) fail(`people.${key}`, "a person's key is lowercase letters, digits and hyphens");
    if (!person || typeof person !== "object") fail(`people.${key}`, "is not an object");
    for (const field of Object.keys(person)) if (!PERSON_KEYS.includes(field)) fail(`people.${key}`, `unknown key "${field}"`);
    if (typeof person.name !== "string" || !person.name.trim()) fail(`people.${key}`, `"name" is required`);
    people[key] = { name: person.name };
  }

  return { product: raw.product, repository, trackers, people };
}

/** Read and check the config at a repository's root. */
export function loadConfig(root) {
  const file = path.join(root, CONFIG_FILE);
  let text;
  try {
    text = fs.readFileSync(file, "utf8");
  } catch {
    throw new Error(`${CONFIG_FILE}: not found at ${root}`);
  }
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`${CONFIG_FILE}: not JSON: ${error.message}`);
  }
  return readConfig(raw);
}

/**
 * One ticket id, resolved against every tracker: exactly one must match the whole id. `where` names the file. The result is what a frozen
 * release keeps, so a later config change cannot re-point it.
 */
export function resolveTicket(id, config, where) {
  const hits = config.trackers.map((tracker) => ({ tracker, match: tracker.regexp.exec(id) })).filter((hit) => hit.match);
  const names = config.trackers.map((tracker) => tracker.name).join(", ") || "none configured";
  if (hits.length === 0) throw new Error(`${where}: ticket "${id}" matches no tracker (${names})`);
  if (hits.length > 1) throw new Error(`${where}: ticket "${id}" matches ${hits.length} trackers (${hits.map((hit) => hit.tracker.name).join(", ")})`);
  const [{ tracker, match }] = hits;
  const values = { id, ...(match.groups ?? {}) };
  const fill = (template, encode) => template.replace(VARIABLE, (_, name) => (encode ? encodeURIComponent(values[name]) : values[name]));
  const ticket = { tracker: tracker.name, id, label: tracker.label ? fill(tracker.label, false) : id, show: tracker.show };
  if (tracker.show === "link") ticket.href = fill(tracker.url, true);
  return ticket;
}

/** A person's name from their key, or a stop naming the file. */
export function resolvePerson(key, config, where) {
  const person = config.people[key];
  if (!person) throw new Error(`${where}: author "${key}" is not a key of the config's "people" (${Object.keys(config.people).join(", ") || "none"})`);
  return person.name;
}

export const pullHref = (config, number) => `${config.repository}/pull/${number}`;
export const commitHref = (config, sha) => `${config.repository}/commit/${sha}`;
