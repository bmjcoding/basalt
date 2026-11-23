// The two made-up projects of tools/changelog/fixtures, as page data for the release tests: Slate (a package) and Harbor (a product). Every fact in
// them is invented. Read from the fixtures the tool writes, so the parts are drawn from what the tool produces.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { pageReleases, readRecords } from "../../../tools/changelog/records.mjs";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "tools", "changelog", "fixtures");
export const SLATE = JSON.parse(fs.readFileSync(path.join(FIXTURES, "slate", "releases.json"), "utf8"));
export const HARBOR = JSON.parse(fs.readFileSync(path.join(FIXTURES, "harbor", "releases.json"), "utf8"));
/** Harbor as it stood before 2.0.0 shipped: its two candidates drawn as releases of their own. */
export const HARBOR_BEFORE = pageReleases(path.join(FIXTURES, "harbor"), { records: readRecords(path.join(FIXTURES, "harbor")).filter((record) => record.version !== "2.0.0"), pending: [] });
/** What a running Harbor build says of itself (made up): never read from a release's record. */
export const RUNNING_BUILD = [{ label: "Build", value: "1.4.0+9f3c1e2", mono: true }, { label: "Commit", value: "9f3c1e2a7d04", mono: true }, { label: "Basalt", value: "0.2.0", mono: true }];

/** A Harbor app shell with the version at its foot, the release notes as its page and More holding Settings (TSX for a fixture). */
export const harborShell = ({ running = "1.4.0", date = "2026-11-23", releases = "HARBOR", extra = "" } = {}) => `
  const version = <B.VersionLink version="${running}" date="${date}" href="#v${running}" current />;
  return (
    <B.AppShell brand={<span style={{ fontWeight: 600 }}>Harbor</span>} brandLabel="Harbor home"
      sidebar={<B.Nav aria-label="Primary"><B.NavItem href="#" icon={B.HomeGlyph}>Home</B.NavItem><B.NavItem href="#" icon={B.SearchGlyph}>Incidents</B.NavItem></B.Nav>}
      account={<B.Nav aria-label="Account"><B.NavItem href="#" icon={B.SettingsGlyph}>Settings</B.NavItem></B.Nav>}
      version={version}
      header={<B.AppHeader title="Release notes" />}
      tabBar={<B.TabBar><B.TabBarItem href="#" icon={B.HomeGlyph}>Home</B.TabBarItem><B.TabBarItem href="#" icon={B.SearchGlyph}>Incidents</B.TabBarItem><B.TabBarMore current="Release notes"><B.NavItem href="#" icon={B.SettingsGlyph}>Settings</B.NavItem></B.TabBarMore></B.TabBar>}>
      <B.ReleaseNotes releases={${releases}} form="notes" product="Harbor" running="${running}" runningBuild={RUNNING_BUILD} baseHref="https://harbor.example/release-notes" ${extra} />
    </B.AppShell>
  );`;
