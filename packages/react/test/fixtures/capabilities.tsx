// What an app can still pass to Basalt's wrappers, though their declarations are Basalt's own and name no
// Base UI type. Compiled as an installed consumer would (scripts/verify-packages.mjs) and against dist
// (test/types.test.mjs). Each `@ts-expect-error` is something that must stay refused.
import * as React from "react";
import {
  Accordion, AlertDialog, Badge, BadgePair, Button, Checkbox, ChoiceCard, ChoiceCardGroup, IconButton, Link, Combobox, Dialog, DialogContent, Field, Form, HomeGlyph, Menu, MenuContent, MenuRadioGroup, MenuRadioItem,
  MenuSeparator, MenuSubmenu, Nav, NavGroup, NavItem, NumberField, Popover, Radio, RadioGroup, SegmentedControl, Segment, Select, Sheet, Slider, Switch, Tab, Tabs,
  TabsList, TabsPanel,
} from "@srasyndicate/basalt";

const focus = React.createRef<HTMLButtonElement>();
const popupActions = React.createRef<{ unmount(): void; close(): void }>();
const validation = React.createRef<{ validate(fieldName?: string): void }>();

// Menu: where focus goes on close, imperative actions, highlight callback, holding the popup for an outside animation.
export const menu = (
  <Menu
    actionsRef={popupActions}
    triggerId="first"
    onItemHighlighted={(item, details) => `${item?.id}${details.label}${details.reason}`}
    onOpenChange={(open, details) => { if (!open) details.preventUnmountOnClose(); }}
  >
    <MenuContent finalFocus={focus} />
    <MenuSeparator orientation="vertical" />
    <MenuRadioGroup value={2} onValueChange={(value) => value.toFixed()} onChange={(event) => event.type}>
      <MenuRadioItem value={2}>Two</MenuRadioItem>
    </MenuRadioGroup>
    <MenuSubmenu actionsRef={popupActions} onItemHighlighted={(item) => item?.id} />
  </Menu>
);

// Dialog, alert dialog, sheet and popover: an animation the app runs itself.
const closing = (open: boolean, details: { preventUnmountOnClose(): void }) => { if (!open) details.preventUnmountOnClose(); };
export const popups = (
  <>
    <Dialog actionsRef={popupActions} onOpenChange={closing} triggerId="a" defaultTriggerId="a" />
    <AlertDialog actionsRef={popupActions} onOpenChange={closing} />
    <Sheet actionsRef={popupActions} onOpenChange={closing} />
    <Popover actionsRef={popupActions} onOpenChange={closing} triggerId={null} />
    <DialogContent finalFocus={focus} initialFocus={false} />
  </>
);

// Form and Field: validate on demand. A submit is not cancellable, and says only why and with what event.
export const form = (
  <Form
    actionsRef={validation}
    onFormSubmit={(_values, details) => {
      const why: string = details.reason;
      const event: Event = details.event;
      // @ts-expect-error a submit has nothing to cancel
      details.cancel();
      // @ts-expect-error nor a trigger
      details.trigger;
      return why + event.type;
    }}
  >
    <Field label="Email" actionsRef={validation}><input /></Field>
  </Form>
);

// Combobox, NumberField, Slider and Select.
export const controls = (
  <>
    <Combobox
      options={[]}
      autoComplete="email"
      actionsRef={popupActions}
      filter={(value, query) => value.includes(query)}
      onItemHighlighted={(value, details) => `${value}${details.reason}`}
      onOpenChange={closing}
    />
    <NumberField render={<section />} />
    <Slider label="Range" render={<section />} thumbAlignment="edge" thumbCollisionBehavior="swap" onChange={(event) => event.type} />
    <Select options={[]} actionsRef={popupActions} onOpenChange={closing} onValueChange={(value, details) => `${value}${details.reason}`} />
  </>
);

// Selections that are not strings: null and numbers, and the type to name them.
export const selections = (
  <>
    <Tabs value={null}>
      <TabsList><Tab value={0}>Zero</Tab></TabsList>
      <TabsPanel value={0}>Panel</TabsPanel>
    </Tabs>
    <Tabs<number> value={0} onValueChange={(value, details) => { if (value === null) details.cancel(); else value.toFixed(); }} />
    <Tabs defaultValue="a" onValueChange={(value: string | null) => value} />
    <RadioGroup value={7} onValueChange={(value) => value.toFixed()} onChange={(event) => event.type}>
      <Radio value={7} nativeButton>Seven</Radio>
    </RadioGroup>
    <RadioGroup<string> value={null}><Radio value="a">A</Radio></RadioGroup>
    <Checkbox nativeButton={false}>Agree</Checkbox>
    <Switch nativeButton={false}>On</Switch>
  </>
);

// Native change events still bubble from the elements that hold inputs.
export const bubbling = (
  <>
    <Accordion onChange={(event) => event.type} />
    <SegmentedControl aria-label="View" onChange={(event) => event.type}><Segment value="a">A</Segment></SegmentedControl>
  </>
);

// Navigation: a named landmark, groups, and links that keep an anchor's own props. A nav without a name stays refused.
export const navigation = (
  <>
    <Nav aria-label="Primary" collapsed={false} onPointerEnter={(event) => event.type}>
      <NavGroup label="Workspace">
        <NavItem href="/" icon={HomeGlyph} current count={3} dot="New activity" target="_self" onClick={(event) => event.preventDefault()}>Home</NavItem>
      </NavGroup>
    </Nav>
    {/* @ts-expect-error a navigation landmark needs a name */}
    <Nav />
  </>
);

// The display states: a toggle is secondary or ghost; a link or Button that opens a new tab needs no prop for its arrow.
export const displayStates = (
  <>
    <Button pressed>Mute</Button>
    <Button variant="ghost" pressed={false}>Pin</Button>
    <IconButton icon={HomeGlyph} label="Home" variant="secondary" pressed />
    {/* @ts-expect-error a latched primary would read as the primary action */}
    <Button variant="primary" pressed>Deploy</Button>
    {/* @ts-expect-error a latched danger would read as an error */}
    <IconButton icon={HomeGlyph} label="Delete" variant="danger" pressed />
    <Link href="https://example.test" target="_blank" newTabLabel="(opens in a new tab)">Docs</Link>
    <Badge status="pending">In review</Badge>
    <BadgePair name="billing-worker" status={<Badge status="pending">In review</Badge>} fact={<Badge>Demo</Badge>} />
    <ChoiceCardGroup aria-label="Plan"><ChoiceCard name="plan" value="a" title="Starter" onCheckedChange={(checked) => checked} /></ChoiceCardGroup>
  </>
);
