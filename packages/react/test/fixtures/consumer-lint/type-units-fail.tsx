// Point 6: the stylesheet's type rule in JSX: no container unit or lh on a type property.
export function Type() {
  return (
    <p style={{ fontSize: "4cqi", lineHeight: "2lh", letterSpacing: "0.1cqw" }}>
      <span style={{ font: "600 3cqmin/1.2 var(--basalt-font-family-sans)" }} />
    </p>
  );
}
