# Security Policy

## Supported version

The current open-source baseline is `0.1.x`.

## Reporting vulnerabilities

Please do not publish exploit details in public issues. Report security concerns by opening a private security advisory on GitHub when available, or contact the maintainer through the repository owner profile.

## Security boundaries

paper-label:

- Stores base-version data locally in the browser.
- Does not include cloud sync, accounts, payments, translation, or Zotero integration in this open-source package.
- Does not include private ranking datasets.
- Does not implement paywall bypassing or unauthorized download automation.

## Before release

Run:

```bash
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

