# Installation

## Install from source

```bash
npm install
npm run build
```

## Chrome / Edge / Brave / Arc

```bash
npm run build:chromium --workspace @paper-label/extension
```

Open the extension page:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Brave: `brave://extensions`

Enable developer mode, choose “Load unpacked”, and select:

```text
apps/extension/.output/chrome-mv3
```

## Firefox

```bash
npm run build:firefox --workspace @paper-label/extension
```

Open:

```text
about:debugging#/runtime/this-firefox
```

Choose “Load Temporary Add-on...” and select:

```text
apps/extension/.output/firefox-mv2/manifest.json
```

## Safari

Safari requires conversion on macOS:

```bash
npm run build:chromium --workspace @paper-label/extension
xcrun safari-web-extension-converter apps/extension/.output/chrome-mv3
```

Then open the generated Xcode project, sign it, run it, and enable the extension in Safari.

