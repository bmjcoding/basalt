import * as React from "react";
import { Button, Field, Input, Select, Switch } from "../../packages/react/src/index";

export function DensityDemo() {
  const [compact, setCompact] = React.useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Switch checked={compact} onCheckedChange={setCompact}>Compact controls</Switch>
      <div data-density={compact ? "compact" : "default"} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(["xs", "sm", "md", "lg", "xl"] as const).map((size) => <Button key={size} size={size}>{size.toUpperCase()}</Button>)}
        </div>
        <Field label="Sandbox name"><Input defaultValue="blacksand-api" /></Field>
        <Field label="Region"><Select options={[{ value: "iad", label: "Washington, D.C." }, { value: "sfo", label: "San Francisco" }]} defaultValue="iad" /></Field>
      </div>
    </div>
  );
}
