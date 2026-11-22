// An app's first screen for test/bundle.test.mjs: the shell, the navigation and a still table, drawn up front; the forms and popups are drawn by a route that
// loads later. Every import is from the package's root, as an app writes it. The table comes through parts.ts, a module with no semicolons.
// A comment that holds an import must not be read as one: import { Combobox } from "@srasyndicate/basalt";
import { AppHeader, AppShell, Nav, NavGroup, NavItem } from "@srasyndicate/basalt";
import { parts } from "./parts.ts";

console.log(AppShell, AppHeader, Nav, NavGroup, NavItem, parts);
export const route = () => import("./route.jsx");
