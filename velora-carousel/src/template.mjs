// Bygger HTML för en slide. Textstorleken anpassas i webbläsaren av layout.js.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { W, H, SAFE, COLORS, HANDLE } from './config.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const LAYOUT_JS = readFileSync(join(ROOT, 'src', 'layout.js'), 'utf8');

const FONT_CSS = [
  '@fontsource/fraunces/400.css',
  '@fontsource/fraunces/400-italic.css',
  '@fontsource/fraunces/500.css',
  '@fontsource/fraunces/500-italic.css',
  '@fontsource/fraunces/600.css',
  '@fontsource/fraunces/600-italic.css',
  '@fontsource/dm-sans/400.css',
  '@fontsource/dm-sans/500.css',
  '@fontsource/dm-sans/700.css',
  '@fontsource/noto-color-emoji/index.css',
].map((p) => `<link rel="stylesheet" href="${pathToFileURL(join(ROOT, 'node_modules', p)).href}">`).join('\n');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// *så här* = accentord (kursiv terrakotta), \n = ny rad.
// Raka citattecken blir typografiska (“ ” ’), som i en tryckt bok.
const curly = (s) => String(s)
  .replace(/(^|[\s(\[—–*-])"/g, '$1\u201c').replace(/"/g, '\u201d')
  .replace(/(^|[\s(\[—–*-])'/g, '$1\u2018').replace(/'/g, '\u2019');
const rich = (s) => esc(curly(s)).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

const SERIF = `'Fraunces', 'Noto Color Emoji', Georgia, serif`;
const SANS = `'DM Sans', 'Noto Color Emoji', Helvetica, Arial, sans-serif`;

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; }
  body { position:relative; background:${COLORS.cream}; color:${COLORS.ink}; font-family:${SANS};
    -webkit-font-smoothing:antialiased; }

  /* bakgrund: krämvit med mjuka persika/violetta ljusfläckar och papperskorn */
  .glow { position:absolute; border-radius:50%; filter:blur(110px); }
  .grain { position:absolute; inset:0; opacity:.16; mix-blend-mode:multiply; background-image:url("data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .3  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}"); }
  body.dark { background:${COLORS.deepViolet}; color:${COLORS.cream}; }
  body.dark .grain { mix-blend-mode:overlay; opacity:.22; }

  #stage { position:absolute; left:${SAFE.left}px; top:${SAFE.top}px;
    width:${W - SAFE.left - SAFE.right}px; height:${H - SAFE.top - SAFE.bottom}px;
    display:flex; flex-direction:column; }
  #content { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; }
  #content.center { align-items:center; text-align:center; }

  .serif { font-family:${SERIF}; font-optical-sizing:auto; letter-spacing:-0.015em; text-wrap:balance; }
  .sans { font-family:${SANS}; text-wrap:balance; }
  em { font-style:italic; color:${COLORS.terracotta}; }
  body.dark em { color:${COLORS.peach}; }

  .kicker { font-family:${SANS}; font-weight:700; text-transform:uppercase; letter-spacing:.2em;
    color:${COLORS.terracotta}; line-height:1.2; }
  body.dark .kicker { color:${COLORS.peach}; }
  .rule { width:72px; height:3px; border-radius:2px; background:${COLORS.peach}; margin:34px 0 38px; flex:none; }
  .center .rule { margin-left:auto; margin-right:auto; }

  .hook-text { font-weight:600; line-height:1.06; }
  .hook-sub { font-weight:500; color:${COLORS.muted}; line-height:1.3; margin-top:40px; }
  .num { font-style:italic; font-weight:400; line-height:1; color:${COLORS.peach}; margin-bottom:40px; letter-spacing:-0.02em; }
  .point-text { font-weight:500; line-height:1.12; }
  .point-body { font-weight:400; color:${COLORS.muted}; line-height:1.35; margin-top:36px; }

  /* sms-bubblor */
  .thread { display:flex; flex-direction:column; gap:22px; width:100%; }
  .bubble { max-width:86%; padding:.5em .85em .55em; border-radius:1.05em; line-height:1.22; font-weight:500;
    background:${COLORS.bubbleGray}; color:${COLORS.ink}; align-self:flex-start; border-bottom-left-radius:.3em;
    text-wrap:balance; }
  .bubble.me { align-self:flex-end; background:${COLORS.violet}; color:#fff; border-bottom-left-radius:1.05em;
    border-bottom-right-radius:.3em; }
  .meta { align-self:flex-end; font-weight:500; color:${COLORS.muted}; margin-top:-6px; }
  .bubble-caption { margin-top:64px; font-weight:500; line-height:1.15; text-align:left; }

  /* byt ut: från → till */
  .swap-label { font-family:${SANS}; font-weight:700; text-transform:uppercase; letter-spacing:.2em; line-height:1.2;
    color:${COLORS.muted}; margin-bottom:18px; }
  .swap-label.to { color:${COLORS.terracotta}; }
  .swap-from { font-weight:500; line-height:1.25; color:${COLORS.muted}; text-decoration:line-through;
    text-decoration-color:${COLORS.peach}; text-decoration-thickness:.08em; }
  .swap-from.plain { text-decoration:none; color:${COLORS.ink}; font-style:italic; }
  .swap-arrow { font-family:${SERIF}; color:${COLORS.peach}; line-height:1; margin:40px 0 34px; }
  .swap-to { font-weight:500; line-height:1.12; }

  /* affirmationskort */
  .app-text { font-weight:500; line-height:1.3; margin-bottom:56px; }
  .card { background:${COLORS.paper}; border-radius:44px; padding:64px 60px 58px; width:100%;
    box-shadow:0 30px 70px -30px rgba(63,52,86,.45), 0 0 0 1px rgba(63,52,86,.06); position:relative; overflow:hidden; }
  .card::before { content:''; position:absolute; left:0; right:0; top:0; height:10px;
    background:linear-gradient(90deg, ${COLORS.peach}, ${COLORS.violet}); }
  .card-label { font-family:${SANS}; font-weight:700; text-transform:uppercase; letter-spacing:.2em;
    color:${COLORS.violet}; line-height:1.2; margin-bottom:30px; }
  .card-text { font-style:italic; font-weight:500; line-height:1.14; }
  .card-brand { display:flex; align-items:center; gap:16px; margin-top:44px; font-family:${SANS}; font-weight:700;
    letter-spacing:.04em; color:${COLORS.ink}; }
  .dot { width:1.15em; height:1.15em; border-radius:50%; background:linear-gradient(135deg, ${COLORS.peach}, ${COLORS.violet}); flex:none; }
  .app-note { font-weight:400; color:${COLORS.muted}; line-height:1.35; margin-top:48px; }

  .cta-text { font-weight:500; line-height:1.1; }
  .cta-actions { margin-top:56px; display:flex; gap:22px; flex-wrap:wrap; justify-content:center; }
  .pill { font-family:${SANS}; font-weight:700; letter-spacing:.06em; border-radius:999px; padding:.55em 1.15em;
    border:2px solid rgba(247,241,234,.5); color:${COLORS.cream}; line-height:1; white-space:nowrap; }

  /* sidfot: varumärke och sidnummer */
  #footer { flex:none; display:flex; align-items:center; justify-content:space-between; padding-top:36px;
    font-family:${SANS}; font-weight:500; font-size:30px; color:${COLORS.muted}; }
  body.dark #footer { color:rgba(247,241,234,.7); }
  .handle { font-weight:700; letter-spacing:.02em; }
  .swipe { color:${COLORS.terracotta}; font-weight:700; }

  .guides .zone { position:absolute; background:rgba(255,0,60,.22); outline:2px dashed rgba(255,0,60,.8); }
`;

function background(rng, dark) {
  const corners = [[-0.15, -0.1], [0.75, -0.12], [-0.2, 0.7], [0.7, 0.72]];
  const a = rng.int(0, 3);
  const b = 3 - a; // motsatt hörn
  const blob = (corner, color, opacity, size) => {
    const [cx, cy] = corners[corner];
    const x = (cx + rng.range(-0.06, 0.06)) * W;
    const y = (cy + rng.range(-0.06, 0.06)) * H;
    return `<div class="glow" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${color};opacity:${opacity}"></div>`;
  };
  return dark
    ? `${blob(a, COLORS.peach, 0.32, 620)}${blob(b, COLORS.violet, 0.55, 700)}<div class="grain"></div>`
    : `${blob(a, COLORS.peach, 0.55, rng.int(560, 680))}${blob(b, COLORS.violet, 0.38, rng.int(560, 680))}<div class="grain"></div>`;
}

// data-size = grundstorlek i px. layout.js skalar ner allt med samma faktor tills det får plats.
const fit = (cls, size, html, tag = 'div') => `<${tag} class="${cls} txt" data-size="${size}">${html}</${tag}>`;

function slideContent(s) {
  switch (s.type) {
    case 'hook':
      return `<div id="content">
        ${s.kicker ? fit('kicker', 30, esc(curly(s.kicker))) + '<div class="rule"></div>' : ''}
        ${fit('serif hook-text', s.textSize ?? 108, rich(s.text))}
        ${s.sub ? fit('sans hook-sub', s.subSize ?? 46, rich(s.sub)) : ''}
      </div>`;
    case 'point':
      return `<div id="content">
        ${s.num ? fit('serif num', 150, esc(s.num)) : ''}
        ${s.kicker ? fit('kicker', 32, esc(curly(s.kicker))) + '<div class="rule"></div>' : ''}
        ${fit('serif point-text', s.textSize ?? 96, rich(s.text))}
        ${s.body ? fit('sans point-body', s.bodySize ?? 46, rich(s.body)) : ''}
      </div>`;
    case 'bubble': {
      const msgs = s.messages.filter((m) => m.text).map((m) =>
        `${fit(`sans bubble${m.from === 'me' ? ' me' : ''}`, s.bubbleSize ?? 64, rich(m.text))}${m.meta ? fit('sans meta', 30, esc(m.meta)) : ''}`).join('');
      return `<div id="content">
        <div class="thread">${msgs}</div>
        ${s.caption ? fit('serif bubble-caption', s.captionSize ?? 64, rich(s.caption)) : ''}
      </div>`;
    }
    case 'swap':
      return `<div id="content">
        ${fit('swap-label', 28, esc(curly(s.fromLabel ?? 'instead of')))}
        ${fit(`serif swap-from${s.strike === false ? ' plain' : ''}`, s.fromSize ?? 60, rich(s.from))}
        ${fit('swap-arrow', 80, '↓')}
        ${fit('swap-label to', 28, esc(curly(s.toLabel ?? 'try')))}
        ${fit('serif swap-to', s.toSize ?? 82, rich(s.to))}
      </div>`;
    case 'app':
      return `<div id="content">
        ${s.text ? fit('sans app-text', s.textSize ?? 48, rich(s.text)) : ''}
        <div class="card">
          ${fit('card-label', 26, esc(curly(s.label ?? "today's affirmation")))}
          ${fit('serif card-text', s.affirmationSize ?? 72, rich(s.affirmation))}
          ${fit('card-brand', 30, `<span class="dot"></span>Velora`)}
        </div>
        ${s.note ? fit('sans app-note', s.noteSize ?? 40, rich(s.note)) : ''}
      </div>`;
    case 'cta':
      return `<div id="content" class="center">
        ${fit('serif cta-text', s.textSize ?? 96, rich(s.text))}
        <div class="cta-actions">${(s.actions ?? ['save', 'send', 'follow']).map((a) => fit('pill', 32, esc(a))).join('')}</div>
      </div>`;
    default:
      throw new Error(`Okänd slide-typ "${s.type}"`);
  }
}

const GUIDES = `<div class="guides">
  <div class="zone" style="left:0;top:0;width:${W}px;height:${SAFE.top}px"></div>
  <div class="zone" style="left:0;top:${H - SAFE.bottom}px;width:${W}px;height:${SAFE.bottom}px"></div>
  <div class="zone" style="left:0;top:${SAFE.top}px;width:${SAFE.left}px;height:${H - SAFE.top - SAFE.bottom}px"></div>
  <div class="zone" style="left:${W - SAFE.right}px;top:${SAFE.top}px;width:${SAFE.right}px;height:${H - SAFE.top - SAFE.bottom}px"></div>
</div>`;

export function buildSlideHtml(slide, { rng, index, total, guides, handle = HANDLE }) {
  const dark = slide.type === 'cta';
  const right = index === 0 ? `<span class="swipe">swipe →</span>` : `${index + 1} / ${total}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">${FONT_CSS}<style>${CSS}</style></head>
<body class="${dark ? 'dark' : ''}">
  ${background(rng, dark)}
  <div id="stage">
    ${slideContent(slide)}
    <div id="footer" class="txt"><span class="handle">${esc(handle)}</span><span>${right}</span></div>
  </div>
  ${guides ? GUIDES : ''}
  <script>window.__SAFE = ${JSON.stringify({ ...SAFE, width: W, height: H })};</script>
  <script>${LAYOUT_JS}</script>
</body></html>`;
}
