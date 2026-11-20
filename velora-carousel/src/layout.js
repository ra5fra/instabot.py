// Körs i webbläsaren: väntar in fonterna, skalar ner all text med samma faktor tills slidens
// innehåll ryms i den säkra ytan och skriver en kvalitetsrapport till window.__qa.
(async () => {
  const SAFE = window.__SAFE;
  const qa = { scale: 1, issues: [], fonts: {} };

  const checks = {
    Fraunces: '500 80px "Fraunces"',
    'Fraunces italic': 'italic 500 80px "Fraunces"',
    'DM Sans': '500 80px "DM Sans"',
  };
  await Promise.all(Object.values(checks).map((f) => document.fonts.load(f, 'Aa').catch(() => {})));
  await document.fonts.load('80px "Noto Color Emoji"', '💗').catch(() => {});
  await document.fonts.ready;
  for (const [name, spec] of Object.entries(checks)) {
    qa.fonts[name] = document.fonts.check(spec, 'Aa');
    if (!qa.fonts[name]) qa.issues.push(`Fonten ${name} laddades inte (kör npm install)`);
  }

  const content = document.getElementById('content');
  const fits = [...document.querySelectorAll('#content [data-size]')];

  const tryScale = (scale) => {
    fits.forEach((el) => { el.style.fontSize = `${Number(el.dataset.size) * scale}px`; });
    const tooTall = content.scrollHeight > content.clientHeight + 0.5;
    const tooWide = fits.some((el) => el.scrollWidth > el.clientWidth + 1);
    return !tooTall && !tooWide;
  };

  let scale = 1;
  while (scale >= 0.5 && !tryScale(scale)) scale -= 0.02;
  qa.scale = Math.round(scale * 100) / 100;
  if (scale < 0.5) qa.issues.push('Texten får inte plats ens vid minsta storlek – korta texten');
  else if (scale < 0.7) qa.issues.push(`Texten fick krympas till ${Math.round(scale * 100)} % – överväg att korta den`);

  // Ensamt kort ord på sista raden i en rubrik ser slarvigt ut: varna.
  document.querySelectorAll('#content .serif').forEach((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (rects.length < 2) return;
    const lastTop = Math.max(...rects.map((r) => r.top));
    const lastLine = rects.filter((r) => Math.abs(r.top - lastTop) < 4);
    const width = Math.max(...lastLine.map((r) => r.right)) - Math.min(...lastLine.map((r) => r.left));
    if (width < el.clientWidth * 0.12) qa.issues.push(`Ensamt ord på sista raden: "${el.textContent.slice(-20)}"`);
  });

  // All text innanför den säkra ytan.
  const safe = { left: SAFE.left, top: SAFE.top, right: SAFE.width - SAFE.right, bottom: SAFE.height - SAFE.bottom };
  document.querySelectorAll('.txt').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const out = [];
    if (r.top < safe.top - 0.5) out.push('topp');
    if (r.bottom > safe.bottom + 0.5) out.push('botten');
    if (r.left < safe.left - 0.5) out.push('vänster');
    if (r.right > safe.right + 0.5) out.push('höger');
    if (out.length) qa.issues.push(`"${el.textContent.trim().slice(0, 30)}" utanför säker yta: ${out.join(', ')}`);
  });

  window.__qa = qa;
  window.__ready = true;
})().catch((err) => {
  window.__qa = { issues: [`Layoutfel: ${err.message}`] };
  window.__ready = true;
});
