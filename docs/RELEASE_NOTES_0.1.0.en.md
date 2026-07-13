# paper-label 0.1.0

This is the first public open-source foundation release of paper-label.

## Included

- Chromium MV3, Firefox WebExtension, and Safari Web Extension build targets;
- multi-dataset and multi-badge matching;
- local dataset import, enable/disable, ordering, and batch recompute;
- local paper library with folders, tags, notes, search, and export;
- JSON, CSV, BibTeX, and RIS export;
- lawful full-text entry points;
- Chinese, English, and Follow system language modes.

## Downloads

- `paper-labelextension-0.1.0-chrome.zip` for Chromium browsers;
- `paper-labelextension-0.1.0-firefox.zip` for Firefox;
- `paper-labelextension-0.1.0-safari.zip` for Safari conversion and testing;
- `paper-labelextension-0.1.0-sources.zip` for source review or Firefox submission.

See the [installation guide](INSTALLATION.en.md) after downloading a package.

## Boundaries

Ranking data is not bundled. Import only data you are authorized to use. This release does not include shared ranking services, accounts, cloud sync, translation, Zotero, membership, payments, or paywall bypass features.

## Verification

```text
npm run typecheck
npm test
npm run build
```

Chinese version: [发布说明](RELEASE_NOTES_0.1.0.md).
