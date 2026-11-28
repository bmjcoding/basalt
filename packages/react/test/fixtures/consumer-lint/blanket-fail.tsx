// Point 5 in source: a blanket or same-line form excuses nothing, and is reported.
/* basalt-lint-disable */
export const a = <div style={{ padding: 4 }} />;
export const b = <div style={{ padding: 4 }} />; // basalt-lint-disable-line basalt/raw-value -- not this form
