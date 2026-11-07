// The walkthrough page for one review round: a step per component, each with what it is,
// what review decided, what to try, and the live component. Built into one self-contained
// HTML file by build.mjs. URL parameters: ?step=<id>&theme=dark|light&state=<name>&shot=1
// (shot mode shows only the demo, for screenshots).

import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import * as React from "react";
import { createRoot } from "react-dom/client";

import { Button, Kbd, Segment, SegmentedControl, ToastProvider, TooltipProvider } from "../../packages/react/src/index";
import { ROUNDS } from "./rounds";

declare global {
  interface Window {
    __BASALT_ROUND__: string;
    __BASALT_STEPS__: Array<{ id: string; name: string; states: string[] }>;
  }
}

const round = ROUNDS.find((r) => r.id === window.__BASALT_ROUND__)!;
// for build.mjs: which steps and states to screenshot
window.__BASALT_STEPS__ = round.steps.map((s) => ({ id: s.id, name: s.name, states: s.states ?? [] }));
const params = new URLSearchParams(location.search);
const shot = params.get("shot") === "1";
const initialTheme = params.get("theme") ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
const state = params.get("state") ?? "default";
const BRANDS = [
  ["basalt", "Basalt"],
  ["sra", "SRA"],
  ["blacksand", "Blacksand"],
  ["n1", "N1"],
  ["portfolio", "Portfolio"],
] as const;

function App() {
  const [theme, setTheme] = React.useState(initialTheme);
  const [brand, setBrand] = React.useState(params.get("brand") ?? "basalt");
  const [hue, setHue] = React.useState(Number(params.get("hue") ?? 255));
  const [index, setIndex] = React.useState(() => Math.max(0, round.steps.findIndex((s) => s.id === params.get("step"))));
  const step = round.steps[index]!;

  React.useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    if (brand === "basalt") delete document.documentElement.dataset.brand;
    else document.documentElement.dataset.brand = brand;
    document.documentElement.style.setProperty("--basalt-accent-h", String(hue));
  }, [theme, brand, hue]);

  React.useEffect(() => {
    if (shot) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, [role=dialog], [role=menu], [role=listbox]")) return;
      if (e.key === "ArrowRight" && e.altKey) setIndex((i) => Math.min(round.steps.length - 1, i + 1));
      if (e.key === "ArrowLeft" && e.altKey) setIndex((i) => Math.max(0, i - 1));
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  if (shot) {
    return (
      <div className="wt-shot" data-step={step.id}>
        {step.demo({ state })}
      </div>
    );
  }

  return (
    <div className="wt">
      <header className="wt-head">
        <div>
          <div className="wt-eyebrow">Basalt review · Round {round.id}</div>
          <h1 className="wt-title">{round.title}</h1>
        </div>
        <div className="wt-controls">
          <div className="wt-brands" role="group" aria-label="Brand">
            {BRANDS.map(([id, name]) => (
              <Button key={id} size="sm" variant={brand === id ? "secondary" : "ghost"} aria-pressed={brand === id} onClick={() => setBrand(id)}>
                {name}
              </Button>
            ))}
          </div>
          {brand === "n1" ? (
            <label className="wt-hue">
              Hue
              <input type="range" min={0} max={359} value={hue} aria-label="N1 accent hue" onChange={(event) => setHue(Number(event.target.value))} />
            </label>
          ) : null}
          <SegmentedControl aria-label="Theme" value={theme} onValueChange={setTheme}>
            <Segment value="dark">Dark</Segment>
            <Segment value="light">Light</Segment>
          </SegmentedControl>
        </div>
      </header>
      <p className="wt-summary">
        {round.summary}{" "}
        {round.pr ? <a href={round.pr} target="_blank" rel="noreferrer">Pull request</a> : <span>Awaiting owner review</span>}
      </p>

      <div className="wt-body">
        <nav className="wt-rail" aria-label="Steps">
          {round.steps.map((s, i) => (
            <button key={s.id} type="button" className="wt-rail-item" aria-current={i === index ? "step" : undefined} onClick={() => setIndex(i)}>
              <span className="wt-rail-n">{String(i + 1).padStart(2, "0")}</span>
              {s.name}
            </button>
          ))}
        </nav>

        <main className="wt-main" key={step.id}>
          <div className="wt-step-n">
            Step {index + 1} of {round.steps.length}
          </div>
          <h2 className="wt-step-title">{step.name}</h2>
          <p className="wt-intro">{step.intro}</p>

          <section className="wt-stage" aria-label={`${step.name} demo`}>
            {step.demo({ state: "default" })}
          </section>

          <div className="wt-notes">
            <section>
              <h3>Try it</h3>
              <ul>
                {step.tryIt.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
            <section>
              <h3>{(round.reviewed ?? Boolean(round.pr)) ? "Decided in review" : "Design decisions"}</h3>
              <ul>
                {step.decisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          </div>

          <div className="wt-pager">
            <Button variant="ghost" icon={ArrowLeftIcon} disabled={index === 0} onClick={() => setIndex(index - 1)}>
              {index > 0 ? round.steps[index - 1]!.name : "Previous"}
            </Button>
            <span className="wt-hint">
              <Kbd>⌥</Kbd> <Kbd>←</Kbd> <Kbd>→</Kbd>
            </span>
            <Button variant={index === round.steps.length - 1 ? "secondary" : "primary"} iconEnd={ArrowRightIcon} disabled={index === round.steps.length - 1} onClick={() => setIndex(index + 1)}>
              {index < round.steps.length - 1 ? round.steps[index + 1]!.name : "Done"}
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </TooltipProvider>,
);
