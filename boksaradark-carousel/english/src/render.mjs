#!/usr/bin/env node
// Usage: npm run render <name> [-- --guides]
// Reads carousels/<name>.json and writes output/<name>/01.png … + preview.png.
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
const name = args.find((a) => !a.startsWith('--'));
const guides = args.includes('--guides');

if (!name) {
  const available = readdirSync(join(ROOT, 'carousels')).filter((f) => f.endsWith('.json')).map((f) => basename(f, '.json'));
  console.error(`Usage: npm run render <name>\nAvailable: ${available.join(', ') || '(none)'}`);
  process.exit(1);
}

// ---- Read and validate the JSON ----
const jsonPath = join(ROOT, 'carousels', `${name}.json`);
if (!existsSync(jsonPath)) {
  console.error(`Cannot find ${jsonPath}`);
  process.exit(1);
}
const carousel = JSON.parse(readFileSync(jsonPath, 'utf8'));

function normalize(slide, i) {
  const where = `slide ${i + 1}`;
  const type = { hook: 'title', cta: 'title' }[slide.type] ?? slide.type ?? 'title';
  const require = (...keys) => keys.forEach((k) => { if (!slide[k]) throw new Error(`${where}: "${k}" is missing`); });
  if (type === 'countdown') {
    require('rank', 'text', 'irl', 'book');
    return { ...slide, type };
  }
  if (type === 'cover') {
    require('image');
    if (!existsSync(join(ROOT, slide.image))) throw new Error(`${where}: image not found: ${slide.image}`);
    return { ...slide, type };
  }
  if (type !== 'title') throw new Error(`${where}: unknown type "${slide.type}" (hook, cta, countdown or cover)`);
  require('text');
  return { ...slide, type, subtextStyle: slide.subtextStyle ?? (slide.type === 'cta' ? 'light' : 'rose') };
}
if (!Array.isArray(carousel.slides) || !carousel.slides.length) {
  console.error('The JSON needs a "slides" list');
  process.exit(1);
}
const slides = carousel.slides.map(normalize);

const seed = carousel.seed ?? name;
const outDir = join(ROOT, 'output', name);
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^\d+\.png$/.test(f)) rmSync(join(outDir, f));
const guideDir = join(outDir, 'guides');
if (guides) mkdirSync(guideDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'carousel-en-'));

console.log(`Rendering "${name}" (${slides.length} slides)`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let problems = 0;
const files = [];

try {
  for (const [i, slide] of slides.entries()) {
    const num = String(i + 1).padStart(2, '0');
    const render = async (withGuides, target) => {
      const htmlFile = join(tmp, `${num}${withGuides ? '-guides' : ''}.html`);
      writeFileSync(htmlFile, buildSlideHtml(slide, { rng: createRng(`${seed}:${i}`), guides: withGuides }));
      await page.goto(pathToFileURL(htmlFile).href);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
      await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
      const qa = await page.evaluate(() => window.__qa);
      await page.screenshot({ path: target, clip: { x: 0, y: 0, width: W, height: H } });
      return qa;
    };

    const file = join(outDir, `${num}.png`);
    const qa = await render(false, file);
    if (guides) await render(true, join(guideDir, `${num}.png`));
    files.push(file);

    console.log(`  ${qa.issues.length ? '⚠' : '✓'} ${num}.png  (text scale ${Math.round((qa.scale ?? 1) * 100)} %)`);
    for (const issue of qa.issues) console.log(`      - ${issue}`);
    problems += qa.issues.length;
  }

  // ---- Contact sheet ----
  const cols = Math.min(4, files.length);
  const rows = Math.ceil(files.length / cols);
  const tw = 360;
  const th = 640;
  const gap = 24;
  const sheetW = cols * tw + (cols + 1) * gap;
  const sheetH = rows * (th + 44) + (rows + 1) * gap;
  const sheet = `<!doctype html><html><head><meta charset="utf-8"><style>
    body { margin:0; background:#151517; width:${sheetW}px; height:${sheetH}px; font:600 22px sans-serif; color:#bbb; }
    .grid { display:grid; grid-template-columns:repeat(${cols}, ${tw}px); gap:${gap}px; padding:${gap}px; }
    figure { margin:0; } img { width:${tw}px; height:${th}px; display:block; border-radius:10px; }
    figcaption { height:44px; line-height:44px; text-align:center; }
  </style></head><body><div class="grid">
    ${files.map((f, i) => `<figure><img src="${pathToFileURL(f).href}"><figcaption>${String(i + 1).padStart(2, '0')}</figcaption></figure>`).join('')}
  </div></body></html>`;
  const sheetFile = join(tmp, 'preview.html');
  writeFileSync(sheetFile, sheet);
  await page.setViewportSize({ width: sheetW, height: sheetH });
  await page.goto(pathToFileURL(sheetFile).href);
  await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  await page.screenshot({ path: join(outDir, 'preview.png'), clip: { x: 0, y: 0, width: sheetW, height: sheetH } });
  console.log('  ✓ preview.png');
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}

console.log(problems ? `\nDone with ${problems} warning(s) – see above.` : `\nDone! Files are in output/${name}/`);
process.exitCode = problems ? 2 : 0;
