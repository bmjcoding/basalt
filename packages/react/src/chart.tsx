import * as React from "react";

import { join } from "./utils";

export interface ChartGrammarProps {
  className?: string;
  /** Caption above the figure. Defaults to the grammar's name. */
  label?: string;
}

/**
 * The chart grammar, drawn small: a plan is an outlined band, an observation is a solid mark,
 * and a missing span is a hatch. Words name each one. This is the pattern, not a chart library.
 */
export function ChartGrammar({ className, label = "Week of load" }: ChartGrammarProps) {
  const rawId = React.useId().replace(/:/g, "");
  const titleId = `basalt-chart-${rawId}`;
  const hatchId = `basalt-hatch-${rawId}`;
  const days = [
    { x: 16, plan: 36, observed: 28, missing: false },
    { x: 64, plan: 40, observed: 44, missing: false },
    { x: 112, plan: 44, observed: 30, missing: false },
    { x: 160, plan: 48, observed: null, missing: true },
    { x: 208, plan: 42, observed: 46, missing: false },
    { x: 256, plan: 38, observed: 34, missing: false },
    { x: 304, plan: 36, observed: 22, missing: false },
  ];
  return (
    <figure className={join("basalt-chart", className)}>
      <figcaption className="basalt-eyebrow">{label}</figcaption>
      <svg viewBox="0 0 360 120" role="img" aria-labelledby={titleId}>
        <title id={titleId}>Seven days. The plan is an outlined band, observations are solid marks, and the fourth day is missing.</title>
        <defs>
          <pattern id={hatchId} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--basalt-chart-missing)" strokeWidth="1" />
          </pattern>
        </defs>
        {[32, 64, 96].map((y) => (
          <line key={y} x1="12" x2="348" y1={y} y2={y} stroke="var(--basalt-chart-grid)" strokeWidth="1" />
        ))}
        <line x1="12" x2="348" y1="104" y2="104" stroke="var(--basalt-chart-axis)" strokeWidth="1" />
        {days.map((day) => {
          const top = 104 - day.plan;
          return (
            <g key={day.x}>
              <rect x={day.x} y={top} width="28" height={day.plan} fill={day.missing ? `url(#${hatchId})` : "var(--basalt-chart-plan-fill)"} stroke="var(--basalt-chart-plan)" strokeWidth="1.5" />
              {day.observed != null ? <circle cx={day.x + 14} cy={104 - day.observed} r="4" fill="var(--basalt-chart-observation)" /> : null}
            </g>
          );
        })}
      </svg>
      <ul className="basalt-chart-legend">
        <li>
          <span className="basalt-chart-swatch" data-kind="plan" aria-hidden="true" />
          Plan, outlined
        </li>
        <li>
          <span className="basalt-chart-swatch" data-kind="observation" aria-hidden="true" />
          Observation, solid
        </li>
        <li>
          <svg className="basalt-chart-swatch" data-kind="missing" viewBox="0 0 12 12" aria-hidden="true">
            <rect width="12" height="12" fill={`url(#${hatchId})`} stroke="var(--basalt-chart-missing)" strokeWidth="1" />
          </svg>
          Missing, hatched
        </li>
      </ul>
    </figure>
  );
}
