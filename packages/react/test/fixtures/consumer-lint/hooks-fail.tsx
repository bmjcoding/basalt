// Point 1 (fix pass 1): only the documented hooks are an app's to set; a measurement Basalt writes itself is not.
export function Measured() {
  return <div style={{ "--basalt-viewport-top": "var(--basalt-space-0)", "--basalt-banner-height": "var(--basalt-space-10)" }} />;
}
