# Development

## Repository layout

```text
apps/extension/        Browser extension
packages/contracts/   Shared TypeScript types and schemas
docs/                 Project documentation
```

## Useful commands

```bash
npm install
npm run typecheck
npm test
npm run build
```

Browser-specific builds:

```bash
npm run build:chromium --workspace @paper-label/extension
npm run build:firefox --workspace @paper-label/extension
npm run build:safari --workspace @paper-label/extension
```

Zip packages:

```bash
npm run zip:chromium --workspace @paper-label/extension
npm run zip:firefox --workspace @paper-label/extension
npm run zip:safari --workspace @paper-label/extension
```

## Adapter development

Keep site-specific extraction logic inside the site adapter layer. Prefer structured metadata:

1. `meta[name="citation_title"]`
2. `meta[name="citation_journal_title"]`
3. `meta[name="citation_author"]`
4. `meta[name="citation_doi"]`
5. JSON-LD
6. DOI links

Only use visible DOM text as a fallback.

