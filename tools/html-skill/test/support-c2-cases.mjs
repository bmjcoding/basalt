// Shared regression bodies and refusal diagnostics; Round 36 and the audit test use the same contract.
export const C2_REFUSALS = [
  ['foreign spelling', '<svg><math><mtext><style></svg><script type=text/plain></style></mtext></math></svg>', /`<script>` is never closed/],
  ['HTML end tag in SVG', '<div><svg></div><script type=text/plain></svg>', /`<\/div>` inside `<svg>`.*close the foreign elements/],
  ['HTML end tag in MathML', '<div><math></div><script type=text/plain></math>', /`<\/div>` inside `<math>`.*close the foreign elements/],
  ['nonstandard comment close', '<!-- x --!><script type=text/plain><!-- final -->', /comment.*nonstandard ending.*write <!-- text -->/],
  ['abrupt comment close', '<!--><script type=text/plain><!-- final -->', /comment.*nonstandard ending/],
  ['SVG init', '<svg><script>Basalt.init()</script></svg>', /`<script>` inside `<svg>`.*write executable scripts in HTML/],
  ['event-handler init', '<svg onload="Basalt.init()"></svg>', /`<svg>`.*`onload`.*inline HTML script/],
  ['encoded JavaScript type', '<script type="text&#x2f;javascript">Basalt.init()</script>', /`<script>`.*encoded type.*write the type literally/],
  ['SVG breakout', '<h1>Before</h1><svg><p><script>const x=1;</svg>', /`<p>` inside `<svg>`.*foreignObject/],
  ['MathML breakout', '<math><p>x</p></math>', /`<p>` inside `<math>`.*annotation-xml/],
  ['encoded integration point', '<math><annotation-xml encoding="text&#x2f;html"><script>x</annotation-xml></math>', /`<annotation-xml>`.*write the encoding literally/],
  ['MathML glyph exception', '<math><mi><mglyph><style></math><script type=text/plain></style></mglyph></mi></math>', /`<mglyph>` inside `<mi>`.*complete MathML fragment/],
  ['MathML glyph CDATA', '<math><mi><mglyph><![CDATA[2 > 1; <script>]]></mglyph></mi></math>', /`<mglyph>` inside `<mi>`.*annotation-xml/],
  ['MathML alignment exception', '<math><mtext><malignmark></malignmark></mtext></math>', /`<malignmark>` inside `<mtext>`/],
  ['cut-off attribute', '<h1>Before</h1><p title="never', /tag.*<p.*cut off by the end of the body/],
  ['cut-off script end', '<h1>Before</h1><script>window.__x=1</script ', /tag.*<\/script.*cut off by the end of the body/],
  ['plaintext', '<h1>Before</h1><plaintext>text', /`<plaintext>` is refused/],
  ['non-HTML whitespace', '<h1>x</h1><script>var a = 1;</script\u00a0>', /`<script>` is never closed/],
  ['unclosed noscript', '<h1>x</h1><noscript><p>x', /`<noscript>` is never closed/],
];

export const C2_ACCEPTED = [
  '<script>const example = "Basalt.init()";</script>',
  '<script>const example = /Basalt.init()/;</script>',
  '<script>const example = `Basalt.init()`;</script>',
  '<script>const example = "// Basalt.init()";</script>',
  '<svg><foreignObject><script>Basalt.init()</script></foreignObject></svg>',
  '<template><script>Basalt.init()</script></template>',
  '<p>A paragraph may omit its end tag and contain the suffix',
  '<svg><math><mtext>These names stay in the SVG namespace</mtext></math></svg>',
  '<math><annotation-xml><svg><rect/></svg></annotation-xml></math>',
];
