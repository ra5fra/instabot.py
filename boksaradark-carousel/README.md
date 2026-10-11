# @boksaradark – karusellgenerator

Gör TikTok-karuseller (fotoläge, 1080×1920 PNG) i kontots stil: dimmig svartvit granskog,
TikTok-textrutor, törn/rosor/fjärilar och mörkröd accent. Varje karusell är en JSON-fil.

## Kom igång (en gång)

```bash
cd boksaradark-carousel
npm install                     # hämtar Playwright + fonterna till ./fonts
npx playwright install chromium # bara om Chromium inte redan finns på datorn
```

## Skapa nästa karusell

1. Skapa `carousels/<namn>.json` (kopiera gärna `trope-horoskop-del-1.json`).
2. Kör:

   ```bash
   npm run render <namn>
   ```

3. Bilderna hamnar i `output/<namn>/01.png, 02.png …` plus `preview.png` (kontaktbild med alla slides).

Exempel: `npm run render trope-horoskop-del-2`

Vill du se de säkra zonerna inritade? `npm run render <namn> -- --guides` lägger extra bilder i `output/<namn>/guides/`.

## JSON-schema

```jsonc
{
  "seed": "valfritt",   // ändra för att få andra träd/ornament (standard: filnamnet)
  "slides": [
    // Hook / CTA / vanlig textslide
    {
      "type": "hook",          // "hook", "cta" eller "title" (samma layout)
      "text": "Stor text 🖤",   // obligatorisk
      "subtext": "Liten text", // valfri, liten ruta under
      "subtextStyle": "accent",// valfri: "accent" = mörkröd ruta, "light" = vit (hook: accent, annars light)
      "textSize": 86,          // valfri, px (krymps automatiskt om det inte får plats)
      "subtextSize": 46        // valfri, px
    },
    // Månadsslide
    {
      "type": "month",
      "month": "Juli",              // stort namn i serif
      "trope": "Morally grey hero", // liten röd rubrik
      "text": "Mening ett.\nMening två.", // textrutan
      "textSize": 68,               // valfri
      "titleSize": 190              // valfri, månadsnamnet
    }
  ]
}
```

Textregler:

- `\n` = ny rad. Skriv en mening per rad. Renderaren krymper texten lite om det gör att varje mening får plats på en egen rad, och bryter annars balanserat.
- Korta ord (1–2 bokstäver, t.ex. *i, på, en, är*) hålls automatiskt ihop med nästa ord så att en rad aldrig slutar på dem. Vill du hålla ihop fler ord själv: använd hårt mellanslag (`\u00a0`).
- `*ord*` = röd accenttext (använd sparsamt, t.ex. en punchline).
- Emojis och å/ä/ö fungerar som vanligt.
- Är texten för lång krymps den automatiskt. Får den ändå inte plats skriver kommandot en varning (⚠) och avslutas med felkod.

## Bakgrunder

- Lägg egna bilder (`.jpg`, `.png`, `.webp`) i `backgrounds/` så väljs en slumpvis per slide (samma bild två gånger i rad undviks). De görs svartvita och får en mörk overlay.
- Är mappen tom byggs skogen proceduralt (granar, dimma, filmkorn). Ändra `seed` för en ny variant.

## Säkra zoner

Ingen text hamnar i översta 260 px, nedersta 480 px eller högra 150 px (TikToks UI). Texten
centreras i ytan däremellan, och varje render kontrollerar automatiskt att all text ligger innanför.

## Filer

| Sökväg | Innehåll |
|---|---|
| `carousels/*.json` | innehållet i karusellerna |
| `src/render.mjs` | kommandot: JSON → PNG + kontaktbild |
| `src/template.mjs` | HTML/CSS för slidesen |
| `src/layout.js` | textrutor rad för rad, auto-storlek, kontroll av säkra zoner |
| `src/background.mjs` | procedurell skog / fotobakgrund |
| `src/ornaments.mjs` | törnrankor, ros, fjärilar (SVG) |
| `src/config.mjs` | format, säkra zoner, färger |
| `fonts/` | TikTok Sans, Montserrat (reserv), Cormorant Garamond, Noto Color Emoji |
