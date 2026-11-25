// The shared time scale (DECISIONS 359, the answers' section 3): arithmetic only, in Node against the built module. Written while tests are paused
// (DECISIONS 359): not yet run. The implementation hasn't been reviewed.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test } from "node:test";

import { pkg } from "./support.mjs";

const S = await import(pathToFileURL(path.join(pkg, "dist", "diagram-scale.js")).href);
const DAY = 86_400_000;

describe("the readers", () => {
  test("a day is whole days from 1970-01-01, whatever the process zone (Pacific/Kiritimati and America/Los_Angeles)", () => {
    const code = `import(${JSON.stringify(pathToFileURL(path.join(pkg, "dist", "diagram-scale.js")).href)}).then((s) => console.log(s.dayNumber("2026-11-24")))`;
    const read = (TZ) => execFileSync(process.execPath, ["-e", code], { env: { ...process.env, TZ }, encoding: "utf8" }).trim();
    assert.equal(read("Pacific/Kiritimati"), String(Date.UTC(2026, 10, 24) / DAY));
    assert.equal(read("America/Los_Angeles"), String(Date.UTC(2026, 10, 24) / DAY));
  });
  test("a day that is not one, and an instant without its offset, are null", () => {
    assert.equal(S.dayNumber("2026-02-30"), null);
    assert.equal(S.instantOf("2026-11-24T14:03:00"), null);
    assert.equal(S.instantOf("2026-11-24T14:03:00Z"), Date.UTC(2026, 10, 24, 14, 3));
  });
});

describe("the map", () => {
  test("with no breaks a place is (value − a) ÷ (b − a) × length, to 0.01px, at three lengths", () => {
    for (const length of [320, 816, 1104]) {
      const m = S.scaleMap({ domain: [20_000, 20_031], length });
      for (const v of [20_000, 20_007.5, 20_031]) assert.ok(Math.abs(m.position(v) - ((v - 20_000) / 31) * length) < 0.01);
    }
  });
  test("one rate on both sides of a break, the break a fixed gap", () => {
    const m = S.scaleMap({ domain: [0, 100], length: 532, breaks: [[30, 70]], gap: 32 });
    assert.ok(Math.abs(m.position(30) - m.position(0) - 30 * m.rate) < 1e-9);
    assert.ok(Math.abs(m.position(100) - m.position(70) - 30 * m.rate) < 1e-9);
    assert.ok(Math.abs(m.position(70) - m.position(30) - 32) < 1e-9);
  });
  test("reversed is the length less the position", () => {
    const a = S.scaleMap({ domain: [0, 10], length: 500 }), b = S.scaleMap({ domain: [0, 10], length: 500, reversed: true });
    for (const v of [0, 2.5, 10]) assert.ok(Math.abs(b.position(v) - (500 - a.position(v))) < 1e-9);
  });
  test("the module never makes a domain: it is required, and used as written", () => {
    const m = S.scaleMap({ domain: [3, 17], length: 100 });
    assert.deepEqual(m.domain, [3, 17]);
  });
});

describe("ticks", () => {
  test("the count never passes the length over the distance, plus one; no end ticks are added", () => {
    for (const length of [200, 640, 1104]) {
      const m = S.scaleMap({ domain: [20_000.3, 20_090.7], length });
      const t = S.ticks(m, S.dayLadder(), 56);
      assert.ok(t.length <= Math.floor(length / 56) + 1);
      for (const k of t) assert.ok(Number.isInteger(k.value));
      for (let i = 1; i < t.length; i++) assert.ok(t[i].place - t[i - 1].place >= 56 - 1e-6);
    }
  });
  test("numbers step by 1, 2, 2.5 and 5 times a power of ten", () => {
    const t = S.ticks(S.scaleMap({ domain: [0, 100], length: 600 }), S.numberLadder(100 / 600, 100), 56);
    assert.deepEqual(t.map((k) => k.value), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });
  test("none inside a left-out span", () => {
    const m = S.scaleMap({ domain: [0, 3_000_000], length: 1000, breaks: [[780_000, 2_640_000]], gap: 32 });
    for (const k of S.ticks(m, S.clockLadder(), 144)) assert.ok(!(k.value > 780_000 && k.value < 2_640_000));
  });
  test("an hour's ticks in Asia/Kolkata are on that zone's hours", () => {
    const offset = () => 330;
    const m = S.scaleMap({ domain: [Date.UTC(2026, 10, 24, 0, 0), Date.UTC(2026, 10, 24, 12, 0)], length: 1600 });
    const t = S.ticks(m, S.clockLadder(offset), 144);
    assert.ok(t.length > 1);
    for (const k of t) assert.equal((k.value + 330 * 60_000) % 3_600_000, 0);
  });
  test("roundOut finds a step and a domain together, the extent widened to that step's ticks", () => {
    const r = S.roundOut([Date.UTC(2026, 10, 24, 14, 1), Date.UTC(2026, 10, 24, 14, 46)], S.clockLadder(), 144, 1000);
    assert.ok(r.domain[0] <= Date.UTC(2026, 10, 24, 14, 1) && r.domain[1] >= Date.UTC(2026, 10, 24, 14, 46));
  });
});

describe("a date's words", () => {
  test("the year on the first and on the first of each later year", () => {
    const d = (y, m, dd) => Date.UTC(y, m, dd) / DAY;
    assert.deepEqual(S.datesWords([d(2026, 11, 28), d(2027, 0, 4), d(2027, 0, 11)]), ["Dec 28, 2026", "Jan 4, 2027", "Jan 11"]);
  });
});
