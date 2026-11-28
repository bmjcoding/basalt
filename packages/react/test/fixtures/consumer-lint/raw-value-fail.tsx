// basalt/raw-value: raw colours, lengths and times in static style values (numbers included), SVG colour attributes, and custom properties.
export function Raw() {
  return (
    <div style={{ padding: 16, gap: "12px", color: "#fff", transition: "opacity 150ms", "--app-ink": "rgb(0 0 0)", marginTop: -8 }}>
      <svg viewBox="0 0 16 16">
        <path d="M0 0h16" fill="#ff0000" stroke="red" />
      </svg>
      <span style={{ fontSize: "0.875rem", borderRadius: 7 }} />
    </div>
  );
}
