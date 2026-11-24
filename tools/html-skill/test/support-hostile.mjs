// A body in which every data field of the script-built modules carries markup that calls __x(N) if it is parsed as HTML (the audit's probe, A5-10). Synthetic.
// Each hostile value is a quoted-attribute break-out or an element with an onerror; a field a module writes unescaped runs one, and the page records which.
const p = (n) => `<img src=x onerror=__x(${n})>`; const a = (n) => `"><img src=x onerror=__x(${n})>`;
const chart = { title: "T" + p(1), source: "S" + p(2), kind: "bar", unit: "u" + p(3), summary: "Sum" + p(4), days: ["2026-11-08", "2026-11-09", "2026-11-10"], now: "2026-11-12",
  series: [{ id: "a" + a(40), name: "N" + p(5), values: [48, null, 61], reasons: [null, "why" + p(6), null] }], plan: { kind: "value", label: "Goal" + p(7), values: [45, 45, 45], notes: ["n" + p(41), null, null] },
  format: { suffix: " m" + p(8), spoken: " min" + p(9), prefix: p(42) }, partial: 2, partialLabel: "pl" + p(43), partialSuffix: "ps" + p(44), locale: "en-GB" };
const line = { ...chart, kind: "line", series: [{ id: "x", name: "L1" + p(45), values: [1, 2, 3] }, { id: "y", name: "L2" + p(46), values: [3, null, 1], reasons: [null, "r" + p(47), null] }] };
const spark = { label: "Req" + p(10), data: [1, 2, 3] }; const sparkEmpty = { label: "E" + p(48), data: [], empty: "none" + p(11) };
const commands = { groups: [{ label: "G" + p(29), items: [{ id: "i" + a(49), label: "New" + p(30), icon: "TerminalWindow", description: "D" + p(31), keys: ["⌘", "N" + p(28)], keywords: ["k" + p(50)], hint: "h" + p(25) }, { id: "r", label: "Ren", href: "#r" + a(51), icon: "Nope" + a(27) }] }] };
const diagram = { type: "architecture", title: "D" + p(81), summary: "S" + p(82), legend: { main: "M" + p(83), plain: "P" + p(84), dashed: "Dd" + p(85), focal: "F" + p(86) },
  groups: [{ id: "g" + a(87), label: "G" + p(88) }],
  nodes: [{ id: "a", kind: "K" + p(89), name: "A" + p(90), col: 1, row: 1, group: "g" + a(87) }, { id: "b", name: "B" + p(91), detail: "dt" + p(92), focal: true, col: 2, row: 1 }],
  edges: [{ from: "a", to: "b", kind: "main" }] };
const textSequence = { type: "sequence", variant: "text", export: true, title: "TX" + p(93), source: "So" + p(94), summary: "Su" + p(95), legend: { main: "LM" + p(96) },
  participants: [{ id: "a", name: "PA" + p(97) }, { id: "b", name: "PB" + p(98) }], steps: [{ from: "a", to: "b", label: "Msg" + p(99), note: "Nt" + p(100) }, { frame: "opt", label: "Fr" + p(101), steps: [{ from: "b", to: "a", label: "Back" + p(102) }] }] };
export const hostileBody = () => `<title>xss probe</title>
<script>window.__hits=[];window.__x=function(n){window.__hits.push(n)};</script>
<h1>Probe</h1>
<figure class="chart"><script type="application/json" data-chart>${JSON.stringify(chart)}</script></figure>
<figure class="chart"><script type="application/json" data-chart>${JSON.stringify(line)}</script></figure>
<div class="sparkline"><script type="application/json" data-sparkline>${JSON.stringify(spark)}</script></div>
<figure class="diagram"><script type="application/json" data-diagram>${JSON.stringify(diagram).replace(/</g, "\\u003c")}</script></figure>
<figure class="diagram"><script type="application/json" data-diagram>${JSON.stringify(textSequence).replace(/</g, "\\u003c")}</script></figure>
<div class="sparkline"><script type="application/json" data-sparkline>${JSON.stringify(sparkEmpty)}</script></div>
<span id="bell"></span>
<div class="command-list" data-label='Console${a(32).replace(/"/g, "&quot;")}' data-noun='cmd${a(33).replace(/"/g, "&quot;")}' data-placeholder='ph${a(34).replace(/"/g, "&quot;")}'><script type="application/json" data-commands>${JSON.stringify(commands)}</script></div>
<script type="application/json" data-palette>${JSON.stringify({ groups: [{ label: "PG" + p(60), items: [{ label: "Save" + p(24), icon: "ArrowRight", keys: ["⌘", "S"], hint: "H" + p(61), description: "PD" + p(26), keywords: ["a" + p(62)] }, { label: "Go", href: "#x" + a(63), danger: true }] }] })}</script>
<button class="btn" data-open-palette>Open</button>
<p><span data-kbd='⌘ ${p(35).replace(/ /g, "&#9;")}' data-doc></span> <i data-icon="Download" data-label='lbl${a(36).replace(/"/g, "&quot;")}'></i> <button class="btn" data-tooltip='tip${p(37)}'>Tip</button></p>
<div class="field"><label for="region">Region</label><div class="combobox" data-empty='No${p(64)}'><input class="input" id="region" name="region"><ul><li data-value='eu${a(65).replace(/"/g, "&quot;")}' data-description='desc${p(66)}'>Frank&lt;img src=x onerror=__x(67)&gt;</li><li data-value="us">Ashburn</li></ul></div></div>
<div class="filter" data-label='Status${p(68)}' data-for="runs" data-column="1"><label><input type="checkbox" value='p${a(69).replace(/"/g, "&quot;")}'> Passed&lt;img src=x onerror=__x(38)&gt;</label><label><input type="checkbox" value="failed"> Failed</label></div>
<p class="filter-result" data-for="runs" data-noun='runs${p(70)}'>Showing</p>
<div class="table-wrap" role="region" aria-label="Runs" tabindex="0"><table id="runs"><thead><tr><th>Status</th></tr></thead><tbody><tr><td>Passed&lt;img src=x onerror=__x(38)&gt;</td></tr><tr><td>Failed</td></tr></tbody></table></div>
<figure class="code terminal" data-replay data-prompt='>${a(79).replace(/"/g, "&quot;")}' data-exit-code='1${a(80).replace(/"/g, "&quot;")}' data-interval="300"><figcaption>term&lt;img src=x onerror=__x(71)&gt;</figcaption><pre class="code-body" tabindex="0"><code><span data-kind="command">echo &lt;img src=x onerror=__x(72)&gt;</span><span data-kind="error">bad &lt;img src=x onerror=__x(73)&gt;</span></code></pre></figure>
<figure class="framed"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt='alt${a(74).replace(/"/g, "&quot;")}'></figure>
<script>
Basalt.init();
var centre = Basalt.notifications('#bell', { entries: [{ id: 'a${a(16)}', title: 'Dep${p(12)}', description: 'api${p(13)}', time: '2m${p(14)}', status: 'success${a(15)}', unread: true, href: '#n${a(18)}' }, { id: 'b', title: 'B', time: 'now' }], viewAllHref: '/n${a(17)}' });
window.__toast = function () {
  Basalt.toast({ title: 'T${p(19)}', description: 'D${p(20)}', status: 'success${a(22)}', action: { label: 'Undo${p(21)}', onClick: function () {} }, home: 'centre', timeout: '5000ms${a(23)}', group: 'g${a(75)}' });
  Basalt.toast({ title: 'T${p(19)}', group: 'g${a(75)}', home: 'row' });
  Basalt.toast.promise(Promise.resolve(), { running: 'Run${p(76)}', success: 'Ok${p(77)}', error: 'Err${p(78)}' });
};
</script>`;
