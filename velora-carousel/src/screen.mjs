#!/usr/bin/env node
// Renderar Velora-appens "Today's affirmation"-skärm (1179×2556, som en iPhone-skärmdump) med valfri text.
//
//   npm run screen dag-01                       → screens/dag-01.json
//   npm run screen all                          → alla i screens/
//   npm run screen -- --text "My no is a full sentence." [--body "…"] [--category "…"] [--out namn]
//   npm run mockup dag-01 dag-02                → samma skärm i en iPhone, 1080×1920 med transparent bakgrund
//   npm run mockup -- dag-01 --bg               → med Veloras bakgrund i stället
//
// Bilden hamnar i output/screens/<namn>.png (mockupen i <namn>-mockup.png).
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const ROOT = new URL('..', import.meta.url).pathname;
const SCREENS = join(ROOT, 'screens');
const OUT = join(ROOT, 'output', 'screens');

// Skärmen byggs i iPhonens logiska punkter (393×852) och fotograferas med 3x, precis som en skärmdump.
const PT = { w: 393, h: 852 };
const SCALE = 3;

const DEFAULTS = {
  category: 'General Self-Worth',
  color: '#4C7AA5',
  step: 1,
  steps: 3,
  time: '9:41',
  button: "I've said it 🗣️",
  label: "TODAY'S AFFIRMATION",
  emojis: ['✨', '🌟', '💛', '🌈'],
  statusBar: true,
};

// ---- Argument ----
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const VALUE_FLAGS = ['--text', '--body', '--category', '--color', '--time', '--button', '--step', '--out'];
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_FLAGS.includes(args[i - 1])));
const mockup = args.includes('--mockup');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

const jobs = [];
if (flag('text')) {
  const screen = { affirmation: flag('text') };
  for (const k of ['body', 'category', 'color', 'time', 'button']) if (flag(k)) screen[k] = flag(k);
  if (flag('step')) screen.step = Number(flag('step'));
  if (args.includes('--no-status')) screen.statusBar = false;
  jobs.push({ name: flag('out') ?? slug(screen.affirmation), screen });
} else {
  const available = existsSync(SCREENS) ? readdirSync(SCREENS).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json')).sort() : [];
  const names = positional.includes('all') ? available : positional;
  if (!names.length) {
    console.error(`Användning: npm run screen <namn>  |  npm run screen all  |  npm run screen -- --text "…"\nTillgängliga: ${available.join(', ') || '(inga)'}`);
    process.exit(1);
  }
  for (const name of names) {
    const file = join(SCREENS, `${name}.json`);
    if (!existsSync(file)) throw new Error(`Hittar inte screens/${name}.json`);
    jobs.push({ name, screen: JSON.parse(readFileSync(file, 'utf8')) });
  }
}

// ---- HTML ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fontCss = ['@fontsource/inter/400.css', '@fontsource/inter/500.css', '@fontsource/inter/600.css']
  .map((p) => `<link rel="stylesheet" href="${pathToFileURL(join(ROOT, 'node_modules', p)).href}">`).join('');

// På en Mac används systemfonten (SF Pro) och Apple-emojis, precis som i appen. Annars Inter och Noto.
const SANS = `-apple-system, 'SF Pro Text', 'Inter', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif`;

const STATUS_ICONS = `
  <svg width="19" height="12" viewBox="0 0 19 12"><g fill="#000">
    <rect x="0" y="7.5" width="3.2" height="4.5" rx=".8"/><rect x="5" y="5" width="3.2" height="7" rx=".8"/>
    <rect x="10" y="2.5" width="3.2" height="9.5" rx=".8"/><rect x="15" y="0" width="3.2" height="12" rx=".8"/></g></svg>
  <svg width="17" height="12" viewBox="0 0 17 12"><g fill="#000">
    <path d="M8.5 2.3c2.6 0 4.9 1 6.6 2.7l1.2-1.2C14.3 1.8 11.5.6 8.5.6S2.7 1.8.7 3.8l1.2 1.2C3.6 3.3 5.9 2.3 8.5 2.3z"/>
    <path d="M8.5 5.6c1.6 0 3.1.6 4.2 1.7l1.2-1.2C12.5 4.7 10.6 3.9 8.5 3.9S4.5 4.7 3.1 6.1l1.2 1.2C5.4 6.2 6.9 5.6 8.5 5.6z"/>
    <path d="M8.5 8.9c.7 0 1.3.3 1.8.7L8.5 11.6 6.7 9.6c.5-.4 1.1-.7 1.8-.7z"/></g></svg>
  <svg width="27" height="13" viewBox="0 0 27 13">
    <rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="#000" stroke-opacity=".4"/>
    <rect x="2" y="2" width="15" height="9" rx="2.5" fill="#000"/>
    <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="#000" fill-opacity=".4"/></svg>`;

function html(s) {
  const progress = Math.max(0.05, Math.min(1, s.step / s.steps)) * 0.4 / (1 / 3); // 1 av 3 ≈ 40 %, som i appen
  const [e1, e2, e3, e4] = s.emojis;
  const dots = Array.from({ length: s.steps }, (_, i) => `<span class="dot${i + 1 === s.step ? ' on' : ''}"></span>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8">${fontCss}<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${PT.w}px; height:${PT.h}px; overflow:hidden; }
  body { font-family:${SANS}; -webkit-font-smoothing:antialiased; position:relative;
    background:linear-gradient(100deg, #FCF7F2 0%, #FBF3EC 55%, #F8EBE3 100%); }
  .status { position:absolute; left:0; right:0; top:0; height:54px; display:flex; align-items:center;
    justify-content:space-between; padding:0 30px 0 39px; }
  .time { font-size:17px; font-weight:600; letter-spacing:-.01em; color:#000; padding-top:4px; }
  .icons { display:flex; align-items:center; gap:6px; padding-top:4px; }
  .track { position:absolute; left:24px; right:24px; top:67px; height:4px; border-radius:2px; background:#F5EDE3; }
  .fill { height:100%; border-radius:2px; background:#F5C7AB; width:${(Math.min(progress, 1) * 100).toFixed(1)}%; }
  .label { position:absolute; left:0; right:0; top:127px; text-align:center; font-size:11px; font-weight:400;
    letter-spacing:.32em; color:#948C8E; padding-left:.32em; }
  .sub { position:absolute; left:0; right:0; top:151px; text-align:center; font-size:13px; color:#8B7192; }
  .card { position:absolute; left:32px; top:193px; width:329px; height:439px; border-radius:30px; background:${s.color};
    box-shadow:0 18px 40px -14px rgba(60,50,60,.28), 0 4px 14px rgba(60,50,60,.06); overflow:hidden; }
  .pill { position:absolute; left:50%; top:28px; transform:translateX(-50%); white-space:nowrap; font-size:12.5px;
    font-weight:500; letter-spacing:.03em; color:rgba(255,255,255,.92); background:rgba(255,255,255,.2);
    padding:6px 14px; border-radius:999px; }
  .emo { position:absolute; opacity:.72; filter:saturate(.85); line-height:1; }
  .content { position:absolute; left:26px; right:26px; top:70px; bottom:66px; display:flex; flex-direction:column;
    align-items:center; justify-content:center; text-align:center; padding-top:48px; }
  .body { font-size:12px; line-height:23px; letter-spacing:.005em; color:rgba(255,255,255,.88); text-wrap:pretty; }
  .aff { font-size:19px; font-weight:600; line-height:1.28; color:#fff; margin-top:18px; text-wrap:balance; }
  .content.solo .aff { font-size:24px; margin-top:0; }
  .dots { position:absolute; left:0; right:0; top:655px; display:flex; justify-content:center; gap:9px; }
  .dot { width:11px; height:11px; border-radius:50%; background:#F5EDE3; }
  .dot.on { background:transparent; border:2px solid #F5D3BF; }
  .btn { position:absolute; left:24px; right:24px; top:722px; height:56px; border-radius:22px; background:#F5C7AB;
    display:flex; align-items:center; justify-content:center; font-size:15.5px; font-weight:600; color:#5C3B6D;
    box-shadow:0 8px 22px -12px rgba(200,140,110,.5); }
  </style></head><body>
  ${s.statusBar ? `<div class="status"><span class="time">${esc(s.time)}</span><span class="icons">${STATUS_ICONS}</span></div>` : ''}
  <div class="track"><div class="fill"></div></div>
  <div class="label">${esc(s.label)}</div>
  <div class="sub">Say it out loud — ${s.step} of ${s.steps}</div>
  <div class="card">
    <div class="pill">${esc(s.category)}</div>
    ${e1 ? `<span class="emo" style="left:20px;top:44px;font-size:30px">${e1}</span>` : ''}
    ${e2 ? `<span class="emo" style="right:24px;top:38px;font-size:24px">${e2}</span>` : ''}
    ${e3 ? `<span class="emo" style="left:20px;bottom:46px;font-size:24px">${e3}</span>` : ''}
    ${e4 ? `<span class="emo" style="right:16px;bottom:60px;font-size:34px">${e4}</span>` : ''}
    <div class="content${s.body ? '' : ' solo'}">
      ${s.body ? `<p class="body">${esc(s.body)}</p>` : ''}
      <p class="aff">${esc(s.affirmation)}</p>
    </div>
  </div>
  <div class="dots">${dots}</div>
  <div class="btn">${esc(s.button)}</div>
  <script>
    (async () => {
      await Promise.all([
        document.fonts.load('30px "Noto Color Emoji"', '✨🌟💛🌈🗣️💗🌸⭐🌙☀️'),
        document.fonts.load('600 16px Inter'), document.fonts.load('400 16px Inter'), document.fonts.load('500 16px Inter'),
      ].map((p) => p.catch(() => {})));
      await document.fonts.ready;
      const c = document.querySelector('.content');
      // Krymp texten lite om den inte ryms i kortet.
      let f = 1;
      while (c.scrollHeight > c.clientHeight + 1 && f > 0.6) {
        f -= 0.04;
        c.querySelectorAll('p').forEach((p) => p.style.zoom = f);
      }
      window.__fit = Math.round(f * 100);
      window.__ready = true;
    })();
  </script>
  </body></html>`;
}

// ---- Mockup: skärmen i en iPhone (titanram, Dynamic Island) på Veloras bakgrund, 1080×1920 ----
// Bilden fotograferas med deviceScaleFactor 3, så viewporten är 360×640 punkter.
const MOCK = { width: 360, height: 640 };
function mockupHtml(screenUrl, name, withBg) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const flip = h % 2 === 1; // varierar ljusfläckarna mellan dagarna
  const sw = 248; // skärmens bredd i punkter
  const sh = Math.round(sw * PT.h / PT.w);
  const bezel = 9;
  const r = 44; // skärmens hörnradie
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${MOCK.width}px; height:${MOCK.height}px; overflow:hidden; }
  body { position:relative; background:${withBg ? `
    radial-gradient(circle at ${flip ? '100% 0%' : '0% 0%'}, rgba(244,162,140,.62) 0, rgba(244,162,140,0) 58%),
    radial-gradient(circle at ${flip ? '0% 100%' : '100% 100%'}, rgba(140,123,196,.45) 0, rgba(140,123,196,0) 60%),
    #F7F1EA` : 'transparent'}; }
  html { background:transparent; }
  .phone { position:absolute; left:50%; top:50%; width:${sw + bezel * 2}px; height:${sh + bezel * 2}px;
    transform:translate(-50%, -50%); border-radius:${r + bezel}px; background:#111;
    box-shadow: 0 0 0 1.6px #8E8A87, 0 0 0 2.6px #C9C4BF, 0 0 0 3.4px #6F6B68,
      0 34px 60px -20px rgba(63,52,86,.55), 0 12px 24px -10px rgba(63,52,86,.35); }
  .btn { position:absolute; width:3px; border-radius:2px; background:linear-gradient(90deg, #6F6B68, #B9B4AF); }
  .screen { position:absolute; left:${bezel}px; top:${bezel}px; width:${sw}px; height:${sh}px; border-radius:${r}px;
    overflow:hidden; background:#FCF7F2; }
  .screen img { width:100%; height:100%; display:block; }
  .island { position:absolute; left:50%; top:${Math.round(sw * 11 / 393)}px; transform:translateX(-50%);
    width:${Math.round(sw * 125 / 393)}px; height:${Math.round(sw * 37 / 393)}px; border-radius:999px; background:#000; }
  .shine { position:absolute; inset:0; border-radius:${r}px; pointer-events:none;
    background:linear-gradient(115deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,0) 32%); }
  </style></head><body>
    <div class="phone">
      <span class="btn" style="left:-4.5px;top:96px;height:22px"></span>
      <span class="btn" style="left:-4.5px;top:136px;height:42px"></span>
      <span class="btn" style="left:-4.5px;top:186px;height:42px"></span>
      <span class="btn" style="right:-4.5px;top:150px;height:66px"></span>
      <div class="screen"><img src="${screenUrl}"><div class="island"></div><div class="shine"></div></div>
    </div>
  </body></html>`;
}

// ---- Rendera ----
async function launch() {
  try { return await chromium.launch(); } catch { return chromium.launch({ channel: 'chrome' }); }
}

mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'velora-screen-'));
const browser = await launch();
const page = await browser.newPage({ viewport: { width: PT.w, height: PT.h }, deviceScaleFactor: SCALE });
let warnings = 0;
try {
  for (const { name, screen } of jobs) {
    if (!screen.affirmation) throw new Error(`${name}: "affirmation" saknas`);
    const s = { ...DEFAULTS, ...screen };
    const file = join(tmp, `${name}.html`);
    writeFileSync(file, html(s));
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
    const fit = await page.evaluate(() => window.__fit);
    const target = join(OUT, `${name}.png`);
    await page.screenshot({ path: target });
    const warn = fit < 100 ? `  ⚠ texten krymptes till ${fit} % – överväg en kortare "body"` : '';
    if (warn) warnings++;
    console.log(`✓ output/screens/${name}.png${warn}`);
    if (mockup || screen.mockup) {
      const mockFile = join(tmp, `${name}-mockup.html`);
      writeFileSync(mockFile, mockupHtml(pathToFileURL(target).href, name, args.includes('--bg') || screen.mockupBackground === true));
      await page.setViewportSize(MOCK);
      await page.goto(pathToFileURL(mockFile).href);
      await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
      await page.screenshot({ path: join(OUT, `${name}-mockup.png`), omitBackground: true });
      await page.setViewportSize({ width: PT.w, height: PT.h });
      console.log(`✓ output/screens/${name}-mockup.png`);
    }
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}
process.exitCode = warnings ? 2 : 0;
