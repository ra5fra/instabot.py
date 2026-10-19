# English carousels – black marble / rose gold

TikTok photo-mode carousels (1080×1920 PNG) in an English theme that matches the cover of
*Owed to the Heir*: black marble with rose gold veins, serif capitals for numbers and headings,
and TikTok-style text boxes. Fully separate from the Swedish template in the parent folder.

## Setup (once)

```bash
cd boksaradark-carousel/english
npm install                     # Playwright + fonts into ./assets/fonts
npx playwright install chromium # only if Chromium is not already installed
```

## Make the next carousel

1. Create `carousels/<name>.json` (copy `owed-heir-arrested.json`).
2. Put any images (book covers) in `assets/`.
3. Run:

   ```bash
   npm run render <name>
   ```

4. Slides land in `output/<name>/01.png, 02.png …` plus `preview.png` (contact sheet).
   Add `-- --guides` to also get copies with the TikTok safe zones drawn in `output/<name>/guides/`.

## JSON schema

```jsonc
{
  "seed": "optional",   // change for a different marble pattern (default: the file name)
  "slides": [
    // Hook / CTA: big text + small text underneath
    {
      "type": "hook",                 // "hook" (small box in rose gold) or "cta" (small box in white)
      "text": "Big text 🚨",          // required
      "subtext": "#1 is the worst\nswipe →", // optional
      "subtextStyle": "rose",         // optional: "rose" or "light"
      "textSize": 100, "subtextSize": 70     // optional, px
    },
    // Countdown: number, the action, IRL (dark box, rose gold edge), In the book (rose gold, largest)
    {
      "type": "countdown",
      "rank": "#5",
      "text": "He knows what you search for at 3 a.m.",
      "irl": "🚨 Change your passwords",
      "book": "😍 He’s just attentive",
      "irlLabel": "IRL:", "bookLabel": "In the book:",            // optional labels
      "textSize": 86, "irlSize": 66, "bookSize": 100, "rankSize": 180 // optional
    },
    // Cover: heading, the tilted book cover, title box, small line
    {
      "type": "cover",
      "image": "assets/cover.jpg",     // path relative to this folder
      "above": "Meet Jae Ryu.",        // serif capitals with rose gold glow
      "below": "Owed to the Heir\nNora Blackthorn", // white box
      "small": "Dark Korean mafia romance\n18+ · Link in bio 🖤", // rose gold box
      "coverSize": 86                  // optional: cover height (in units of 8.4 × this value px)
    }
  ]
}
```

Text rules:

- `\n` forces a new line. One sentence per line reads best.
- `*word*` = rose accent text. Use sparingly.
- Short words (1–2 letters) stay with the next word, emojis and arrows never start a line,
  and long hyphenated words only split at the hyphen when they do not fit.
- Text that does not fit shrinks automatically. Short texts on countdown and cover slides grow
  (up to 130 %) to fill the space. If something still does not fit, the command prints a ⚠ warning.

## Safe zones

No text in the top 260 px, the bottom 480 px or the right 150 px (TikTok's UI). Every render checks
this automatically.

## Files

| Path | Contents |
|---|---|
| `carousels/*.json` | carousel content |
| `src/render.mjs` | the command: JSON → PNG + contact sheet |
| `src/template.mjs` | HTML/CSS for the layouts (hook, countdown, cover) |
| `src/marble.mjs` | procedural black marble background |
| `src/config.mjs` | format, safe zones and the rose gold palette (sampled from the cover) |
| `src/layout.js` | line-by-line text boxes, auto sizing, safe-zone check |
| `assets/` | cover image and fonts (Cinzel, TikTok Sans, Noto Color Emoji) |
