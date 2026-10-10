// Bakgrund: dimmig skog i svartvitt. Antingen ett foto från ./backgrounds (med mörk overlay)
// eller en procedurell scen med granlager, dimband och filmkorn.
import { W, H } from './config.mjs';

const f = (n) => n.toFixed(1);

// En gransilhuett som SVG-path: sågtandade grenvåningar som hänger nedåt, smalare mot toppen.
function sprucePath(rng, cx, baseY, height, halfWidth) {
  const top = baseY - height;
  const crown = height * 0.93;
  const tiers = Math.max(9, Math.round(height / 34));
  const trunk = Math.max(3, halfWidth * 0.06);

  const side = (dir) => {
    const pts = [];
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers;
      const tierH = crown / tiers;
      const y = top + t * crown;
      const hw = halfWidth * Math.pow(t, 0.8) * rng.range(0.7, 1.12);
      // inre skåra → barrig kant som hänger nedåt → spets
      pts.push([cx + dir * hw * rng.range(0.25, 0.45), y - tierH * rng.range(0.7, 1.0)]);
      pts.push([cx + dir * hw * rng.range(0.55, 0.7), y - tierH * rng.range(0.25, 0.5)]);
      pts.push([cx + dir * hw * rng.range(0.78, 0.9), y - tierH * rng.range(0.0, 0.25)]);
      pts.push([cx + dir * hw, y + tierH * rng.range(0.15, 0.45)]);
    }
    pts.push([cx + dir * trunk, top + crown]);
    pts.push([cx + dir * trunk, baseY]);
    return pts;
  };

  const left = side(-1);
  const right = side(1).reverse();
  const pts = [[cx + rng.range(-1.5, 1.5), top], ...left, ...right];
  return 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
}

function treeLayer(rng, { count, baseY, baseJitter, hMin, hMax, widthRatio, xMin = -80, xMax = W + 80, avoidCenter = 0 }) {
  const paths = [];
  for (let i = 0; i < count; i++) {
    let x = rng.range(xMin, xMax);
    if (avoidCenter && Math.abs(x - W / 2) < avoidCenter) {
      x = x < W / 2 ? W / 2 - avoidCenter - rng.range(0, 120) : W / 2 + avoidCenter + rng.range(0, 120);
    }
    const h = rng.range(hMin, hMax);
    paths.push(sprucePath(rng, x, baseY + rng.range(-baseJitter, baseJitter), h, h * widthRatio * rng.range(0.85, 1.15)));
  }
  return paths.join('');
}

const GRAIN = `
  <svg class="grain" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#grain)"/>
  </svg>`;

export function proceduralBackground(rng) {
  const far = treeLayer(rng, { count: 34, baseY: 1300, baseJitter: 40, hMin: 260, hMax: 520, widthRatio: 0.2 });
  const mid = treeLayer(rng, { count: 16, baseY: 1560, baseJitter: 60, hMin: 560, hMax: 980, widthRatio: 0.21 });
  const near = treeLayer(rng, { count: 5, baseY: 2000, baseJitter: 30, hMin: 1250, hMax: 1700, widthRatio: 0.22, avoidCenter: 330 });
  const fogY1 = rng.range(1080, 1220);
  const fogY2 = rng.range(1380, 1520);

  return `
  <div class="bg bg-sky"></div>
  <svg class="bg" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${far}" fill="#2c3035" opacity="0.75" style="filter:blur(3.5px)"/>
  </svg>
  <div class="fog" style="top:${f(fogY1)}px;height:340px;opacity:.5"></div>
  <svg class="bg" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${mid}" fill="#25292d" opacity="0.92" style="filter:blur(1.2px)"/>
  </svg>
  <div class="fog" style="top:${f(fogY2)}px;height:420px;opacity:.42"></div>
  <div class="fog fog-wide" style="top:${f(rng.range(560, 760))}px;height:260px;opacity:.12"></div>
  <svg class="bg" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${near}" fill="#060708" style="filter:blur(.8px)"/>
  </svg>
  <div class="fog" style="top:1700px;height:360px;opacity:.22"></div>
  <div class="bg vignette"></div>
  ${GRAIN}`;
}

export function imageBackground(fileUrl) {
  return `
  <div class="bg bg-photo" style="background-image:url('${fileUrl}')"></div>
  <div class="bg photo-overlay"></div>
  <div class="bg vignette"></div>
  ${GRAIN}`;
}

export const BACKGROUND_CSS = `
  .bg { position:absolute; inset:0; width:${W}px; height:${H}px; }
  .bg-sky { background:
      radial-gradient(ellipse 900px 520px at 50% 64%, rgba(170,176,182,.30), transparent 70%),
      linear-gradient(180deg, #07080a 0%, #111417 26%, #2b3035 52%, #3d4247 64%, #24282c 80%, #08090a 100%); }
  .fog { position:absolute; left:-200px; width:${W + 400}px;
      background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(225,230,235,.9), rgba(225,230,235,.35) 45%, transparent 72%);
      filter: blur(38px); }
  .fog-wide { background: linear-gradient(90deg, transparent, rgba(225,230,235,.8) 30%, rgba(225,230,235,.8) 70%, transparent); }
  .vignette { background: radial-gradient(ellipse 85% 75% at 50% 48%, transparent 55%, rgba(0,0,0,.72) 100%); }
  .bg-photo { background-size:cover; background-position:center; filter: grayscale(1) contrast(1.08) brightness(.82); }
  .photo-overlay { background: linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.35) 45%, rgba(0,0,0,.6)); }
  .grain { position:absolute; inset:0; opacity:.06; mix-blend-mode: screen; }
`;
