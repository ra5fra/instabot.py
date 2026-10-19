// Downloads the fonts used by the renderer into ./assets/fonts (skips files that already exist).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'fonts');

// Without a browser User-Agent, Google Fonts answers with full TTF files.
const FONTS = [
  { file: 'Cinzel-Regular.ttf', css: 'Cinzel:wght@400' },
  { file: 'Cinzel-SemiBold.ttf', css: 'Cinzel:wght@600' },
  { file: 'TikTokSans-ExtraBold.ttf', css: 'TikTok+Sans:wght@800' },
  { file: 'TikTokSans-Black.ttf', css: 'TikTok+Sans:wght@900' },
  { file: 'Montserrat-ExtraBold.ttf', css: 'Montserrat:wght@800' },
  { file: 'NotoColorEmoji.ttf', css: 'Noto+Color+Emoji' },
];

async function fetchFont({ file, css }) {
  const target = join(FONT_DIR, file);
  if (existsSync(target)) return 'already there';
  const cssRes = await fetch(`https://fonts.googleapis.com/css2?family=${css}`);
  if (!cssRes.ok) throw new Error(`CSS ${cssRes.status}`);
  const url = (await cssRes.text()).match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error('no TTF link in the CSS response');
  const fontRes = await fetch(url);
  if (!fontRes.ok) throw new Error(`font ${fontRes.status}`);
  writeFileSync(target, Buffer.from(await fontRes.arrayBuffer()));
  return 'downloaded';
}

mkdirSync(FONT_DIR, { recursive: true });
let failed = 0;
for (const font of FONTS) {
  try {
    console.log(`  ${font.file}: ${await fetchFont(font)}`);
  } catch (err) {
    failed++;
    console.warn(`  ${font.file}: failed (${err.message})`);
  }
}
if (failed) console.warn(`${failed} font(s) could not be downloaded – the renderer falls back for those.`);
