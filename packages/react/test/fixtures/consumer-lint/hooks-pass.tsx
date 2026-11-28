// The documented hooks pass: a head's edge room (and its two sides), the closing stage's room, a DotLine that never wraps.
export function Hooks() {
  return (
    <header style={{ "--basalt-edge-room": "var(--basalt-space-4)", "--basalt-edge-room-start": "var(--basalt-space-4)", "--basalt-edge-room-end": "var(--basalt-space-2)" }}>
      <p style={{ "--basalt-dot-line-wrap": "nowrap", "--basalt-stage-room": "var(--basalt-space-16)" }} />
    </header>
  );
}
