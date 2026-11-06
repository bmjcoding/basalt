import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CodeBlock } from "../dist/index.js";

const render = (code, language) => renderToStaticMarkup(createElement(CodeBlock, { code, language, copyable: false }));
const codeText = (html) => html.match(/<code[^>]*>([\s\S]*?)<\/code>/)[1]
  .replace(/<[^>]*>/g, "")
  .replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ({ "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'" })[entity]);

const samples = {
  bash: '# Deploy\n./blacksand k8s run --agent "claude"',
  css: '/* Page */\n.page { color: var(--basalt-text-primary); padding: 12px; }',
  html: '<!-- Page -->\n<main class="page">Hello & goodbye</main>',
  javascript: '// Route\nconst route = { host: "api.example.com", limit: 42 };',
  json: '{ "host": "api.example.com", "limit": 42, "enabled": true }',
  jsx: 'export function App() { return <Button disabled={false}>Deploy</Button>; }',
  python: '# Run\ndef run(agent: str):\n    return {"agent": agent, "limit": 42}',
  sql: "SELECT name FROM runs WHERE status = 'ready' LIMIT 10;",
  swift: '// View\nstruct RunView: View { var body: some View { Text("Ready") } }',
  tsx: 'export function App() { return <Button disabled={false}>Deploy</Button>; }',
  typescript: '// Route\nconst route: string = "api.example.com";\nconst limit = 42;',
  yaml: '# Run\nagent: claude\nlimit: 42\nenabled: true',
};

for (const [language, code] of Object.entries(samples)) {
  test(`CodeBlock highlights ${language} during server rendering without changing its text`, () => {
    const html = render(code, language);
    assert.match(html, /style="color:var\(--basalt-syntax-/, `no syntax colour for ${language}`);
    assert.equal(codeText(html), code);
  });
}

test("CodeBlock accepts common aliases, independent of case", () => {
  for (const alias of ["JS", " ts ", "sh", "shell", "py", "yml"]) {
    assert.match(render('const route = "api.example.com"; # comment', alias), /style="color:var\(--basalt-syntax-/);
  }
});

test("CodeBlock keeps empty lines, tabs, CRLF and trailing newlines exactly", () => {
  for (const code of ["", "\n", "\n\n", '\tconst x = "<&>";\r\n\r\n', '// 👋\nconst message = "café";\n\n']) {
    assert.equal(codeText(render(code, "typescript")), code);
  }
});

test("CodeBlock renders embedded HTML and scripts as text", () => {
  const code = '<script>alert("unsafe")</script>\n<img src=x onerror=alert(1)> &lt;';
  const html = render(code, "html");
  assert.equal(codeText(html), code);
  assert.doesNotMatch(html, /<script|<img|onerror="/);
});

test("CodeBlock falls back to plain text for unknown languages and large logs", () => {
  for (const language of [undefined, "text", "plaintext", "txt", "does-not-exist", "__proto__"]) {
    const html = render(samples.typescript, language);
    assert.doesNotMatch(html, /<span/);
    assert.equal(codeText(html), samples.typescript);
  }
  const log = `${samples.typescript}\n${"x".repeat(100_001)}`;
  const html = render(log, "typescript");
  assert.doesNotMatch(html, /<span/);
  assert.equal(codeText(html), log);
});

test("operators and punctuation stay neutral; types share the function colour; tags the keyword colour", () => {
  const ts = render("const a: Route = make();", "typescript");
  for (const op of ["=", ":", ";"]) {
    const span = ts.match(new RegExp(`<span style="color:([^"]+)">[^<]*\\${op}[^<]*</span>`));
    assert.ok(span, `no span for ${op}`);
    assert.equal(span[1], "var(--basalt-text-secondary)", `${op} is ${span[1]}`);
  }
  assert.match(ts, /color:var\(--basalt-syntax-function\)">Route</);
  assert.match(render("<main></main>", "html"), /color:var\(--basalt-syntax-keyword\)">main</);
  assert.doesNotMatch(ts, /syntax-type/);
});
