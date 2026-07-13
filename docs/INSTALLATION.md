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

For store or manual distribution, use:

```text
apps/extension/.output/paper-labelextension-0.1.0-chrome.zip
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

For review or manual distribution, use:

```text
apps/extension/.output/paper-labelextension-0.1.0-firefox.zip
apps/extension/.output/paper-labelextension-0.1.0-sources.zip
```

## Safari

Safari requires conversion on macOS:

```bash
npm run build:chromium --workspace @paper-label/extension
xcrun safari-web-extension-converter apps/extension/.output/chrome-mv3
```

Then open the generated Xcode project, sign it, run it, and enable the extension in Safari.

The current WebKit build artifact is:

```text
apps/extension/.output/paper-labelextension-0.1.0-safari.zip
```

## Interface language

The default language mode is “Follow system”. In that mode, paper-label reads the browser UI language first and falls back to the web runtime language if the browser API is unavailable. The settings page also supports manually selecting Chinese or English.
