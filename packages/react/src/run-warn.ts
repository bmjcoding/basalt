// Development warnings for the run parts (DECISIONS 316): each said once. A bundler that sets NODE_ENV to production drops every call, strings included,
// because each caller tests `process.env.NODE_ENV` itself.

declare const process: { env: { NODE_ENV?: string } };

let warned: Set<string> | undefined;

/** Said once for each message. */
export function warnRun(component: string, message: string) {
  if (process.env.NODE_ENV === "production") return;
  warned ??= new Set();
  const key = `${component}: ${message}`;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`Basalt ${key}`);
}
