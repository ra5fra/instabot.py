// Laddar ner fonterna som används av renderaren till ./fonts (hoppar över filer som redan finns).
// TikTok Sans är förstahandsval; Montserrat ExtraBold är reserv om TikTok Sans inte går att hämta.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FONT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts');

// Utan webbläsar-User-Agent svarar Google Fonts med hela TTF-filer (inte uppdelade woff2-subset).
const FONTS = [
  { file: 'TikTokSans-ExtraBold.ttf', family: 'TikTok Sans', css: 'TikTok+Sans:wght@800' },
  { file: 'TikTokSans-Black.ttf', family: 'TikTok Sans', css: 'TikTok+Sans:wght@900' },
  { file: 'Montserrat-ExtraBold.ttf', family: 'Montserrat', css: 'Montserrat:wght@800' },
  { file: 'CormorantGaramond-Light.ttf', family: 'Cormorant Garamond', css: 'Cormorant+Garamond:wght@300' },
  { file: 'CormorantGaramond-LightItalic.ttf', family: 'Cormorant Garamond', css: 'Cormorant+Garamond:ital,wght@1,300' },
  { file: 'NotoColorEmoji.ttf', family: 'Noto Color Emoji', css: 'Noto+Color+Emoji' },
];

async function fetchFont({ file, css }) {
  const target = join(FONT_DIR, file);
  if (existsSync(target)) return 'finns redan';
  const cssRes = await fetch(`https://fonts.googleapis.com/css2?family=${css}`);
  if (!cssRes.ok) throw new Error(`CSS ${cssRes.status}`);
  const url = (await cssRes.text()).match(/url\((https:[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error('ingen TTF-länk i CSS-svaret');
  const fontRes = await fetch(url);
  if (!fontRes.ok) throw new Error(`font ${fontRes.status}`);
  writeFileSync(target, Buffer.from(await fontRes.arrayBuffer()));
  return 'nedladdad';
}

mkdirSync(FONT_DIR, { recursive: true });
let failed = 0;
for (const font of FONTS) {
  try {
    console.log(`  ${font.file}: ${await fetchFont(font)}`);
  } catch (err) {
    failed++;
    console.warn(`  ${font.file}: misslyckades (${err.message})`);
  }
}
if (failed) console.warn(`${failed} font(er) kunde inte hämtas – renderaren använder reservfonter för dessa.`);
