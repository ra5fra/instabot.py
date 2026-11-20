# Velora – karusellgenerator för Instagram

Gör Instagram-karuseller (1080×1350 PNG, 4:5) i Veloras stil: krämvit bakgrund med mjuka
persika/violetta ljusfläckar, Fraunces-serif i rubrikerna, DM Sans i brödtexten och en mörkviolett
sista slide. Varje karusell är en JSON-fil.

## Kom igång (en gång)

```bash
cd velora-carousel
npm install                     # Playwright + fonterna (Fraunces, DM Sans, Noto Color Emoji)
npx playwright install chromium # bara om varken Playwright-Chromium eller Google Chrome finns
```

## Rendera

```bash
npm run render dag-01-overthinker-signs   # en karusell
npm run render all                        # alla i carousels/
npm run render all -- --guides            # + bilder med marginalerna inritade
```

Bilderna hamnar i `output/<namn>/01.png, 02.png …` plus `preview.png` (alla slides på en bild).

## JSON-schema

```jsonc
{
  "handle": "@velora.app",   // valfritt, kontonamnet i sidfoten
  "seed": "valfritt",        // ändra för att flytta ljusfläckarna i bakgrunden
  "slides": [
    // Första sliden. Sidfoten visar "swipe →".
    { "type": "hook", "kicker": "for the overthinkers", "text": "signs you're an *overthinker*", "sub": "valfri rad under" },

    // Vanlig punkt. "num" ger en stor siffra, "kicker" en liten rubrik, "body" en rad under.
    { "type": "point", "num": "01", "text": "you rehearse phone calls", "body": "valfri förklaring" },
    { "type": "point", "kicker": "small decision", "text": "give yourself 2 minutes, then pick" },

    // Sms-bubblor. "from": "me" = violett bubbla till höger, "meta" = liten rad under bubblan.
    { "type": "bubble", "messages": [{ "text": "ok." }], "caption": "the period. *the period.*" },
    { "type": "bubble", "messages": [{ "from": "me", "text": "did you get home ok?", "meta": "Seen 3:14 PM" }], "caption": "seen. *no reply.*" },

    // Byt ut: från → till. Standardetiketter "instead of" / "try".
    // "strike": false tar bort överstrykningen (t.ex. när "from" är en fråga någon annan ställer).
    { "type": "swap", "from": "\"sorry for the late reply\"", "to": "\"thanks for your patience\"" },
    { "type": "swap", "fromLabel": "they ask", "toLabel": "you say", "strike": false, "from": "…", "to": "…" },

    // Affirmationskort med Velora-namnet. "label" ändrar rubriken på kortet (standard "today's affirmation").
    { "type": "app", "text": "rad ovanför kortet", "affirmation": "Not every silence is about me.", "note": "rad under kortet" },

    // Sista sliden, mörkviolett. "actions" ändrar knapparna (standard save, send, follow).
    { "type": "cta", "text": "send this to the *friend who sends it*" }
  ]
}
```

Textregler:

- `*ord*` = accent i kursiv terrakotta (persika på den mörka sliden). Använd för en fras per slide.
- `\n` = ny rad.
- Raka citattecken och apostrofer blir automatiskt typografiska (“ ” ’).
- Texten radbryts balanserat och krymps automatiskt om den inte får plats. Varningar (⚠) skrivs ut om
  texten krymps under 70 %, om ett ensamt ord hamnar på sista raden i en rubrik eller om något hamnar
  utanför marginalerna.

## Marginaler

Ingen text inom 100 px från sidorna, 110 px från toppen eller 120 px från botten. Instagrams profilrutnät
beskär bilderna till 3:4, och telefoner rundar hörnen.

## Filer

| Sökväg | Innehåll |
|---|---|
| `carousels/*.json` | innehållet i karusellerna (dag-01 … dag-14 = tvåveckorsplanen) |
| `src/render.mjs` | kommandot: JSON → PNG + kontaktbild |
| `src/template.mjs` | HTML/CSS för slidesen |
| `src/layout.js` | automatisk textstorlek och kvalitetskontroll |
| `src/config.mjs` | format, marginaler, färger, kontonamn |

## Appskärmen (affirmation i appen)

Gör en bild av appens "Today's affirmation"-skärm med valfri text, i samma storlek som en
iPhone-skärmdump (1179×2556). Använd den i reels i stället för en skärminspelning.

```bash
npm run screen dag-01                                   # screens/dag-01.json
npm run screen all                                      # alla i screens/
npm run screen -- --text "My no is a full sentence." --body "Valfri förklaring." --out min-skarm
```

Bilden hamnar i `output/screens/<namn>.png`.

```jsonc
{
  "affirmation": "I release moments no one else remembers.", // obligatorisk, den stora raden
  "body": "Förklaringen ovanför",                              // valfri
  "category": "General Self-Worth",                            // valfri, texten i pillret
  "color": "#4C7AA5",                                          // valfri, kortets färg
  "step": 1, "steps": 3,                                       // valfritt, "Say it out loud — 1 of 3"
  "time": "9:41",                                              // valfritt, klockan i statusfältet
  "statusBar": true,                                           // valfritt, false döljer statusfältet
  "emojis": ["✨", "🌟", "💛", "🌈"]                            // valfritt, de fyra dekorationerna
}
```

På en Mac används systemfonten (SF Pro) och Apples emojis, så bilden blir som i appen.
