# 安装说明

## 从源码安装

```bash
npm install
npm run build
```

## Chrome / Edge / Brave / Arc / Opera

```bash
npm run build:chromium --workspace @paper-label/extension
```

打开浏览器扩展管理页（Chrome 是 `chrome://extensions`），开启“开发者模式”，点击“加载已解压的扩展程序”，选择：

```text
apps/extension/.output/chrome-mv3
```

普通用户也可以从 [GitHub 最新版本](https://github.com/tian1018787504kong-glitch/paper-label/releases/latest) 下载 Chromium zip，解压后加载其中的 `chrome-mv3` 目录。

## Firefox

```bash
npm run build:firefox --workspace @paper-label/extension
```

打开 `about:debugging#/runtime/this-firefox`，点击“Load Temporary Add-on...”，选择：

```text
apps/extension/.output/firefox-mv2/manifest.json
```

## Safari

Safari 需要在 macOS 中转换：

```bash
npm run build:chromium --workspace @paper-label/extension
xcrun safari-web-extension-converter apps/extension/.output/chrome-mv3
```

然后在 Xcode 中打开生成的项目，完成签名、运行和 Safari 扩展启用。Release 中的 Safari zip 用于 WebKit 转换和测试，不是已经签名的 App Store 安装包。

## 界面语言

默认是“跟随系统”。扩展会优先读取浏览器 UI 语言，再回退到网页运行环境语言。也可以在设置页手动选择中文或英文。

英文版：[Installation](INSTALLATION.en.md)。

