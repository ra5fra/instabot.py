// Procedural black marble: plum-black gradient, cloudy texture, thin rose gold veins with
// foil flecks (like the cover), vignette and fine film grain.
import { W, H, COLORS } from './config.mjs';

const f = (n) => n.toFixed(1);

// One vein: a wandering random walk from an edge, with occasional thin branches.
function vein(rng, start, angle, length, width, depth = 0) {
  const pts = [start];
  let [x, y] = start;
  let a = angle;
  let heading = angle; // the vein slowly bends but keeps its overall direction
  const flecks = [];
  const branches = [];
  for (let walked = 0; walked < length; ) {
    const step = rng.range(4, 10);
    heading += rng.range(-0.06, 0.06);
    a += (heading - a) * 0.25 + rng.range(-0.35, 0.35); // small cracks around a smooth line
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    walked += step;
    pts.push([x, y]);
    if (rng.chance(0.22)) flecks.push([x + rng.range(-9, 9), y + rng.range(-9, 9), rng.range(0.6, 2.2)]);
    if (depth < 2 && rng.chance(0.035)) {
      branches.push(vein(rng, [x, y], a + rng.range(0.5, 1.1) * (rng.chance(0.5) ? 1 : -1),
        length * rng.range(0.2, 0.45), width * 0.55, depth + 1));
    }
  }
  return { d: 'M' + pts.map(([px, py]) => `${f(px)} ${f(py)}`).join('L'), width, flecks, branches };
}

function flatten(v, out = []) {
  out.push(v);
  v.branches.forEach((b) => flatten(b, out));
  return out;
}

// Veins start at the edges and run diagonally, densest at the bottom and the sides (as on the cover).
const STARTS = [
  () => [-20, 1450, -0.5], () => [-20, 1750, -0.35], () => [W + 20, 1500, Math.PI + 0.45],
  () => [W + 20, 1820, Math.PI + 0.3], () => [200, H + 20, -1.2], () => [880, H + 20, -1.9],
  () => [-20, 420, 0.35], () => [W + 20, 260, Math.PI - 0.4], () => [-20, 900, 0.1], () => [W + 20, 1080, Math.PI - 0.1],
];

export function marbleBackground(rng) {
  const veins = [];
  for (const start of STARTS) {
    const [x, y, a] = start();
    veins.push(...flatten(vein(rng, [x + rng.range(-60, 60), y + rng.range(-80, 80)], a + rng.range(-0.25, 0.25),
      rng.range(500, 1300), rng.range(1.2, 2.6))));
  }
  // A few broad, soft veins underneath for depth (like real marble).
  const broad = [0, 1, 2, 3].map(() => {
    const [x, y, a] = rng.pick(STARTS)();
    return vein(rng, [x + rng.range(-120, 120), y + rng.range(-150, 150)], a + rng.range(-0.3, 0.3), rng.range(700, 1400), 1).d;
  });
  const glow = veins.map((v) => `<path d="${v.d}" stroke-width="${f(v.width * 5)}"/>`).join('');
  const core = veins.map((v) => `<path d="${v.d}" stroke-width="${f(v.width)}"/>`).join('');
  const flecks = veins.flatMap((v) => v.flecks)
    .map(([x, y, r]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" opacity="${f(rng.range(0.3, 0.9))}"/>`).join('');

  return `
  <div class="bg marble-base"></div>
  <svg class="bg" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <filter id="clouds"><feTurbulence type="fractalNoise" baseFrequency="0.0035 0.006" numOctaves="4" seed="${rng.int(1, 999)}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0.26  0 0 0 0 0.17  0 0 0 0 0.24  0 0 0 1.4 -0.5"/></filter>
    <rect width="100%" height="100%" filter="url(#clouds)" opacity=".32"/>
  </svg>
  <svg class="bg" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="calm" cx="50%" cy="44%" r="62%">
        <stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".55" stop-color="#fff" stop-opacity=".7"/>
        <stop offset="1" stop-color="#fff" stop-opacity="1"/>
      </radialGradient>
      <mask id="veinmask"><rect width="100%" height="100%" fill="url(#calm)"/></mask>
    </defs>
    <g mask="url(#veinmask)">
      <g fill="none" stroke="${COLORS.roseDeep}" stroke-linecap="round" opacity=".16" style="filter:blur(14px)">
        ${broad.map((d) => `<path d="${d}" stroke-width="${f(rng.range(26, 54))}"/>`).join('')}</g>
      <g fill="none" stroke="${COLORS.roseDark}" stroke-linecap="round" stroke-linejoin="round" opacity=".22" style="filter:blur(4px)">${glow}</g>
      <g fill="none" stroke="${COLORS.rose}" stroke-linecap="round" stroke-linejoin="round" opacity=".62">${core}</g>
      <g fill="${COLORS.roseLight}">${flecks}</g>
    </g>
  </svg>
  <div class="bg vignette"></div>
  <svg class="grain" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#grain)"/>
  </svg>`;
}

export const BACKGROUND_CSS = `
  .bg { position:absolute; inset:0; width:${W}px; height:${H}px; }
  .marble-base { background:
      radial-gradient(ellipse 900px 700px at 30% 30%, rgba(70,40,62,.35), transparent 70%),
      radial-gradient(ellipse 800px 900px at 75% 75%, rgba(60,32,52,.3), transparent 70%),
      linear-gradient(170deg, #150A15 0%, ${COLORS.plum} 45%, #120812 100%); }
  .vignette { background: radial-gradient(ellipse 85% 75% at 50% 46%, transparent 55%, rgba(0,0,0,.7) 100%); }
  .grain { position:absolute; inset:0; opacity:.06; mix-blend-mode:screen; }
`;
