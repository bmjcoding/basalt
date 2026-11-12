// Synthetic art for the art tests and the art baseline: drawn pictures as data URIs (no file, no network), and the page they sit on. The greys keep every pixel of the
// stage's headroom inside art-quiet-limit (#333333 in dark, #bfbfbf in light); the detail (the dots and the lit ridge) starts below it.
const svg = (width, height, body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`)}`;
const scene = (field, ridge, far, detail) => `<rect width="1600" height="800" fill="${field}"/><path d="M0 800V560L260 470L520 540L800 420L1100 530L1380 450L1600 520V800Z" fill="${far}"/><path d="M0 800V650L300 590L640 640L980 560L1300 630L1600 590V800Z" fill="${ridge}"/><g fill="${detail}"><circle cx="760" cy="330" r="3"/><circle cx="640" cy="260" r="2"/><circle cx="1010" cy="360" r="3"/><circle cx="1320" cy="290" r="2"/></g>`;
export const NIGHT = svg(1600, 800, scene("#000000", "#141414", "#1f1f1f", "#9a9a9a"));
export const DAY = svg(1600, 800, scene("#fafafa", "#d4d4d4", "#e6e6e6", "#6b6b6b"));
/** A one-version photograph for a frame: 300 by 200, two flat greys. */
export const PHOTO = svg(300, 200, `<rect width="300" height="200" fill="#808080"/><path d="M0 200V140L90 90L170 130L240 80L300 120V200Z" fill="#5c5c5c"/>`);
/** A picture that can never decode: an error event on every browser. */
export const BROKEN = "data:image/png;base64,AAAA";

export const stagePage = ({ headroomNote = "", extra = "" } = {}) => `<title>Art</title>
<header class="topbar"><div class="topbar-inner"><a class="brand" href="#top" aria-label="Orbit home">Orbit</a><span class="spacer"></span><button class="btn" data-variant="ghost" data-icon-only data-theme-toggle></button></div></header>
<section class="stage" id="top">
  <div class="stage-art" aria-hidden="true"><img class="paired-art" data-art="dark" src="${NIGHT}" alt="" width="1600" height="800" loading="eager" decoding="async"><img class="paired-art" data-art="light" src="${DAY}" alt="" width="1600" height="800" loading="eager" decoding="async"></div>
  <div class="stage-content">
    <div class="page" style="min-height: 360px; padding-block-end: var(--basalt-space-8)">
      <h1 data-quiet="headline" style="max-width: 18ch">A synthetic headline${headroomNote}</h1>
      <p class="lead muted">Words on the art sit where it is quiet.</p>
      <div class="panel panel-pad" style="max-width: 24rem; margin-top: var(--basalt-space-6)"><strong>A panel on the art</strong><p class="muted small">Solid, level 1, with its rim.</p></div>
    </div>
  </div>
</section>
<main class="page stack" id="main">
  <h2>Framed art</h2>
  <figure class="framed" data-aspect="photo"><div class="framed-frame"><img src="${PHOTO}" alt="A synthetic dune" loading="eager" decoding="async"></div><figcaption>Dunes at the end of the day.<span class="framed-credit">Synthetic art</span></figcaption></figure>
  <div class="cluster" style="align-items: flex-start">
    <figure class="framed" data-aspect="square" style="width: 12rem"><div class="framed-frame"><img src="${PHOTO}" alt="A synthetic square" loading="eager"></div></figure>
    <figure class="framed" data-aspect="screen" style="width: 16rem"><div class="framed-frame"><img src="${PHOTO}" alt="" loading="eager"></div><figcaption>A screen</figcaption></figure>
    <figure class="framed" data-aspect="wide" style="width: 16rem"><div class="framed-frame"><img src="${BROKEN}" alt="A picture that did not load" loading="eager"></div><figcaption>It failed<span class="framed-credit">Synthetic art</span></figcaption></figure>
  </div>
  <div class="card" style="max-width: 24rem"><figure class="framed" data-aspect="photo"><div class="framed-frame"><img src="${PHOTO}" alt="A synthetic dune in a card" loading="eager"></div><figcaption>In a card: the radius is 12 less the card's padding.</figcaption></figure></div>${extra}
</main>`;
