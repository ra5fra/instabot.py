#!/usr/bin/env node
// Användning: npm run render <namn> [-- --guides]
// Läser carousels/<namn>.json och skriver output/<namn>/01.png … + preview.png.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join } from 'node:path';
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
  console.error(`Användning: npm run render <namn>\nTillgängliga: ${available.join(', ') || '(inga)'}`);
  process.exit(1);
}

// ---- Läs och validera JSON ----
const jsonPath = join(ROOT, 'carousels', `${name}.json`);
if (!existsSync(jsonPath)) {
  console.error(`Hittar inte ${jsonPath}`);
  process.exit(1);
}
const carousel = JSON.parse(readFileSync(jsonPath, 'utf8'));

function normalize(slide, i) {
  const where = `slide ${i + 1}`;
  const type = { hook: 'title', cta: 'title' }[slide.type] ?? slide.type ?? 'title';
  if (!slide.text && !['translation', 'twist'].includes(slide.type)) throw new Error(`${where}: "text" saknas`);
  if (type === 'month') {
    const title = slide.month ?? slide.title;
    if (!title) throw new Error(`${where}: "month" saknas`);
    return { ...slide, type, title, label: slide.trope ?? slide.label };
  }
  if (type === 'twist') {
    for (const key of ['rank', 'setup', 'twist']) if (!slide[key]) throw new Error(`${where}: "${key}" saknas`);
    return { ...slide, type };
  }
  if (type === 'translation') {
    for (const key of ['rank', 'original', 'translation', 'punchline']) if (!slide[key]) throw new Error(`${where}: "${key}" saknas`);
    return { ...slide, type };
  }
  if (type === 'countdown') {
    for (const key of ['rank', 'irl', 'book']) if (!slide[key]) throw new Error(`${where}: "${key}" saknas`);
    return { ...slide, type };
  }
  if (type !== 'title') throw new Error(`${where}: okänd typ "${slide.type}" (hook, cta, title, month, countdown, translation eller twist)`);
  return { ...slide, type, subtextStyle: slide.subtextStyle ?? (slide.type === 'hook' ? 'accent' : 'light') };
}
if (!Array.isArray(carousel.slides) || !carousel.slides.length) {
  console.error('JSON:en måste ha en lista "slides"');
  process.exit(1);
}
// "smartBreaks": true i JSON slår på de nyare radbrytningsreglerna även för hook/cta/title-slides.
const slides = carousel.slides.map(normalize).map((s) => ({ smartBreaks: carousel.smartBreaks === true, ...s }));

// ---- Bakgrundsbilder (valfritt) ----
const bgDir = join(ROOT, 'backgrounds');
const bgImages = existsSync(bgDir)
  ? readdirSync(bgDir).filter((f) => ['.jpg', '.jpeg', '.png', '.webp'].includes(extname(f).toLowerCase())).map((f) => join(bgDir, f))
  : [];

const seed = carousel.seed ?? name;
const outDir = join(ROOT, 'output', name);
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (/^\d+\.png$/.test(f)) rmSync(join(outDir, f));
const guideDir = join(outDir, 'guides');
if (guides) mkdirSync(guideDir, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'karusell-'));

console.log(`Renderar "${name}" (${slides.length} slides, bakgrund: ${bgImages.length ? `${bgImages.length} bilder` : 'procedurell'})`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
let problems = 0;
let lastBg = null;
const files = [];

try {
  for (const [i, slide] of slides.entries()) {
    const rng = createRng(`${seed}:${i}`);
    let backgroundFile = null;
    if (bgImages.length) {
      const choices = bgImages.length > 1 ? bgImages.filter((b) => b !== lastBg) : bgImages;
      backgroundFile = lastBg = rng.pick(choices);
    }

    const num = String(i + 1).padStart(2, '0');
    const render = async (withGuides, target) => {
      const htmlFile = join(tmp, `${num}${withGuides ? '-guides' : ''}.html`);
      writeFileSync(htmlFile, buildSlideHtml(slide, { rng: createRng(`${seed}:${i}`), index: i, backgroundFile, guides: withGuides }));
      await page.goto(pathToFileURL(htmlFile).href);
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
      const qa = await page.evaluate(() => window.__qa);
      await page.screenshot({ path: target, clip: { x: 0, y: 0, width: W, height: H } });
      return qa;
    };

    const file = join(outDir, `${num}.png`);
    const qa = await render(false, file);
    if (guides) await render(true, join(guideDir, `${num}.png`));
    files.push(file);

    const status = qa.issues.length ? '⚠' : '✓';
    console.log(`  ${status} ${num}.png  (textskala ${Math.round((qa.scale ?? 1) * 100)} %)`);
    for (const issue of qa.issues) console.log(`      - ${issue}`);
    problems += qa.issues.length;
  }

  // ---- Kontaktbild ----
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
  console.log(`  ✓ preview.png`);
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}

console.log(problems ? `\nKlart med ${problems} varning(ar) – se ovan.` : `\nKlart! Filerna ligger i output/${name}/`);
process.exitCode = problems ? 2 : 0;
