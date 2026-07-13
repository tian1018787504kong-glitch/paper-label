# Installation

## Install from source

```bash
npm install
npm run build
```

## Chrome / Edge / Brave / Arc / Opera

```bash
npm run build:chromium --workspace @paper-label/extension
```

Open the browser extension page (`chrome://extensions` for Chrome), enable Developer mode, choose **Load unpacked**, and select:

```text
apps/extension/.output/chrome-mv3
```

For a released build, download the Chromium zip from the [latest GitHub release](https://github.com/tian1018787504kong-glitch/paper-label/releases/latest), unzip it, and load the extracted `chrome-mv3` directory.

## Firefox

```bash
npm run build:firefox --workspace @paper-label/extension
```

Open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on...**, and select:

```text
apps/extension/.output/firefox-mv2/manifest.json
```

## Safari

Safari requires conversion on macOS:

```bash
npm run build:chromium --workspace @paper-label/extension
xcrun safari-web-extension-converter apps/extension/.output/chrome-mv3
```

Open the generated Xcode project, configure signing, run it, and enable the extension in Safari. The Safari zip in Releases is a WebKit build for conversion and testing; it is not a signed App Store package.

## Interface language

The default is **Follow system**. paper-label reads the browser UI language first, then falls back to the web runtime language. You can select Chinese or English manually in the settings page.

For first-use instructions, see [USER_GUIDE.en.md](USER_GUIDE.en.md). Chinese users can read [安装说明](INSTALLATION.md).

