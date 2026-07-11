# Contributing to paper-label

Thanks for helping improve paper-label. This project is intentionally modular: most changes should touch one layer only.

## Development setup

```bash
npm install
npm run typecheck
npm test
npm run build
```

For local browser testing, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

## Common contribution areas

- Site adapters: improve metadata extraction for a publisher or search site.
- Ranking datasets: improve import validation and local dataset management.
- Library UI: improve local document management, folders, tags, and exports.
- Full-text search: add lawful search or resolver entry points.
- Documentation: improve setup, dataset examples, and troubleshooting.

## Rules for new site adapters

1. Prefer page metadata first: `citation_*`, Dublin Core, JSON-LD, DOI links.
2. Avoid using broad visible-text scraping when structured metadata exists.
3. Never add logic designed to bypass paywalls.
4. Add or update parser checks when possible.
5. Keep site-specific selectors inside the adapter layer.

## Pull request checklist

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] User-visible strings are clear in Chinese and English where relevant.
- [ ] No private datasets, credentials, or paid-service code are included.

