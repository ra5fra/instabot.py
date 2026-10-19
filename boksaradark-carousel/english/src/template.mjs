// Builds the HTML for one slide. Text boxes are laid out in the browser by layout.js.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { W, H, SAFE, COLORS } from './config.mjs';
import { BACKGROUND_CSS, marbleBackground } from './marble.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const LAYOUT_JS = readFileSync(join(ROOT, 'src', 'layout.js'), 'utf8');

const FONT_FILES = [
  ['TikTok Sans', 'TikTokSans-ExtraBold.ttf', 800],
  ['TikTok Sans', 'TikTokSans-Black.ttf', 900],
  ['Montserrat', 'Montserrat-ExtraBold.ttf', 800],
  ['Cinzel', 'Cinzel-Regular.ttf', 400],
  ['Cinzel', 'Cinzel-SemiBold.ttf', 600],
  // Own family name so our downloaded emoji font is used, not a system font.
  ['BokEmoji', 'NotoColorEmoji.ttf', 400],
];

function fontFaces() {
  return FONT_FILES.filter(([, file]) => existsSync(join(ROOT, 'assets', 'fonts', file)))
    .map(([family, file, weight]) => `@font-face { font-family:'${family}'; font-weight:${weight}; font-style:normal;
      font-display:block; src:url('${pathToFileURL(join(ROOT, 'assets', 'fonts', file)).href}') format('truetype'); }`)
    .join('\n');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SANS = `'TikTok Sans', 'Montserrat', 'BokEmoji', sans-serif`;
const SERIF = `'Cinzel', 'BokEmoji', serif`;
const ROSE_GLOW = `0 0 18px rgba(227,170,168,.85), 0 0 48px rgba(227,170,168,.55), 0 0 110px rgba(182,125,128,.7), 0 6px 20px rgba(0,0,0,.6)`;
const OUTLINE = (c) => `drop-shadow(2px 0 0 ${c}) drop-shadow(-2px 0 0 ${c}) drop-shadow(0 2px 0 ${c}) drop-shadow(0 -2px 0 ${c})`;

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; background:${COLORS.plum}; }
  body { position:relative; font-family:${SANS}; -webkit-font-smoothing:antialiased; }
  ${BACKGROUND_CSS}
  #stage { position:absolute; left:${SAFE.left}px; top:${SAFE.top}px;
    width:${W - SAFE.left - SAFE.right}px; height:${H - SAFE.top - SAFE.bottom}px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; }

  /* TikTok-style stacked text boxes (drawn line by line by layout.js) */
  .stack { position:relative; width:100%; font-weight:800; letter-spacing:-0.01em;
    filter: drop-shadow(0 10px 28px rgba(0,0,0,.5));
    --box:${COLORS.paper}; --ink:${COLORS.ink}; }
  .stack.rose { --box:${COLORS.rose}; --ink:#1a0c16; }
  .stack.dark { --box:${COLORS.plumBox}; --ink:#fff;
    filter: ${OUTLINE(COLORS.rose)} drop-shadow(0 0 16px rgba(227,170,168,.35)) drop-shadow(0 10px 28px rgba(0,0,0,.5)); }
  .stack .box { position:absolute; display:flex; align-items:center; justify-content:center;
    white-space:pre; background:var(--box); color:var(--ink); }
  .stack .fillet { position:absolute; }
  .stack .em { color:${COLORS.roseInk}; }
  .stack.rose .em, .stack.dark .em { text-decoration:underline; text-underline-offset:.12em; }
  .stack .pre { font-weight:900; text-transform:uppercase; letter-spacing:.06em; font-size:.62em; }
  .stack.light .pre, .stack:not(.rose):not(.dark) .pre { color:${COLORS.roseInk}; }
  .stack.rose .pre { color:rgba(26,12,22,.62); }
  .stack.dark .pre { color:${COLORS.rose}; font-size:.8em; }
  .measure { position:absolute; left:0; top:0; visibility:hidden; font-weight:800; letter-spacing:-0.01em; }
  .measure-para { text-wrap:balance; text-align:center; line-height:1.18; }
  .measure.smart .measure-para span { white-space:nowrap; }
  .measure-line { white-space:nowrap; display:inline-block; }
  .gap { height:34px; flex:none; }

  /* serif numbers and headings in capitals, like the cover */
  .rank, .cv-title { font-family:${SERIF}; font-weight:400; color:#FDEBEA; line-height:1.05; white-space:nowrap;
    letter-spacing:.04em; flex:none; text-shadow:${ROSE_GLOW}; }

  /* countdown: number, action (white), IRL (dark, rose gold edge), In the book (rose gold, largest) */
  #stage.layout-countdown { justify-content:flex-start; padding-top:6px; }
  .cd-mid { width:100%; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:space-evenly;
    gap:34px; padding:22px 0 0; }

  /* cover: heading, the cover tilted with shadow and rose glow, title line, small line */
  .cv-title { text-transform:uppercase; letter-spacing:.08em; padding-left:.08em; }
  .cv-wrap { flex:none; display:flex; justify-content:center; align-items:center; padding:.5em 0 .6em; }
  .cv-img { display:block; height:8.4em; width:calc(8.4em * 938 / 1500); border-radius:6px; transform:rotate(3deg);
    box-shadow: 0 0 0 1px rgba(248,217,216,.25), 0 30px 60px rgba(0,0,0,.65), 0 0 90px rgba(227,170,168,.32); }
  .cv-gap { height:22px; flex:none; }

  .guides .zone { position:absolute; background:rgba(255,0,60,.28); outline:2px dashed rgba(255,0,60,.9); }
`;

// All English text boxes use the smart line breaking from layout.js.
function stack(text, size, { variant = 'light', maxLines, prefix, tight = false } = {}) {
  return `<div class="stack ${variant} smart" data-text="${esc(text)}" data-size="${size}"
    ${maxLines ? `data-max-lines="${maxLines}"` : ''} ${prefix ? `data-prefix="${esc(prefix)}"` : ''} ${tight ? 'data-tight' : ''}></div>`;
}

function slideContent(slide) {
  switch (slide.type) {
    case 'title':
      return `
        ${stack(slide.text, slide.textSize ?? 100, { maxLines: 6 })}
        ${slide.subtext ? `<div class="gap"></div>${stack(slide.subtext, slide.subtextSize ?? 70, { variant: slide.subtextStyle })}` : ''}`;
    case 'countdown':
      return `
        <div class="rank txt" data-fixed data-size-px="${slide.rankSize ?? 180}">${esc(slide.rank)}</div>
        <div class="cd-mid">
          ${stack(slide.text, slide.textSize ?? 86, { maxLines: 4, tight: true })}
          ${stack(slide.irl, slide.irlSize ?? 66, { variant: 'dark', prefix: slide.irlLabel ?? 'IRL:', maxLines: 2, tight: true })}
          ${stack(slide.book, slide.bookSize ?? 100, { variant: 'rose', prefix: slide.bookLabel ?? 'In\u00a0the\u00a0book:', maxLines: 3, tight: true })}
        </div>`;
    case 'cover':
      return `
        ${slide.above ? `<div class="cv-title txt" data-size-px="${slide.aboveSize ?? 92}">${esc(slide.above)}</div>` : ''}
        <div class="cv-wrap" data-size-px="${slide.coverSize ?? 86}"><img class="cv-img" src="${pathToFileURL(join(ROOT, slide.image)).href}"></div>
        ${slide.below ? stack(slide.below, slide.belowSize ?? 66, { maxLines: 3 }) : ''}
        ${slide.small ? `<div class="cv-gap"></div>${stack(slide.small, slide.smallSize ?? 50, { variant: 'rose', maxLines: 3 })}` : ''}`;
    default:
      throw new Error(`Unknown slide type "${slide.type}" (use "hook", "countdown" or "cover")`);
  }
}

const GUIDES = `<div class="guides">
  <div class="zone" style="left:0;top:0;width:${W}px;height:${SAFE.top}px"></div>
  <div class="zone" style="left:0;top:${H - SAFE.bottom}px;width:${W}px;height:${SAFE.bottom}px"></div>
  <div class="zone" style="left:${W - SAFE.right}px;top:${SAFE.top}px;width:${SAFE.right}px;height:${H - SAFE.top - SAFE.bottom}px"></div>
</div>`;

export function buildSlideHtml(slide, { rng, guides }) {
  const grow = ['countdown', 'cover'].includes(slide.type) ? ` data-max-scale="${slide.maxScale ?? 1.3}"` : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>${fontFaces()}${CSS}</style></head>
<body>
  ${marbleBackground(rng)}
  <div id="stage" class="layout-${slide.type}"${grow}>${slideContent(slide)}</div>
  ${guides ? GUIDES : ''}
  <script>window.__SAFE = ${JSON.stringify({ ...SAFE, width: W, height: H })};</script>
  <script>${LAYOUT_JS}</script>
</body></html>`;
}
