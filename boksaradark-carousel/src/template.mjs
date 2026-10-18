// Bygger HTML för en slide. Layouten av textrutorna görs i webbläsaren av layout.js.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { W, H, SAFE, COLORS } from './config.mjs';
import { BACKGROUND_CSS, imageBackground, proceduralBackground } from './background.mjs';
import { ornaments } from './ornaments.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const LAYOUT_JS = readFileSync(join(ROOT, 'src', 'layout.js'), 'utf8');

const FONT_FILES = [
  ['TikTok Sans', 'TikTokSans-ExtraBold.ttf', 800, 'normal'],
  ['TikTok Sans', 'TikTokSans-Black.ttf', 900, 'normal'],
  ['Montserrat', 'Montserrat-ExtraBold.ttf', 800, 'normal'],
  ['Cormorant Garamond', 'CormorantGaramond-Light.ttf', 300, 'normal'],
  ['Cormorant Garamond', 'CormorantGaramond-LightItalic.ttf', 300, 'italic'],
  // Eget familjenamn så att just vår nedladdade emojifont används, inte en systemfont.
  ['BokEmoji', 'NotoColorEmoji.ttf', 400, 'normal'],
];

function fontFaces() {
  return FONT_FILES.filter(([, file]) => existsSync(join(ROOT, 'fonts', file)))
    .map(([family, file, weight, style]) => `@font-face { font-family:'${family}'; font-weight:${weight};
      font-style:${style}; font-display:block; src:url('${pathToFileURL(join(ROOT, 'fonts', file)).href}') format('truetype'); }`)
    .join('\n');
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const SANS = `'TikTok Sans', 'Montserrat', 'BokEmoji', sans-serif`;

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  body { position:relative; font-family:${SANS}; -webkit-font-smoothing:antialiased; }
  ${BACKGROUND_CSS}
  .ornaments { position:absolute; inset:0; }
  #stage { position:absolute; left:${SAFE.left}px; top:${SAFE.top}px;
    width:${W - SAFE.left - SAFE.right}px; height:${H - SAFE.top - SAFE.bottom}px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; }

  .stack { position:relative; width:100%; font-weight:800; letter-spacing:-0.01em;
    filter: drop-shadow(0 10px 28px rgba(0,0,0,.45));
    --box:${COLORS.paper}; --ink:${COLORS.ink}; }
  .stack.accent { --box:${COLORS.accentDark}; --ink:#fff; }
  .stack.red { --box:${COLORS.accent}; --ink:#fff; }
  .stack .pre { font-weight:900; text-transform:uppercase; letter-spacing:.04em; }
  .stack.red .pre { color:rgba(255,255,255,.82); }
  .stack:not(.red):not(.accent) .pre { color:${COLORS.accent}; }
  .stack .box { position:absolute; display:flex; align-items:center; justify-content:center;
    white-space:pre; background:var(--box); color:var(--ink); }
  .stack .fillet { position:absolute; }
  .stack .em { color:${COLORS.accent}; }
  .stack.accent .em { color:#fff; text-decoration:underline; text-underline-offset:.12em; }
  .measure { position:absolute; left:0; top:0; visibility:hidden; font-weight:800; letter-spacing:-0.01em; }
  .measure-para { text-wrap:balance; text-align:center; line-height:1.18; }
  .measure.smart .measure-para span { white-space:nowrap; }
  .measure-line { white-space:nowrap; display:inline-block; }

  .month { font-family:'Cormorant Garamond', 'BokEmoji', serif; font-weight:300; color:#fff;
    line-height:1.18; white-space:nowrap; letter-spacing:.01em;
    text-shadow: 0 0 40px rgba(0,0,0,.55), 0 4px 18px rgba(0,0,0,.6); }
  .divider { width:360px; height:30px; margin:0 0 26px; }
  .label { font-weight:800; text-transform:uppercase; letter-spacing:.16em; color:${COLORS.accent};
    background:${COLORS.paper}; border-radius:999px; padding:.42em 1.05em .38em 1.21em; line-height:1;
    white-space:nowrap; margin-bottom:34px; box-shadow:0 8px 30px rgba(0,0,0,.35); }
  .gap { height:34px; flex:none; }

  /* countdown: siffran överst, handlingen i mitten, IRL / I boken under, ev. fotnot längst ner */
  #stage.layout-countdown { justify-content:flex-start; padding-top:10px; }
  .rank { font-family:'Cormorant Garamond', serif; font-weight:300; color:#fff; line-height:1.05;
    white-space:nowrap; letter-spacing:.02em; flex:none; font-variant-numeric:lining-nums;
    font-feature-settings:'lnum' 1;
    text-shadow: 0 0 18px rgba(179,18,46,.95), 0 0 46px rgba(179,18,46,.8), 0 0 110px rgba(139,0,0,.9),
      0 6px 20px rgba(0,0,0,.6); }
  .cd-mid { width:100%; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; }
  .cd-gap { height:64px; flex:none; }
  .cd-row-gap { height:30px; flex:none; }
  .cd-footer { width:100%; flex:none; display:flex; flex-direction:column; align-items:center; padding-bottom:6px; }
  .cd-footer .divider { margin:0 0 30px; }

  /* translation: siffra, ENGELSKA → replik, SVENSKA → översättning, poäng (störst) i röd ruta */
  #stage.layout-translation { justify-content:flex-start; padding-top:4px; }
  .tr-mid { width:100%; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:space-evenly;
    gap:40px; padding:16px 0 0; }
  .tr-block { width:100%; display:flex; flex-direction:column; align-items:center; flex:none; }
  .tr-label { font-weight:800; text-transform:uppercase; letter-spacing:.16em; color:rgba(255,255,255,.72);
    line-height:1.1; white-space:nowrap; margin-bottom:.32em; padding-left:.16em;
    text-shadow:0 2px 12px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.6); }

  /* twist: siffra, setup i vit ruta, paus, vändningen (störst) i röd ruta */
  #stage.layout-twist { justify-content:flex-start; padding-top:4px; }
  .tw-mid { width:100%; flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
    padding:16px 0 0; }
  .tw-pause { height:84px; flex:none; }

  .guides .zone { position:absolute; background:rgba(255,0,60,.28); outline:2px dashed rgba(255,0,60,.9); }
`;

const DIVIDER = `
  <svg class="divider" viewBox="0 0 360 30" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 15H150M210 15H350" stroke="${COLORS.accent}" stroke-width="2" stroke-linecap="round"/>
    <path d="M180 3L190 15L180 27L170 15Z" fill="${COLORS.accent}"/>
    <circle cx="160" cy="15" r="2.5" fill="${COLORS.accent}"/><circle cx="200" cy="15" r="2.5" fill="${COLORS.accent}"/>
  </svg>`;

// smart/tight är opt-in för nyare karuseller; utan dem beter sig textrutan som tidigare.
function stack(text, size, { variant = 'light', maxLines, prefix, tight, smart } = {}) {
  const cls = [['accent', 'red'].includes(variant) ? variant : '', smart ? 'smart' : ''].filter(Boolean).join(' ');
  return `<div class="stack ${cls}" data-text="${esc(text)}" data-size="${size}"
    ${maxLines ? `data-max-lines="${maxLines}"` : ''} ${prefix ? `data-prefix="${esc(prefix)}"` : ''} ${tight ? 'data-tight' : ''}></div>`;
}

function slideContent(slide) {
  switch (slide.type) {
    case 'month':
      return `
        <div class="month txt" data-size-px="${slide.titleSize ?? 190}">${esc(slide.title)}</div>
        ${DIVIDER}
        ${slide.label ? `<div class="label txt" data-size-px="34">${esc(slide.label)}</div>` : ''}
        ${stack(slide.text, slide.textSize ?? 68, { maxLines: 6 })}`;
    case 'title':
      return `
        ${stack(slide.text, slide.textSize ?? 86, { maxLines: 6, smart: slide.smartBreaks })}
        ${slide.subtext ? `<div class="gap"></div>${stack(slide.subtext, slide.subtextSize ?? 46, { variant: slide.subtextStyle, smart: slide.smartBreaks })}` : ''}`;
    case 'countdown':
      return `
        <div class="rank txt" data-size-px="${slide.rankSize ?? 250}">${esc(slide.rank)}</div>
        <div class="cd-mid">
          ${stack(slide.text, slide.textSize ?? 66, { maxLines: 4 })}
          <div class="cd-gap"></div>
          ${stack(slide.irl, slide.rowSize ?? 50, { variant: 'red', prefix: 'IRL:', maxLines: 2 })}
          <div class="cd-row-gap"></div>
          ${stack(slide.book, slide.rowSize ?? 50, { prefix: 'I boken:', maxLines: 2 })}
        </div>
        ${slide.footer ? `<div class="cd-footer">${DIVIDER}${stack(slide.footer, slide.footerSize ?? 58, { maxLines: 2 })}</div>` : ''}`;
    case 'translation':
      return `
        <div class="rank txt" data-fixed data-size-px="${slide.rankSize ?? 170}">${esc(slide.rank)}</div>
        <div class="tr-mid">
          <div class="tr-block">
            <div class="tr-label txt" data-fixed data-size-px="${slide.labelSize ?? 46}">${esc(slide.fromLabel ?? 'Engelska 🔥')}</div>
            ${stack(slide.original, slide.lineSize ?? 92, { maxLines: 3, tight: true, smart: true })}
          </div>
          <div class="tr-block">
            <div class="tr-label txt" data-fixed data-size-px="${slide.labelSize ?? 46}">${esc(slide.toLabel ?? 'Svenska 💀')}</div>
            ${stack(slide.translation, slide.lineSize ?? 92, { maxLines: 3, tight: true, smart: true })}
          </div>
          <div class="tr-block">
            ${stack(slide.punchline, slide.punchlineSize ?? 112, { variant: 'red', maxLines: 4, tight: true, smart: true })}
          </div>
        </div>`;
    case 'twist':
      return `
        <div class="rank txt" data-fixed data-size-px="${slide.rankSize ?? 170}">${esc(slide.rank)}</div>
        <div class="tw-mid">
          ${stack(slide.setup, slide.setupSize ?? 78, { maxLines: 3, tight: true, smart: true })}
          <div class="tw-pause"></div>
          ${stack(slide.twist, slide.twistSize ?? 116, { variant: 'red', maxLines: 5, tight: true, smart: true })}
        </div>`;
    default:
      throw new Error(`Okänd slide-typ "${slide.type}" (använd "title", "month", "countdown", "translation" eller "twist")`);
  }
}

const GUIDES = `<div class="guides">
  <div class="zone" style="left:0;top:0;width:${W}px;height:${SAFE.top}px"></div>
  <div class="zone" style="left:0;top:${H - SAFE.bottom}px;width:${W}px;height:${SAFE.bottom}px"></div>
  <div class="zone" style="left:${W - SAFE.right}px;top:${SAFE.top}px;width:${SAFE.right}px;height:${H - SAFE.top - SAFE.bottom}px"></div>
</div>`;

export function buildSlideHtml(slide, { rng, index, backgroundFile, guides }) {
  const background = backgroundFile ? imageBackground(pathToFileURL(backgroundFile).href) : proceduralBackground(rng);
  return `<!doctype html>
<html lang="sv"><head><meta charset="utf-8">
<style>${fontFaces()}${CSS}</style></head>
<body>
  ${background}
  ${ornaments(rng, { variant: index })}
  <div id="stage" class="layout-${slide.type}"${['translation', 'twist'].includes(slide.type) ? ` data-max-scale="${slide.maxScale ?? 1.3}"` : ''}>${slideContent(slide)}</div>
  ${guides ? GUIDES : ''}
  <script>window.__SAFE = ${JSON.stringify({ ...SAFE, width: W, height: H })};</script>
  <script>${LAYOUT_JS}</script>
</body></html>`;
}
