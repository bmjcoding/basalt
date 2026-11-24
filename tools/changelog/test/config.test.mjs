// DECISIONS 320, 3.2: the tracker config is read and checked before any entry.
import assert from "node:assert/strict";
import { test } from "node:test";

import { readConfig, resolveTicket } from "../config.mjs";
import { CONFIG, stops } from "./support.mjs";

const one = (tracker) => readConfig({ product: "Example", repository: "https://github.com/example/repo", trackers: [tracker] });

test("a pattern written with ^ or $ is refused: the tool matches the whole id", () => {
  assert.match(stops(() => one({ name: "Tracker", pattern: "^T-[1-9][0-9]*", url: "https://t.example/{id}" })), /without \^ and \$/);
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[1-9][0-9]*$", url: "https://t.example/{id}" })), /without \^ and \$/);
});

test("the whole id is matched, so a pattern never matches part of one", () => {
  const config = one({ name: "Tracker", pattern: "T-[1-9][0-9]*", url: "https://t.example/{id}" });
  assert.equal(resolveTicket("T-7", config, "f").id, "T-7");
  assert.match(stops(() => resolveTicket("XT-7", config, "f")), /matches no tracker/);
  assert.match(stops(() => resolveTicket("T-7x", config, "f")), /matches no tracker/);
});

test("a variable that is neither {id} nor a named group is refused when the config is read", () => {
  const message = stops(() => one({ name: "Tracker", pattern: "T-[0-9]+", url: "https://t.example/{n}" }));
  assert.match(message, /"\{n\}".*neither \{id\} nor a named group/);
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9]+", url: "https://t.example/{id}", label: "T {num}" })), /"\{num\}" in "label"/);
});

test("a variable in the host, http and a non-web scheme are refused", () => {
  assert.match(stops(() => one({ name: "Tracker", pattern: "(?<team>[a-z]+)-[0-9]+", url: "https://{team}.example/{id}" })), /variable in its host/);
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9]+", url: "http://t.example/{id}" })), /must be https/);
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9]+", url: "javascript:alert({id})" })), /must be https/);
  assert.match(stops(() => readConfig({ product: "Example", repository: "http://github.com/example/repo" })), /must be https/);
});

test("a name used twice is refused", () => {
  const message = stops(() => readConfig({ product: "Example", repository: "https://github.com/example/repo", trackers: [
    { name: "Linear", pattern: "ENG-[1-9][0-9]*", url: "https://a.example/{id}" },
    { name: "Linear", pattern: "DES-[1-9][0-9]*", url: "https://b.example/{id}" },
  ] }));
  assert.match(message, /"Linear" is used twice/);
});

test("an unknown key, a pattern that does not compile and a linked tracker with no url are refused", () => {
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9]+", url: "https://t.example/{id}", colour: "red" })), /unknown key "colour"/);
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9+", url: "https://t.example/{id}" })), /does not compile/);
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9]+" })), /needs "url"/);
  assert.match(stops(() => readConfig({ product: "Example", repository: "https://github.com/example/repo", extra: 1 })), /unknown key "extra"/);
});

test("{id} is replaced at every occurrence, and percent-encoded in the URL", () => {
  const config = one({ name: "Tracker", pattern: "T-[1-9][0-9]*", url: "https://t.example/{id}/view?key={id}" });
  assert.equal(resolveTicket("T-7", config, "f").href, "https://t.example/T-7/view?key=T-7");
  const loose = one({ name: "Loose", pattern: "[a-z/?#]+", url: "https://t.example/browse/{id}" });
  assert.equal(resolveTicket("a/b?c#d", loose, "f").href, "https://t.example/browse/a%2Fb%3Fc%23d");
});

test("a named group fills the url and the label", () => {
  const config = readConfig(CONFIG);
  const ticket = resolveTicket("repo#45", config, "f");
  assert.deepEqual(ticket, { tracker: "GitHub", id: "repo#45", label: "issue #45", show: "link", href: "https://github.com/example/repo/issues/45" });
});

test("show: link (the default) links the id, text shows it unlinked, none records it and is not published", () => {
  const config = readConfig({ product: "Example", repository: "https://github.com/example/repo", trackers: [
    { name: "Linear", pattern: "ENG-[1-9][0-9]*", url: "https://linear.app/example/issue/{id}" },
    { name: "Jira", pattern: "PROJ-[1-9][0-9]*", url: "https://example.atlassian.net/browse/{id}", show: "text" },
    { name: "Support", pattern: "SUP-[1-9][0-9]*", show: "none" },
  ] });
  assert.equal(resolveTicket("ENG-1", config, "f").href, "https://linear.app/example/issue/ENG-1");
  assert.equal(resolveTicket("PROJ-2", config, "f").href, undefined);
  assert.equal(resolveTicket("PROJ-2", config, "f").show, "text");
  assert.equal(resolveTicket("SUP-3", config, "f").show, "none");
  assert.match(stops(() => one({ name: "Tracker", pattern: "T-[0-9]+", url: "https://t.example/{id}", show: "hidden" })), /link, text or none/);
});

test("people are keys with a name; the config needs a product and a repository", () => {
  assert.match(stops(() => readConfig({ repository: "https://github.com/example/repo" })), /product/);
  assert.match(stops(() => readConfig({ product: "Example" })), /repository/);
  assert.match(stops(() => readConfig({ product: "Example", repository: "https://github.com/example/repo", people: { Sam: { name: "Sam" } } })), /lowercase/);
  assert.match(stops(() => readConfig({ product: "Example", repository: "https://github.com/example/repo", people: { sam: {} } })), /"name" is required/);
});

test("a named group that this id's match leaves unset is refused, never written as undefined", () => {
  const config = one({ name: "Tickets", pattern: "(?:OTH-[0-9]+|T-(?<n>[0-9]+))", url: "https://tickets.example/{n}" });
  assert.equal(resolveTicket("T-7", config, "f").href, "https://tickets.example/7");
  assert.match(stops(() => resolveTicket("OTH-2", config, "f")), /ticket "OTH-2" leaves \{n\} unset/);
});
