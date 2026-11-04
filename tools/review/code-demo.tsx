import * as React from "react";

import { CodeBlock, Field, Select } from "../../packages/react/src/index";

const SAMPLES = [
  { value: "bash", label: "Shell", title: "terminal", code: '# Run a task\n./blacksand k8s run --repo ~/code/project --prompt-file task.md \\\n  --agent claude --out runs/first-task' },
  { value: "typescript", label: "TypeScript", title: "routes.ts", code: '// Keys stay outside the sandbox.\ninterface Route {\n  host: string;\n  limit: number;\n}\n\nexport function createRoute(host: string): Route {\n  return { host, limit: 60 };\n}\n\nconst route = createRoute("api.anthropic.com");' },
  { value: "tsx", label: "TSX", title: "DeployButton.tsx", code: 'import { Button } from "@srasyndicate/basalt";\n\nexport function DeployButton() {\n  return <Button variant="primary">Deploy sandbox</Button>;\n}' },
  { value: "swift", label: "Swift", title: "RunView.swift", code: 'import SwiftUI\nimport BasaltTokens\n\nstruct RunView: View {\n  var body: some View {\n    Text("Ready to deploy")\n      .basaltType(Basalt.TypeScale.base, weight: .medium)\n      .foregroundStyle(Basalt.Colors.textPrimary.color)\n      .padding(Basalt.Space.s4)\n  }\n}' },
  { value: "json", label: "JSON", title: "route.json", code: '{\n  "host": "api.anthropic.com",\n  "agent": "claude",\n  "requestLimit": 60,\n  "enabled": true\n}' },
  { value: "yaml", label: "YAML", title: "run.yaml", code: '# A run configuration\nagent: claude\nroutes:\n  - host: api.anthropic.com\n    requestLimit: 60\nenabled: true' },
  { value: "python", label: "Python", title: "route.py", code: '# Only declared hosts are allowed.\ndef create_route(host: str, limit: int = 60):\n    return {"host": host, "limit": limit}\n\nroute = create_route("api.anthropic.com")\nprint(route)' },
  { value: "text", label: "Plain text", title: "run.log", code: 'Preparing workspace\nStarting agent\nTask finished: 3 files changed\n\nPlain text and unknown languages keep their original text.' },
  { value: "html", label: "HTML", title: "index.html", code: '<!-- Application root -->\n<main class="page">\n  <h1>Sandboxes</h1>\n  <button type="button">Deploy</button>\n</main>' },
];

/** The same component, in several grammars. Also used to capture each language for review. */
export function CodeDemo({ initialLanguage = "bash" }: { initialLanguage?: string }) {
  const [language, setLanguage] = React.useState(initialLanguage);
  const sample = SAMPLES.find((s) => s.value === language) ?? SAMPLES[0]!;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <div style={{ width: 220 }}>
        <Field label="Language">
          <Select value={sample.value} onValueChange={(v) => setLanguage(v ?? "bash")} options={SAMPLES.map(({ value, label }) => ({ value, label }))} />
        </Field>
      </div>
      <CodeBlock title={sample.title} language={sample.value} code={sample.code} />
      <div aria-label="Syntax colours" style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", fontFamily: "var(--basalt-font-family-mono)", fontSize: 12 }}>
        {["keyword", "string", "constant", "function", "type", "comment"].map((role) => <span key={role} style={{ color: `var(--basalt-syntax-${role})` }}>{role}</span>)}
      </div>
    </div>
  );
}
