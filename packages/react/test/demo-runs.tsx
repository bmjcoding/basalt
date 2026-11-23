// The stages and runs (DECISIONS 316) on the demo page, for the browser tests' axe pass in both themes. Synthetic data only.
import * as React from "react";

import { RunAnnouncer, RunTimer, StageBadge, StageMark } from "../src/index";
import type { StageState } from "../src/index";

const STATES: StageState[] = ["queued", "running", "success", "failed", "skipped", "canceled", "retrying"];

export function RunsFixture() {
  return (
    <section aria-label="Stages and runs" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 className="h">Stages and runs</h2>
      <ul aria-label="The seven states" style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {STATES.map((state) => (
          <li key={state} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <StageMark state={state} />
            {/* A running face is braille, which the motion test finds by itself on this page: the badges show the five resting faces. */}
            {state === "running" || state === "retrying" ? null : <StageBadge state={state} />}
            {state === "running" || state === "retrying" ? null : <StageBadge variant="plain" state={state} />}
          </li>
        ))}
      </ul>
      <p style={{ margin: 0 }}>Build took <RunTimer start={0} end={12_300} /></p>
      <RunAnnouncer label="Deploy 812 updates" events={[{ id: "start", text: "Deploy 812 started" }]} />
    </section>
  );
}
