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
```

Safari requires Xcode conversion and manual signing.

## Manual acceptance

Before publishing, test at least:

- Google Scholar search results.
- CNKI search results and detail pages.
- Major publisher detail pages.
- Local dataset import.
- Local library save, edit, search, folder, tag, and export.
- Badge visibility, color, and size settings.
- CPU/memory behavior after opening multiple article pages.

