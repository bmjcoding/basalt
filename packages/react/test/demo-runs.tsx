// The stages and runs (DECISIONS 316) on the demo page, for the browser tests' axe pass in both themes. Synthetic data only.
import * as React from "react";

import { Button, RunAnnouncer, RunStage, RunTimer, StageBadge, StageList, StageMark, StageRail } from "../src/index";
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
      <StageList label="Deploy 812 stages">
        <RunStage name="Clone" state="success" meta="main@4f2a1c0" start={0} end={800} />
        <RunStage name="Test" state="failed" meta="unit and e2e" start={0} end={1400}
          detail={<><p><strong>3 tests failed</strong> in <code>session.test.ts</code></p><small>Exit 1 · attempt 1 of 2</small></>}
          action={<Button size="sm" variant="secondary">Retry</Button>} />
        <RunStage name="Deploy" state="skipped" word="Blocked by Test" meta="production" />
      </StageList>
      <StageRail label="Release v2.14.0 stages">
        <RunStage name="Build" state="success" start={0} end={2100} />
        <RunStage name="Checks" state="failed" start={0} end={2600} />
        <RunStage name="Deploy" state="canceled" />
      </StageRail>
      <p style={{ margin: 0 }}>Build took <RunTimer start={0} end={12_300} /></p>
      <RunAnnouncer label="Deploy 812 updates" events={[{ id: "start", text: "Deploy 812 started" }]} />
    </section>
  );
}
