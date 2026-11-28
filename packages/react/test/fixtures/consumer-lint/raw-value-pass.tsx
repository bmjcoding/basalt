// basalt/raw-value passes: tokens, unitless numbers React leaves alone, measured geometry, keywords, currentColor in SVG, percentages.
export function Tokens({ place, height }: { place: number; height: number }) {
  return (
    <div style={{ padding: "var(--basalt-space-4)", opacity: 0.5, zIndex: 2, flexGrow: 1, lineHeight: 1, margin: 0 }}>
      <span style={{ insetInlineStart: `${(place * 100).toFixed(2)}%`, blockSize: height, width: "100%" }} />
      <svg viewBox="0 0 16 16" strokeWidth={2}>
        <path d="M0 0h16" fill="currentColor" stroke="none" />
      </svg>
      <span style={{ transitionDuration: "var(--basalt-duration-base)", color: "var(--basalt-text-secondary)", background: "transparent" }} />
    </div>
  );
}
