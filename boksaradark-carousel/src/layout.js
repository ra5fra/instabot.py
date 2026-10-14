// Körs i webbläsaren: bygger TikTok-textrutorna rad för rad, krymper texten tills allt får plats
// i den säkra zonen, lägger till taggar på rankorna och skriver en kvalitetsrapport till window.__qa.
(async () => {
  const SAFE = window.__SAFE;
  const RADIUS = 24;
  const qa = { scale: 1, issues: [], fonts: {} };

  // ---- Fonter: ladda explicit innan något mäts ----
  const fontChecks = {
    'TikTok Sans': '800 80px "TikTok Sans"',
    Montserrat: '800 80px "Montserrat"',
    'Cormorant Garamond': '300 80px "Cormorant Garamond"',
    'Noto Color Emoji': '80px "BokEmoji"',
  };
  await Promise.all(Object.values(fontChecks).map((f) => document.fonts.load(f, 'AåäöÅÄÖ🖤').catch(() => {})));
  await document.fonts.ready;
  for (const [name, spec] of Object.entries(fontChecks)) qa.fonts[name] = document.fonts.check(spec, 'Aå🖤');
  if (!qa.fonts['TikTok Sans'] && !qa.fonts.Montserrat) qa.issues.push('Varken TikTok Sans eller Montserrat laddades');
  if (!qa.fonts['Noto Color Emoji']) qa.issues.push('Noto Color Emoji laddades inte – emojis kan bli rutor');

  // ---- Text → ord-token. *så här* markerar accentord (röd text). \n tvingar ny rad. ----
  // Ett token med nb=true binds till nästa ord med hårt mellanslag (ingen radbrytning emellan).
  // Korta ord (i, på, en, du …) binds alltid så att en rad aldrig slutar på dem.
  const isShortWord = (t) => /^[\p{L}\p{N}]{1,2}$/u.test(t);

  // smart (opt-in via klassen "smart" på textrutan, används av nyare karuseller):
  //  - långa sammansättningar delas efter bindestreck, men bara om hela ordet inte ryms (fits)
  //  - en röd accentfras (*så här*) hålls ihop på en rad
  //  - emojis och tecken (😭, →, ·) hamnar aldrig först på en rad
  function tokenize(text, prefix, smart = false, fits = () => true) {
    let em = false;
    const words = (str, pre) => str.split(' ').filter(Boolean).flatMap((word) => {
      let t = word;
      let wordEm = em;
      if (!pre && t.startsWith('*')) { t = t.slice(1); wordEm = true; em = true; }
      if (!pre && t.endsWith('*')) { t = t.slice(0, -1); em = false; }
      // Mjukt bindestreck (\u00ad) i JSON = tillåten delning av långa sammansättningar ("Biljett-|kontrollanten").
      const whole = t.replace(/\u00ad/g, '');
      const parts = smart && !fits(whole)
        ? t.split(/(?<=\p{L}-)(?=\p{L})|\u00ad/u).map((p, i, all) => (i < all.length - 1 && !p.endsWith('-') ? `${p}-` : p))
        : [whole];
      return parts.map((part, i) => ({ t: part, em: wordEm, pre, nb: isShortWord(part), join: i < parts.length - 1 }));
    });
    return text.split('\n').map((para, i) => {
      const pre = i === 0 && prefix ? words(prefix, true) : [];
      if (pre.length) pre[pre.length - 1].nb = true; // etiketten ("IRL:") följer alltid med första ordet
      const toks = [...pre, ...words(para, false)];
      if (smart) {
        toks.forEach((tok, j) => { if (tok.em && toks[j + 1]?.em) tok.nb = true; });
        toks.forEach((tok, j) => { if (j && /^[^\p{L}\p{N}]+$/u.test(tok.t)) toks[j - 1].nb = true; });
      }
      if (toks.length) toks[toks.length - 1].nb = false;
      return toks;
    });
  }

  function wordSpan(tok) {
    const s = document.createElement('span');
    s.textContent = tok.t;
    s.className = [tok.em && 'em', tok.pre && 'pre'].filter(Boolean).join(' ');
    return s;
  }

  function appendTokens(parent, toks) {
    toks.forEach((tok, i) => {
      // join: brytpunkt utan mellanslag (nollbredds-mellanslag) efter ett bindestreck
      if (i) parent.appendChild(document.createTextNode(toks[i - 1].join ? '\u200b' : toks[i - 1].nb ? '\u00a0' : ' '));
      parent.appendChild(wordSpan(tok));
    });
  }

  // Bryter texten balanserat (text-wrap: balance) och returnerar rader med uppmätt bredd.
  function measureLines(stack, fontSize, padX) {
    const maxTextW = stack.parentElement.clientWidth - padX * 2;
    const meas = document.createElement('div');
    meas.className = `measure ${stack.className}`;
    meas.style.cssText = `font-size:${fontSize}px;width:${maxTextW}px`;
    document.body.appendChild(meas);

    const smart = stack.classList.contains('smart');
    const fits = (word) => {
      const probe = document.createElement('span');
      probe.className = 'measure-line';
      probe.textContent = word;
      meas.appendChild(probe);
      const ok = probe.getBoundingClientRect().width <= maxTextW;
      probe.remove();
      return ok;
    };
    const lines = [];
    for (const para of tokenize(stack.dataset.text, stack.dataset.prefix, smart, fits)) {
      const p = document.createElement('div');
      p.className = 'measure-para';
      appendTokens(p, para);
      meas.appendChild(p);
      let current = null;
      let lastTop = null;
      [...p.querySelectorAll('span')].forEach((span, i) => {
        const top = Math.round(span.getBoundingClientRect().top);
        if (lastTop === null || Math.abs(top - lastTop) > fontSize * 0.5) {
          current = [];
          lines.push(current);
          lastTop = top;
        }
        current.push(para[i]);
      });
    }

    const widths = lines.map((line) => {
      const one = document.createElement('span');
      one.className = 'measure-line';
      appendTokens(one, line);
      meas.appendChild(one);
      return one.getBoundingClientRect().width;
    });
    meas.remove();
    const overflow = widths.some((w) => w > maxTextW + 0.5);
    return { lines, widths, overflow };
  }

  // Ritar raderna som staplade rundade rutor (som TikToks textverktyg) med mjuka inre hörn.
  function buildStack(stack, scale) {
    const fontSize = Number(stack.dataset.size) * scale;
    const padX = Math.round(fontSize * 0.36);
    // data-tight (opt-in): tätare rader där mycket text ska få plats i stor storlek
    const tight = stack.dataset.tight !== undefined;
    const padY = Math.round(fontSize * (tight ? 0.1 : 0.13));
    const lineH = Math.round(fontSize * (tight ? 1.1 : 1.18) + padY * 2);
    const { lines, widths, overflow } = measureLines(stack, fontSize, padX);
    const boxW = widths.map((w) => Math.ceil(w + padX * 2));
    const containerW = stack.parentElement.clientWidth;
    const color = getComputedStyle(stack).getPropertyValue('--box').trim();

    stack.innerHTML = '';
    stack.style.height = `${lines.length * lineH}px`;
    stack.style.fontSize = `${fontSize}px`;

    const boxes = boxW.map((w, i) => ({ w, left: (containerW - w) / 2, top: i * lineH, r: [RADIUS, RADIUS, RADIUS, RADIUS] }));
    const fillets = [];
    for (let i = 1; i < boxes.length; i++) {
      const a = boxes[i - 1];
      const b = boxes[i];
      const d = (b.w - a.w) / 2;
      if (Math.abs(d) < 2) {
        a.r[2] = a.r[3] = b.r[0] = b.r[1] = 0;
      } else if (d > 0) {
        const r = Math.min(RADIUS, d / 2);
        a.r[2] = a.r[3] = 0;
        b.r[0] = b.r[1] = r;
        fillets.push({ x: a.left - r, y: b.top - r, r, at: '0 0' }, { x: a.left + a.w, y: b.top - r, r, at: '100% 0' });
      } else {
        const r = Math.min(RADIUS, -d / 2);
        b.r[0] = b.r[1] = 0;
        a.r[2] = a.r[3] = r;
        fillets.push({ x: b.left - r, y: b.top, r, at: '0 100%' }, { x: b.left + b.w, y: b.top, r, at: '100% 100%' });
      }
    }

    for (const f of fillets) {
      const el = document.createElement('div');
      el.className = 'fillet';
      el.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.r}px;height:${f.r}px;
        background:radial-gradient(circle at ${f.at}, transparent ${f.r - 0.6}px, ${color} ${f.r}px)`;
      stack.appendChild(el);
    }
    boxes.forEach((b, i) => {
      const el = document.createElement('div');
      el.className = 'box txt';
      el.style.cssText = `left:${b.left}px;top:${b.top}px;width:${b.w}px;height:${lineH}px;
        border-radius:${b.r.map((r) => `${r}px`).join(' ')}`;
      // Ett inre span så att mellanslagen inte slukas av flex-layouten.
      const inner = document.createElement('span');
      appendTokens(inner, lines[i]);
      el.appendChild(inner);
      stack.appendChild(el);
    });
    return { overflow, lines: lines.length, paragraphs: stack.dataset.text.split('\n').length };
  }

  // ---- Krymp tills allt får plats i säkra zonen ----
  const stage = document.getElementById('stage');
  const stacks = [...document.querySelectorAll('.stack')];
  const scalables = [...document.querySelectorAll('[data-size-px]')];
  const tryScale = (scale) => {
    // data-fixed (opt-in): behåller sin storlek, t.ex. siffran så att den är lika stor på alla slides
    scalables.forEach((el) => { el.style.fontSize = `${Number(el.dataset.sizePx) * (el.dataset.fixed !== undefined ? 1 : scale)}px`; });
    const results = stacks.map((s) => buildStack(s, scale));
    const tooWide = scalables.some((el) => el.scrollWidth > stage.clientWidth + 0.5);
    const tooTall = stage.scrollHeight > stage.clientHeight + 0.5;
    const tooManyLines = results.some((r, i) => r.lines > Number(stacks[i].dataset.maxLines || 99));
    const fits = !results.some((r) => r.overflow) && !tooWide && !tooTall && !tooManyLines;
    // "Hel mening per rad": varje \n-stycke i flerradiga texter ryms på en rad.
    const unbroken = results.every((r) => r.paragraphs < 2 || r.lines === r.paragraphs);
    const lines = results.reduce((sum, r) => sum + r.lines, 0);
    return { fits, unbroken, lines };
  };
  // 1) Krymp högst 12 % om det låter varje mening stå på en egen rad. 2) Annars största storlek som får plats.
  let scale = 1;
  let found = false;
  // 0) data-max-scale (opt-in): korta texter får växa upp till max-skalan och fylla innehållsytan.
  //    Uppskalningen får aldrig ge fler rader än i normalstorlek.
  const maxScale = Number(stage.dataset.maxScale || 1);
  if (maxScale > 1) {
    const baseLines = tryScale(1).lines;
    for (let s = maxScale; s > 1.001 && !found; s -= 0.03) {
      const r = tryScale(s);
      if (r.fits && r.lines <= baseLines) { scale = s; found = true; }
    }
  }
  for (let s = 1; s >= 0.88 && !found; s -= 0.02) {
    const r = tryScale(s);
    if (r.fits && r.unbroken) { scale = s; found = true; }
  }
  if (!found) {
    for (scale = 1; scale >= 0.55; scale -= 0.03) if (tryScale(scale).fits) break;
  }
  qa.scale = Math.round(scale * 100) / 100;
  if (scale < 0.55) qa.issues.push('Texten får inte plats ens vid minsta storlek – korta texten');

  // ---- Taggar längs rankorna ----
  document.querySelectorAll('path[data-thorns]').forEach((path, n) => {
    const len = path.getTotalLength();
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let d = '';
    let side = 1;
    for (let s = 30, i = 0; s < len - 10; s += 34 + 14 * Math.abs(Math.sin(i * 12.9898 + n)), i++) {
      const p = path.getPointAtLength(s);
      const q = path.getPointAtLength(s + 1);
      const tx = q.x - p.x;
      const ty = q.y - p.y;
      const tl = Math.hypot(tx, ty) || 1;
      const [ux, uy] = [tx / tl, ty / tl];
      const [nx, ny] = [-uy * side, ux * side];
      const h = 12 + 8 * Math.abs(Math.sin(i * 7.31 + n));
      d += `M${p.x - ux * 6} ${p.y - uy * 6}L${p.x + nx * h + ux * 7} ${p.y + ny * h + uy * 7}L${p.x + ux * 6} ${p.y + uy * 6}Z`;
      side = -side;
    }
    g.setAttribute('d', d);
    g.setAttribute('fill', path.getAttribute('stroke'));
    g.setAttribute('fill-opacity', path.getAttribute('stroke-opacity'));
    path.after(g);
  });

  // ---- Kvalitetskontroll: all text inom säkra zonen ----
  const safeRect = { left: SAFE.left, top: SAFE.top, right: SAFE.width - SAFE.right, bottom: SAFE.height - SAFE.bottom };
  document.querySelectorAll('.txt').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return;
    const out = [];
    if (r.top < safeRect.top - 0.5) out.push(`topp (${Math.round(r.top)}px)`);
    if (r.bottom > safeRect.bottom + 0.5) out.push(`botten (${Math.round(r.bottom)}px)`);
    if (r.right > safeRect.right + 0.5) out.push(`höger (${Math.round(r.right)}px)`);
    if (r.left < safeRect.left - 0.5) out.push(`vänster (${Math.round(r.left)}px)`);
    if (out.length) qa.issues.push(`"${el.textContent.slice(0, 30)}" utanför säker zon: ${out.join(', ')}`);
    if (el.scrollWidth > el.clientWidth + 1) qa.issues.push(`"${el.textContent.slice(0, 30)}" klipps horisontellt`);
  });

  window.__qa = qa;
  window.__ready = true;
})().catch((err) => {
  window.__qa = { issues: [`Layoutfel: ${err.message}`] };
  window.__ready = true;
});
