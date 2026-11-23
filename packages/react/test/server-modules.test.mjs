// audit-fix-c8, A5-18 (engineering): a React Server Component can use what the package holds that is neither a component nor a hook. A value imported from a
// "use client" module is a reference in a Server Component: calling a formatter throws and `CONFIRM_MS / 1000` is NaN. So the modules that hold such values must
// not carry the directive, and must not import code that does (React, Base UI, Phosphor, cmdk) on their own. The packed consumer (scripts/verify-packages.mjs)
// proves it in a real Server Component build; this reads the built files, and needs no browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { pkg } from "./support.mjs";

const dist = path.join(pkg, "dist");
const read = (file) => fs.readFileSync(path.join(dist, file), "utf8");
const hasDirective = (file) => /^"use client";/.test(read(file));
const staticImports = (file) => [...read(file).matchAll(/(?:\bfrom|^import)\s*"([^"]+)"/gm)].map((match) => match[1]);
const clientPackage = /^(react|react-dom|@base-ui|@phosphor-icons|cmdk)(\/|$)/;

// Where each export of the package entry comes from: the barrel is `import { a, b } from "./x.js"; export { a, b };`.
const home = new Map();
{
  const barrel = read("index.js");
  for (const match of barrel.matchAll(/import\s*\{([^}]*)\}\s*from\s*"\.\/([^"]+)"/g)) for (const name of match[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()).filter(Boolean)) home.set(name, match[2]);
  for (const match of barrel.matchAll(/export\s*\{([^}]*)\}\s*from\s*"\.\/([^"]+)"/g)) for (const name of match[1].split(",").map((part) => part.trim().split(/\s+as\s+/).pop()).filter(Boolean)) home.set(name, match[2]);
}

// Every value the package exports that is neither a component nor a hook: the ones a Server Component may reach for. The two that are left out are listed with why.
const PLAIN = [
  "AMBIENT_MAX", "CONFIRM_MS", "COPIED_MS", "ENTRANCE_LATE_MS", "LOOPS_TOGGLE_DESCRIPTION", "LOOPS_TOGGLE_NAME", "REFLOW_BOUND", "STATUS_MESSAGE_MS", "TRAVEL_IN_FLIGHT",
  "TRAVEL_LONG_LEG", "TRAVEL_MIN_LEG", "TRAVEL_MS_PER_PX", "TRAVEL_RUN_LIMIT", "TRAVEL_SHORT_LEG", "WAIT_MIN_SHOWN_MS", "WAIT_SHOW_AFTER_MS", "ambient", "ambientTiming", "createTravellers", "entranceKey",
  "entranceSeen", "entranceStep", "entranceVerdict", "forgetEntrance", "formatAge", "formatClock", "formatCountdown", "formatDay", "formatElapsed", "formatStamp", "formatStatTime",
  "holdFirstPaint", "isApplePlatform", "isModKey", "KEEP", "fillIn", "forgetCount", "lockupDrawing", "loopsBootstrap", "markEntranceSeen", "markPageChange", "markPageStart", "preloadCodeLanguages", "rememberCount", "rememberedCount", "shareOf", "sortRows", "standIn", "themeBootstrap", "trailingMean", "travelLeg", "travelRun", "travelTokens", "typingStatus",
];
const LEFT_IN_A_CLIENT_MODULE = {
  // Base UI's `createHandle`: a handle ties a trigger to a popover, both on the client, and an object made on the server could not be passed to either.
  createPopoverHandle: "feedback.js",
  // Still beside `CoverageStrip` in coverage-strip.tsx (that file is being changed by another batch, audit-fix-c7): moving it is one hunk, to a module of its own.
  coverageWords: "coverage-strip.js",
};

test("the package entry is a barrel with no directive, and the plain values come from modules with none", async () => {
  assert.ok(!hasDirective("index.js"), "dist/index.js carries \"use client\": every export would be a client reference");
  for (const name of PLAIN) {
    const file = home.get(name);
    assert.ok(file, `${name} is not exported by the package entry`);
    assert.ok(!hasDirective(file), `${name} comes from ${file}, which carries "use client"`);
  }
});

test("a module without the directive imports no React, Base UI, Phosphor or cmdk, directly or through a shared chunk, and reaches only plain code or client modules", () => {
  for (const name of PLAIN) {
    const seen = new Set();
    const walk = (file, via) => {
      if (seen.has(file)) return;
      seen.add(file);
      if (file !== via && hasDirective(file)) return; // a client module is a reference there: importing it is safe, calling it is not (the packed consumer proves the calls)
      for (const specifier of staticImports(file)) {
        assert.ok(!clientPackage.test(specifier), `${name} (${home.get(name)}) reaches "${specifier}" through ${file}, so a Server Component cannot load it`);
        if (specifier.startsWith("./")) walk(specifier.slice(2), via);
      }
    };
    walk(home.get(name), home.get(name));
  }
});

test("every module with a component or a hook has the directive, and a chunk never does", () => {
  for (const name of ["Button", "Menu", "Clock", "useLoops", "useTheme", "CodeBlock", "ShareBar", "Stat"]) assert.ok(hasDirective(home.get(name)), `${name} comes from ${home.get(name)}, which has no "use client"`);
  for (const chunk of fs.readdirSync(dist).filter((file) => file.startsWith("chunk-") && file.endsWith(".js"))) assert.ok(!hasDirective(chunk), `${chunk} carries "use client"`);
  assert.ok(hasDirective("command-panel.js"), "the lazy command panel is a client module of its own");
});

test("the values that are neither components nor hooks are the ones listed here, so a new one is noticed", async () => {
  const entry = await import(pathToFileURL(path.join(dist, "index.js")).href);
  const plain = Object.entries(entry)
    .filter(([name, value]) => !(typeof value === "function" && /^[A-Z]/.test(name) && !/^[A-Z0-9_]+$/.test(name)) && !(value && typeof value === "object" && value.$$typeof) && !/^use[A-Z]/.test(name))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(plain, [...PLAIN, ...Object.keys(LEFT_IN_A_CLIENT_MODULE)].sort(), "a plain value was added or moved: put it in a module of its own with no directive, and list it here");
  for (const [name, file] of Object.entries(LEFT_IN_A_CLIENT_MODULE)) assert.equal(home.get(name), file);
});

test("the plain values work in Node with no browser and no React render, and are the tokens' numbers", async () => {
  const entry = await import(pathToFileURL(path.join(dist, "index.js")).href);
  const { duration } = await import("@srasyndicate/basalt-tokens/durations");
  assert.equal(entry.CONFIRM_MS, duration.confirm);
  assert.equal(entry.COPIED_MS, duration.confirm);
  const at = new Date(0);
  assert.deepEqual(entry.formatStamp(at, { timeZone: "UTC" }), { text: "00:00:00", dateTime: "1970-01-01T00:00:00" });
  assert.equal(entry.formatClock(at, { timeZone: "UTC" }).dateTime, "1970-01-01T00:00");
  assert.equal(entry.formatDay(at, { timeZone: "UTC", now: at }).dateTime, "1970-01-01");
  assert.equal(entry.formatStatTime(at, { timeZone: "UTC", now: at }).dateTime, "1970-01-01T00:00");
  assert.deepEqual(entry.shareOf([1, 1]), [50, 50]);
  assert.deepEqual(entry.trailingMean([1, 2, 3, 4], { window: 3, min: 3 }), [null, null, 2, 3]);
  assert.equal(entry.ambient(0)?.["data-ambient"], "");
  assert.equal(entry.ambient(entry.AMBIENT_MAX), undefined);
  assert.match(entry.loopsBootstrap, /basalt-loops/);
  assert.match(entry.themeBootstrap, /basalt-theme/);
});
