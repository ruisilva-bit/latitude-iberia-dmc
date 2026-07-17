# Latitude Iberia DMC

A static, fictional 2026 website concept for a premium B2B destination management partner focused exclusively on Portugal and Spain.

## Stack

- Vite
- Vanilla HTML, CSS and JavaScript
- Playwright + axe automated QA
- Local WebP imagery; no runtime font or image CDN dependency

## Commands

```bash
npm install --cache /tmp/latitude-iberia-npm-cache
npm run build
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run qa
```

## Functional notes

- The destination studio, programme desk and operations interface are fully keyboard-operable.
- The brief builder validates required fields and can copy or download a local text brief.
- No form data is uploaded; copy and download are the two explicit local-only handoff actions.
- `robots` is set to `noindex,nofollow` and Vite uses `base: './'` for relative-path/GitHub Pages compatibility.

## Image sources

Images were downloaded from Unsplash's image CDN and stored locally as WebP files for this concept:

- `public/images/lisbon.webp` — Unsplash photo ID `photo-1513735492246-483525079686`
- `public/images/madrid.webp` — Unsplash photo ID `photo-1539037116277-4db20889f2d4`
- `public/images/porto.webp` — Unsplash photo ID `photo-1555881400-74d7acaacd8b`
- `public/images/barcelona.webp` — Unsplash photo ID `photo-1583422409516-2895a77efded`

Refer to the photo pages on Unsplash for contributor details and current licence terms.
