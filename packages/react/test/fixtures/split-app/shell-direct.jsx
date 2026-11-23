// The same first screen as shell.jsx with each import naming its own module (test/bundle.test.mjs): what the imports plugin must make of shell.jsx.
import { AppHeader, AppShell } from "../../../dist/app-shell.js";
import { Nav, NavGroup, NavItem } from "../../../dist/nav.js";
import { Table } from "../../../dist/display.js";

console.log(AppShell, AppHeader, Nav, NavGroup, NavItem, Table);
export const route = () => import("./route.jsx");
