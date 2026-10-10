// Egna 2D-ornament i SVG: törnrankor, rosor och fjärilar. Ligger bakom texten med låg opacitet.
import { W, H, COLORS } from './config.mjs';

const f = (n) => n.toFixed(1);

// Linjeros med stjälk, blad och taggar. Ritad kring (0,0), huvudet ~120px brett.
const ROSE = `
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M0 -8C10 -10 14 0 6 6C-4 13 -16 4 -12 -8C-8 -20 12 -24 22 -12C32 0 24 20 4 24C-18 28 -32 10 -28 -10C-25 -26 -8 -34 8 -32"/>
    <path d="M-28 -10C-48 -6 -56 22 -40 40C-26 54 6 58 24 46"/>
    <path d="M22 -12C40 -20 56 0 52 22C48 40 36 48 24 46"/>
    <path d="M-20 -26C-16 -48 16 -50 30 -32C36 -24 38 -16 34 -8"/>
    <path d="M-46 12C-44 54 32 66 50 22"/>
    <path d="M-14 56C-6 50 6 50 14 56M0 54L-2 64"/>
    <path d="M-2 64C2 110 -8 160 4 230"/>
    <path d="M1 120C28 98 56 106 64 126C38 136 16 132 1 120Z"/>
    <path d="M1 120C24 118 44 120 64 126"/>
    <path d="M-1 172C-28 156 -54 166 -60 184C-32 192 -12 186 -1 172Z"/>
    <path d="M-1 172C-20 176 -40 180 -60 184"/>
    <path d="M-2 92L-14 86L-3 98M2 148L14 140L3 154M2 205L-12 200L1 212"/>
  </g>`;

// Fjäril: fyllda vingar med kontur, kropp och antenner. Ritad kring (0,0), ~100px bred.
const BUTTERFLY_WING = `
  <path d="M0 -2C8 -32 40 -42 48 -24C54 -8 32 4 2 2Z"/>
  <path d="M1 3C22 6 38 20 29 34C20 44 6 28 1 7Z"/>
  <path d="M10 -10C20 -22 32 -26 38 -22" fill="none"/>`;

const BUTTERFLY = `
  <g stroke-linejoin="round">
    <g>${BUTTERFLY_WING}</g>
    <g transform="scale(-1 1)">${BUTTERFLY_WING}</g>
    <ellipse cx="0" cy="4" rx="2.6" ry="15" stroke="none"/>
    <path d="M0 -10C2 -22 8 -28 13 -31M0 -10C-2 -22 -8 -28 -13 -31" fill="none"/>
  </g>`;

// En slingrande ranka som går in från en kant; taggarna läggs till i webbläsaren (se layout.js).
function vinePath(rng, from) {
  const pts = [];
  if (from === 'top-left') {
    pts.push([-40, rng.range(150, 260)]);
    pts.push([rng.range(160, 260), rng.range(80, 160)], [rng.range(240, 340), rng.range(360, 440)]);
    pts.push([rng.range(420, 560), rng.range(170, 230)]);
    pts.push([rng.range(600, 700), rng.range(60, 120)], [rng.range(720, 800), rng.range(200, 260)]);
    pts.push([rng.range(860, 940), rng.range(80, 140)]);
  } else {
    pts.push([W + 40, rng.range(1560, 1680)]);
    pts.push([rng.range(860, 960), rng.range(1720, 1800)], [rng.range(760, 860), rng.range(1500, 1560)]);
    pts.push([rng.range(600, 700), rng.range(1690, 1760)]);
    pts.push([rng.range(460, 540), rng.range(1860, 1900)], [rng.range(340, 420), rng.range(1650, 1700)]);
    pts.push([rng.range(160, 260), rng.range(1800, 1860)]);
  }
  const [s, c1, c2, e, c3, c4, e2] = pts;
  return `M${s.map(f)}C${c1.map(f)} ${c2.map(f)} ${e.map(f)}C${c3.map(f)} ${c4.map(f)} ${e2.map(f)}`;
}

export function ornaments(rng, { variant }) {
  const parts = [];

  for (const from of ['top-left', 'bottom-right']) {
    parts.push(`<path class="vine" data-thorns="1" d="${vinePath(rng, from)}"
      stroke="#fff" stroke-opacity=".2" stroke-width="3.2" fill="none" stroke-linecap="round"/>`);
  }

  // Rosen hamnar omväxlande nere till vänster och nere till höger, under/bredvid textrutan.
  const roseLeft = variant % 2 === 0;
  const rx = roseLeft ? rng.range(140, 200) : rng.range(860, 930);
  const ry = rng.range(1260, 1330);
  const rot = roseLeft ? rng.range(-24, -12) : rng.range(12, 24);
  parts.push(`<g transform="translate(${f(rx)} ${f(ry)}) rotate(${f(rot)}) scale(${f(rng.range(1.45, 1.7))})"
    stroke="${COLORS.accent}" stroke-width="2.4" opacity=".55">${ROSE}</g>`);

  const butterflies = [
    { x: roseLeft ? rng.range(800, 880) : rng.range(170, 250), y: rng.range(360, 460), s: rng.range(0.9, 1.15), color: '#fff', op: 0.24 },
    { x: roseLeft ? rng.range(700, 800) : rng.range(280, 380), y: rng.range(1340, 1420), s: rng.range(0.55, 0.75), color: COLORS.accent, op: 0.5 },
  ];
  for (const b of butterflies) {
    parts.push(`<g transform="translate(${f(b.x)} ${f(b.y)}) rotate(${f(rng.range(-30, 30))}) scale(${f(b.s)})"
      fill="${b.color}" fill-opacity=".55" stroke="${b.color}" stroke-width="2" opacity="${b.op}">${BUTTERFLY}</g>`);
  }

  return `<svg class="ornaments" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`;
}
