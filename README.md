# Latitude Iberia DMC

Production-ready static concept site for a fictional premium B2B destination management company focused on Portugal and Spain.

## Stack
- Vite
- Vanilla HTML/CSS/JavaScript
- Playwright QA script

## Commands
```bash
npm install --cache .npm-cache
npm run build
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run qa
```

## Notes
- Built as a static concept only; `robots` is set to `noindex,nofollow`.
- The enquiry area does not submit data. It copies a structured brief to the clipboard.
- Vite is configured with `base: './'` for GitHub Pages project-site safety.
