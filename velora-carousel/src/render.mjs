#!/usr/bin/env node
// Användning: npm run render <namn>   |   npm run render all   [-- --guides]
// Läser carousels/<namn>.json och skriver output/<namn>/01.png … + preview.png.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { W, H } from './config.mjs';
import { createRng } from './random.mjs';
import { buildSlideHtml } from './template.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const args = process.argv.slice(2);
const guides = args.includes('--guides');
const available = readdirSync(join(ROOT, 'carousels')).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json')).sort();
const requested = args.filter((a) => !a.startsWith('--'));

if (!requested.length) {
  console.error(`Användning: npm run render <namn>   eller   npm run render all\nTillgängliga: ${available.join(', ') || '(inga)'}`);
  process.exit(1);
}
const names = requested.includes('all') ? available : requested;

const REQUIRED = {
  hook: ['text'],
  point: ['text'],
  bubble: ['messages'],
  swap: ['from', 'to'],
  app: ['affirmation'],
  cta: ['text'],
};

function load(name) {
  const path = join(ROOT, 'carousels', `${name}.json`);
  if (!existsSync(path)) throw new Error(`Hittar inte carousels/${name}.json`);
  const carousel = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(carousel.slides) || !carousel.slides.length) throw new Error(`${name}: JSON:en måste ha en lista "slides"`);
  carousel.slides.forEach((s, i) => {
    const keys = REQUIRED[s.type];
    if (!keys) throw new Error(`${name}, slide ${i + 1}: okänd typ "${s.type}" (${Object.keys(REQUIRED).join(', ')})`);
    for (const k of keys) if (!s[k]) throw new Error(`${name}, slide ${i + 1}: "${k}" saknas`);
  });
  return carousel;
}

async function launch() {
  try {
    return await chromium.launch();
  } catch {
    // Ingen Playwright-Chromium installerad: använd Google Chrome om den finns.
    return chromium.launch({ channel: 'chrome' });
  }
}

const browser = await launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let problems = 0;

try {
  for (const name of names) {
    const carousel = load(name);
    const slides = carousel.slides;
    const seed = carousel.seed ?? name;
    const outDir = join(ROOT, 'output', name);
    mkdirSync(outDir, { recursive: true });
    for (const f of readdirSync(outDir)) if (/^\d+\.png$/.test(f)) rmSync(join(outDir, f));
    if (guides) mkdirSync(join(outDir, 'guides'), { recursive: true });
    const tmp = mkdtempSync(join(tmpdir(), 'velora-'));
    const files = [];
    console.log(`\nRenderar "${name}" (${slides.length} slides)`);

    for (const [i, slide] of slides.entries()) {
      const num = String(i + 1).padStart(2, '0');
      const render = async (withGuides, target) => {
        const html = join(tmp, `${num}${withGuides ? '-g' : ''}.html`);
        writeFileSync(html, buildSlideHtml(slide, { rng: createRng(`${seed}:${i}`), index: i, total: slides.length, guides: withGuides, handle: carousel.handle }));
        await page.setViewportSize({ width: W, height: H });
        await page.goto(pathToFileURL(html).href);
        await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
        const qa = await page.evaluate(() => window.__qa);
        await page.screenshot({ path: target, clip: { x: 0, y: 0, width: W, height: H } });
        return qa;
      };
      const file = join(outDir, `${num}.png`);
      const qa = await render(false, file);
      if (guides) await render(true, join(outDir, 'guides', `${num}.png`));
      files.push(file);
      console.log(`  ${qa.issues.length ? '⚠' : '✓'} ${num}.png  (textskala ${Math.round((qa.scale ?? 1) * 100)} %)`);
      for (const issue of qa.issues) console.log(`      - ${issue}`);
      problems += qa.issues.length;
    }

    // Kontaktbild med alla slides, för snabb granskning.
    const cols = Math.min(4, files.length);
    const rows = Math.ceil(files.length / cols);
    const tw = 360;
    const th = 450;
    const gap = 24;
    const sheetW = cols * tw + (cols + 1) * gap;
    const sheetH = rows * (th + 44) + (rows + 1) * gap;
    writeFileSync(join(tmp, 'preview.html'), `<!doctype html><html><head><meta charset="utf-8"><style>
      body { margin:0; background:#ece6df; width:${sheetW}px; height:${sheetH}px; font:600 22px sans-serif; color:#7d6f80; }
      .grid { display:grid; grid-template-columns:repeat(${cols}, ${tw}px); gap:${gap}px; padding:${gap}px; }
      figure { margin:0; } img { width:${tw}px; height:${th}px; display:block; border-radius:10px; box-shadow:0 6px 20px rgba(0,0,0,.12); }
      figcaption { height:44px; line-height:44px; text-align:center; }
    </style></head><body><div class="grid">
      ${files.map((f, i) => `<figure><img src="${pathToFileURL(f).href}"><figcaption>${String(i + 1).padStart(2, '0')}</figcaption></figure>`).join('')}
    </div></body></html>`);
    await page.setViewportSize({ width: sheetW, height: sheetH });
    await page.goto(pathToFileURL(join(tmp, 'preview.html')).href);
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
    await page.screenshot({ path: join(outDir, 'preview.png'), clip: { x: 0, y: 0, width: sheetW, height: sheetH } });
    console.log('  ✓ preview.png');
    rmSync(tmp, { recursive: true, force: true });
  }
} finally {
  await browser.close();
}

console.log(problems ? `\nKlart med ${problems} varning(ar) – se ovan.` : `\nKlart! Bilderna ligger i output/`);
process.exitCode = problems ? 2 : 0;
