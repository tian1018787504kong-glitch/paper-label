# Release Process

## Pre-release checks

```bash
npm install
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

## Build browser packages

```bash
npm run zip:chromium --workspace @paper-label/extension
npm run zip:firefox --workspace @paper-label/extension
npm run zip:safari --workspace @paper-label/extension
```

The 0.1.0 upload artifacts are:

- `apps/extension/.output/paper-labelextension-0.1.0-chrome.zip`
- `apps/extension/.output/paper-labelextension-0.1.0-firefox.zip`
- `apps/extension/.output/paper-labelextension-0.1.0-safari.zip`
- `apps/extension/.output/paper-labelextension-0.1.0-sources.zip`

Safari still requires Xcode conversion and manual signing before App Store distribution.

## Manual acceptance

Before publishing, test at least:

- Google Scholar search results.
- CNKI search results and detail pages.
- Major publisher detail pages.
- Local dataset import.
- Local library save, edit, search, folder, tag, and export.
- Badge visibility, color, and size settings.
- Interface language: follow browser/system language, manual Chinese, and manual English.
- CPU/memory behavior after opening multiple article pages.
