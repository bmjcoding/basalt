import { CubeIcon } from "@phosphor-icons/react";
import * as React from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogActions, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger,
  Avatar, Breadcrumbs, Button, Combobox, EmptyState, Field, Fieldset, Form, Heading, InlineCode, Input, Link,
  Dialog, DialogActions, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger,
  Menu, MenuCheckboxItem, MenuContent, MenuItem, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuSubmenu, MenuSubmenuTrigger, MenuTrigger,
  NumberField, Pagination, Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger, Select, Separator, Sheet, SheetActions, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger, Slider, Text, Tooltip,
} from "../src/index";

export const SUBSTRATES = [
  { value: "docker", label: "Local Docker" },
  { value: "kubernetes", label: "Kubernetes" },
  { value: "vm", label: "Virtual machine" },
  { value: "hosted", label: "Hosted sandbox", disabled: true },
];

export function FormExample() {
  const [saved, setSaved] = React.useState("");
  return (
    <Form onFormSubmit={(values) => setSaved(JSON.stringify(values))} aria-label="Create sandbox">
      <Fieldset legend="Sandbox details">
        <Field name="sandbox" label="Sandbox name" error="Enter a sandbox name."><Input required placeholder="blacksand-api" /></Field>
        <Field name="substrate" label="Substrate" error="Choose a substrate."><Combobox options={SUBSTRATES} required /></Field>
        <Field name="concurrency" label="Concurrent runs"><NumberField defaultValue={2} min={1} max={4} locale="en-US" /></Field>
      </Fieldset>
      <div><Button type="submit" variant="primary">Create sandbox</Button></div>
      <output aria-label="Saved form values">{saved}</output>
    </Form>
  );
}

export function ComboboxExample({ open = false }: { open?: boolean }) {
  return <Field label="Substrate"><Combobox options={SUBSTRATES} defaultOpen={open} placeholder="Find a substrate" /></Field>;
}

export function NumberExample() {
  return <Field label="Concurrent runs" description="Between one and four."><NumberField min={1} max={4} defaultValue={2} locale="en-US" /></Field>;
}

export function SliderExample() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Slider label="Request limit" min={0} max={100} step={5} defaultValue={40} getValueText={(_, value) => `${value} requests per minute`} />
      <Slider label="Run duration" min={0} max={60} defaultValue={[10, 30]} thumbLabels={["Minimum duration", "Maximum duration"]} getValueText={(_, value) => `${value} minutes`} />
    </div>
  );
}

export function AlertExample({ open = false, dangerFirst = false }: { open?: boolean; dangerFirst?: boolean }) {
  const [removed, setRemoved] = React.useState(false);
  const cancel = <AlertDialogCancel render={<Button>Keep sandbox</Button>} />;
  const action = <AlertDialogAction render={<Button variant="danger" onClick={() => setRemoved(true)}>Remove sandbox</Button>} />;
  return (
    <div>
      <AlertDialog defaultOpen={open}>
        <AlertDialogTrigger render={<Button variant="danger">Remove sandbox</Button>} />
        <AlertDialogContent>
          <AlertDialogTitle>Remove blacksand-api?</AlertDialogTitle>
          <AlertDialogDescription>Its runs and records stay. The sandbox and its routes will be removed.</AlertDialogDescription>
          <AlertDialogActions>{dangerFirst ? action : cancel}{dangerFirst ? cancel : action}</AlertDialogActions>
        </AlertDialogContent>
      </AlertDialog>
      <output aria-label="Removal result">{removed ? "Sandbox removed in this example." : ""}</output>
    </div>
  );
}

export function SheetExample({ open = false, side = "right" }: { open?: boolean; side?: "left" | "right" | "bottom" }) {
  const [shown, setShown] = React.useState(open);
  const [saved, setSaved] = React.useState("");
  return (
    <div>
      <Sheet open={shown} onOpenChange={setShown}>
        <SheetTrigger render={<Button>Sandbox settings</Button>} />
        <SheetContent side={side}>
          <SheetTitle>Sandbox settings</SheetTitle>
          <SheetDescription>Choose the defaults for the next run.</SheetDescription>
            <Form style={{ marginTop: 24 }} onFormSubmit={(values) => { setSaved(JSON.stringify(values)); setShown(false); }}>
              <Field label="Agent" name="agent"><Combobox options={[{ value: "claude", label: "Claude" }, { value: "codex", label: "Codex" }]} defaultValue="claude" /></Field>
              <Field label="CPU limit" name="cpu"><NumberField min={1} max={8} defaultValue={2} /></Field>
              <AlertExample />
              <SheetActions><SheetClose render={<Button>Cancel</Button>} /><Button type="submit" variant="primary">Save settings</Button></SheetActions>
            </Form>
        </SheetContent>
      </Sheet>
      <output aria-label="Saved settings">{saved}</output>
    </div>
  );
}

export function MenuOptionsExample({ open = false }: { open?: boolean }) {
  const [archived, setArchived] = React.useState(false);
  const [density, setDensity] = React.useState("default");
  const [exported, setExported] = React.useState("");
  return (
    <div>
      <Menu defaultOpen={open}>
        <MenuTrigger render={<Button>View options</Button>} />
        <MenuContent>
          <MenuCheckboxItem checked={archived} onCheckedChange={setArchived}>Show archived</MenuCheckboxItem>
          <MenuSeparator />
          <MenuRadioGroup value={density} onValueChange={setDensity}>
            <MenuRadioItem value="default">Default rows</MenuRadioItem>
            <MenuRadioItem value="compact">Compact rows</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuSubmenu>
            <MenuSubmenuTrigger>Export</MenuSubmenuTrigger>
            <MenuContent side="right" align="start">
              <MenuItem onClick={() => setExported("JSON export selected")}>Export JSON</MenuItem>
              <MenuItem onClick={() => setExported("CSV export selected")}>Export CSV</MenuItem>
            </MenuContent>
          </MenuSubmenu>
        </MenuContent>
      </Menu>
      <Text size="sm" tone="secondary">{archived ? "Archived shown" : "Archived hidden"} · {density} rows</Text>
      <output aria-label="Export result">{exported}</output>
    </div>
  );
}

export function DialogCompositionExample({ open = false }: { open?: boolean }) {
  const [result, setResult] = React.useState("");
  return <Dialog defaultOpen={open}>
    <DialogTrigger render={<Button>Route settings</Button>} />
    <DialogContent>
      <DialogTitle>Route settings</DialogTitle>
      <DialogDescription>Adjust how this sandbox reaches an allowed host.</DialogDescription>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 24 }}>
        <Field label="Transport"><Select defaultValue="https" options={[{ value: "https", label: "HTTPS" }, { value: "http", label: "HTTP" }]} /></Field>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Menu><MenuTrigger render={<Button>Route actions</Button>} /><MenuContent><MenuItem onClick={() => setResult("Route duplicated in this example.")}>Duplicate route</MenuItem></MenuContent></Menu>
          <Popover><PopoverTrigger render={<Button>Inspect policy</Button>} /><PopoverContent><PopoverTitle>Route policy</PopoverTitle><PopoverDescription>Only the hosts in this sandbox's allowlist can receive requests.</PopoverDescription></PopoverContent></Popover>
          <Tooltip content="Validate the host against the route allowlist"><Button onClick={() => setResult("Route checked in this example.")}>Check route</Button></Tooltip>
        </div>
        <output aria-label="Route action result">{result}</output>
      </div>
      <DialogActions><DialogClose render={<Button>Done</Button>} /></DialogActions>
    </DialogContent>
  </Dialog>;
}

export function NavigationExample() {
  const [page, setPage] = React.useState(1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Breadcrumbs items={[{ label: "Sandboxes", href: "#sandboxes" }, { label: "blacksand-api", href: "#sandbox" }, { label: "Runs" }]} />
      <Pagination page={page} pageCount={20} onPageChange={setPage} />
      <Text size="sm" tone="secondary">Showing page {page} of 20.</Text>
      <Link href="#documentation">Read the deployment guide</Link>
    </div>
  );
}

export function TypographyExample() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Heading level={3} size="3xl">Run agents on ground you trust</Heading>
      <Text size="md">One type scale for applications, documentation and sites.</Text>
      <Text tone="secondary">Secondary text explains the main content.</Text>
      <Text size="sm" tone="tertiary">run-0142 · 4m 12s · a81f3c2</Text>
      <Text>Start with <InlineCode>blacksand k8s run</InlineCode>.</Text>
      <Text mono size="sm">sha256:8b772e36</Text>
    </div>
  );
}

export function CompositionExample() {
  const [created, setCreated] = React.useState(false);
  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Avatar name="Bailey Jones" /><Avatar name="Alex Chen" size={40} /><Text size="sm" tone="secondary">Members</Text></div>
      <Separator />
      {created ? <Text>Sandbox created in this example.</Text> : <EmptyState icon={CubeIcon} title="No sandboxes yet" description="Create a sandbox to give your next agent run its own workspace." actions={<Button variant="primary" onClick={() => setCreated(true)}>Create your first sandbox</Button>} />}
    </div>
  );
}

export function CompletionFixtures() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32, minWidth: 0 }}>
      <section aria-label="Validated form"><FormExample /></section>
      <section aria-label="Number entry"><NumberExample /></section>
      <section aria-label="Ranges"><SliderExample /></section>
      <section aria-label="Confirmations"><AlertExample dangerFirst /></section>
      <section aria-label="Sheet"><SheetExample /></section>
      <section aria-label="Menu options"><MenuOptionsExample /></section>
      <section aria-label="Overlay composition"><DialogCompositionExample /></section>
      <section aria-label="Navigation"><NavigationExample /></section>
      <section aria-label="Typography"><TypographyExample /></section>
      <section aria-label="Composition"><CompositionExample /></section>
      <Fieldset legend="Disabled controls" disabled><Field label="Disabled number"><NumberField defaultValue={2} /></Field><Field label="Disabled search"><Combobox options={SUBSTRATES} /></Field></Fieldset>
    </div>
  );
}
