// The palette pixel proof's fixture (cimip-gaps-3 T9, DECISIONS 403, test 1): one of every reader the palettes change, built against a checkout's own dist,
// so main and the branch render the same markup. It uses only components and props that main has. The runner (palette-proof.mjs) shoots it with no
// palette attribute and with data-palette="basalt", in both themes, at 1440 and 390, at rest, hovered, pressed, focused, under more contrast and in
// forced colours; main's and the branch's shots must match pixel for pixel.
import * as React from "react";
import { createRoot } from "react-dom/client";

import {
  Button, Checkbox, ChoiceCard, ChoiceCardGroup, Combobox, Field, FileInput, IconButton, Input, Link, LinkTab, LinkTabs, NumberField, OptionChips, Pagination,
  Radio, RadioGroup, RichText, SearchField, SearchTrigger, Segment, SegmentedControl, Select, Switch, Tab, Tabs, TabsList, TabsPanel, TextButton, Textarea,
  ThemeChoiceControl, PlusGlyph,
} from "@srasyndicate/basalt";

const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" };
const column: React.CSSProperties = { display: "grid", gap: 16, maxWidth: 360 };

function Search() {
  const [value, setValue] = React.useState("granite");
  return <SearchField label="Search the catalogue" value={value} onValueChange={setValue} />;
}

function Readers() {
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={row}>
        {(["primary", "secondary", "outline", "ghost", "danger"] as const).map((variant) => <Button key={variant} variant={variant}>{variant}</Button>)}
        <IconButton icon={PlusGlyph} label="Add" variant="secondary" />
      </div>
      <div style={row}>
        {(["sm", "md", "lg", "xl"] as const).map((size) => <Button key={size} size={size} variant="primary">Size {size}</Button>)}
        <Button variant="secondary" size="lg">Large</Button>
      </div>
      <div style={row}>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="secondary" disabled>Disabled</Button>
        <Button variant="outline" disabled>Disabled</Button>
        <Button variant="primary" loading>Saving</Button>
        <Button variant="secondary" loading>Saving</Button>
      </div>
      <div style={row}>
        <Button variant="primary" count={3}>Basket</Button>
        <Button variant="primary" count={0}>Saved</Button>
        <Button variant="secondary" count={12}>Filters</Button>
        <Button variant="primary" amount="$24.00">Pay</Button>
      </div>
      <div style={{ ...row, maxWidth: 420 }}>
        <Button variant="primary" note="Ships in two days">Standard delivery</Button>
        <Button variant="secondary" note="Pick up on Friday">Collect</Button>
      </div>
      <Pagination page={3} pageCount={9} onPageChange={() => {}} />
      <Pagination page={2} pageCount={5} hrefForPage={(n) => `#page-${n}`} />
      <Tabs defaultValue="b">
        <TabsList>
          <Tab value="a">Overview</Tab>
          <Tab value="b">Readings</Tab>
          <Tab value="c">History</Tab>
        </TabsList>
      </Tabs>
      <Tabs defaultValue="b" orientation="vertical">
        <TabsList>
          <Tab value="a">General</Tab>
          <Tab value="b">Sharing</Tab>
          <Tab value="c">Billing</Tab>
        </TabsList>
        <TabsPanel value="a">General</TabsPanel>
        <TabsPanel value="b">Sharing</TabsPanel>
        <TabsPanel value="c">Billing</TabsPanel>
      </Tabs>
      <LinkTabs aria-label="Sections">
        <LinkTab href="#one">One</LinkTab>
        <LinkTab href="#two" current>Two</LinkTab>
        <LinkTab href="#three">Three</LinkTab>
      </LinkTabs>
      <SegmentedControl defaultValue="week" aria-label="Range">
        <Segment value="day">Day</Segment>
        <Segment value="week">Week</Segment>
        <Segment value="month">Month</Segment>
      </SegmentedControl>
      <ThemeChoiceControl />
      <div style={row}>
        <Checkbox defaultChecked>Checked</Checkbox>
        <Checkbox indeterminate>Mixed</Checkbox>
        <Checkbox>Off</Checkbox>
        <Checkbox defaultChecked disabled>Disabled</Checkbox>
        <Switch defaultChecked>On</Switch>
        <Switch>Off</Switch>
      </div>
      <RadioGroup defaultValue="b" aria-label="Size">
        <Radio value="a">Small</Radio>
        <Radio value="b">Medium</Radio>
      </RadioGroup>
      <OptionChips legend="Finish" options={[{ value: "matte", label: "Matte" }, { value: "gloss", label: "Gloss" }, { value: "satin", label: "Satin", unavailable: "Out of stock" }]} defaultValue="matte" />
      <ChoiceCardGroup>
        <ChoiceCard name="plan" value="a" title="Monthly" description="Billed each month" defaultChecked />
        <ChoiceCard name="plan" value="b" title="Yearly" description="Billed once a year" />
      </ChoiceCardGroup>
      <div style={column}>
        <Field label="Name"><Input defaultValue="Ada" /></Field>
        <Field label="Large"><Input controlSize="lg" defaultValue="Large field" /></Field>
        <Field label="Extra large"><Input controlSize="xl" defaultValue="Extra large field" /></Field>
        <Field label="Invalid" error="Enter a name"><Input defaultValue="" aria-invalid /></Field>
        <Field label="Disabled"><Input defaultValue="Locked" disabled /></Field>
        <Field label="Notes"><Textarea defaultValue="Two lines of notes" /></Field>
        <Field label="Region"><Select options={[{ value: "n", label: "North" }, { value: "s", label: "South" }]} defaultValue="n" /></Field>
        <Field label="Colour"><Combobox options={[{ value: "slate", label: "Slate" }, { value: "sand", label: "Sand" }]} /></Field>
        <Field label="Quantity"><NumberField defaultValue={2} /></Field>
        <Field label="Attachment"><FileInput /></Field>
        <Search />
        <SearchTrigger />
      </div>
      <div data-density="compact" style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <Button size="lg" variant="primary">Compact large</Button>
        <Field label="Compact large"><Input controlSize="lg" defaultValue="Compact" /></Field>
        <Tabs defaultValue="a"><TabsList><Tab value="a">One</Tab><Tab value="b">Two</Tab></TabsList></Tabs>
      </div>
      <p style={{ margin: 0 }}>
        A <Link href="#a">link in a sentence</Link>, a <TextButton>text button</TextButton> and a <TextButton quiet>quiet one</TextButton>.
      </p>
      <RichText><p>Rich text with <a href="#b">an inline link</a>.</p></RichText>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Readers />);
