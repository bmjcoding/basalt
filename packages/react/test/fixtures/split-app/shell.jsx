// An app's first screen for test/bundle.test.mjs: the shell, the navigation and a still table, drawn up front; the forms and popups are drawn by a route that
// loads later. Every import is from the package's root, as an app writes it.
import { AppHeader, AppShell, Nav, NavGroup, NavItem, Table } from "@srasyndicate/basalt";

console.log(AppShell, AppHeader, Nav, NavGroup, NavItem, Table);
export const route = () => import("./route.jsx");
