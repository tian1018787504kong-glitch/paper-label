# paper-label 开源基础版发布说明

## 中文说明

### 包含的功能

- 学术搜索页和论文详情页期刊标签显示。
- 多个本地期刊标签数据集同时匹配。
- 标签颜色、大小、显示顺序管理。
- 本地文献收藏、搜索、分类、标签、备注。
- JSON、CSV、BibTeX、RIS 导出。
- 合法全文搜索和 DOI 跳转。
- 全部基础数据仅保存在浏览器本地。

### 不包含的功能

- 共享评级库服务端及共享入口。
- 用户账号和云同步。
- 翻译、Zotero、会员、支付。
- 任何绕过付费墙的下载能力。

### 浏览器适配一共几类

严格按“技术打包类型”看，建议维护 3 类：

1. Chromium MV3
   - 覆盖 Chrome、Microsoft Edge、Brave、Opera、Arc、Vivaldi，以及多数国产双核/Chromium 浏览器。
   - 这是主版本，优先保证。

2. Firefox WebExtension
   - Firefox 需要单独构建和测试。
   - 当前脚本先使用 Firefox MV2 打包，兼容性通常更稳。

3. Safari Web Extension
   - Safari 不能直接使用普通 zip 上架。
   - 需要在 macOS 上用 Xcode / Safari Web Extension Converter 转成 Safari App Extension，再测试和签名。

所以不是每个浏览器写一套代码，而是：

- 一套核心代码。
- Chromium 一个包。
- Firefox 一个包。
- Safari 一个转换包。

### 本地安装：Chrome / Edge / Brave / Opera / Arc

```bash
npm install
npm run build --workspace @scholartag/contracts
npm run build:chromium --workspace @scholartag/extension
```

然后打开浏览器扩展管理页：

- Chrome：`chrome://extensions`
- Edge：`edge://extensions`
- Brave：`brave://extensions`
- Opera：`opera://extensions`
- Arc：打开 Chrome 扩展管理页

安装步骤：

1. 开启“开发者模式”。
2. 点击“加载已解压的扩展程序”。
3. 选择 `apps/extension/.output/chrome-mv3`。

### 本地安装：Firefox

```bash
npm install
npm run build:firefox --workspace @scholartag/extension
```

然后打开 `about:debugging#/runtime/this-firefox`：

1. 点击 “Load Temporary Add-on...”。
2. 选择 `apps/extension/.output/firefox-mv2/manifest.json`。

### Safari 适配路线

Safari 需要在 macOS 上转换：

```bash
npm run build:chromium --workspace @scholartag/extension
xcrun safari-web-extension-converter apps/extension/.output/chrome-mv3
```

转换后需要在 Xcode 中运行、签名和测试。Safari 放到后续独立验收，不和 Chromium/Firefox 混在一起。

### 打包命令

```bash
npm run zip:chromium --workspace @scholartag/extension
npm run zip:firefox --workspace @scholartag/extension
```

### 发布前验收

```bash
npm run typecheck
npm test
npm run build --workspace @scholartag/extension
npm run zip --workspace @scholartag/extension
```

评级数据不内置在扩展中。用户通过“期刊标签数据管理”导入自己的 JSON 数据集。

## English

### Included features

- Journal ranking badges on scholarly search result pages and article detail pages.
- Multiple local ranking datasets matched at the same time.
- Badge color, size, and display order management.
- Local literature library with search, folders, tags, and notes.
- Export to JSON, CSV, BibTeX, and RIS.
- Lawful full-text search and DOI navigation.
- All base-version data is stored locally in the browser.

### Not included

- Shared ranking dataset server or shared-dataset entry points.
- User accounts or cloud sync.
- Translation, Zotero integration, membership, or payments.
- Any feature designed to bypass paywalls.

### Browser build targets

From a technical packaging perspective, paper-label should maintain 3 browser targets:

1. Chromium MV3
   - Covers Chrome, Microsoft Edge, Brave, Opera, Arc, Vivaldi, and most Chromium-based browsers.
   - This is the primary target.

2. Firefox WebExtension
   - Firefox needs a separate build and test pass.
   - The current script builds Firefox as MV2 for better compatibility.

3. Safari Web Extension
   - Safari cannot be published directly from a normal extension zip.
   - It needs to be converted with Xcode / Safari Web Extension Converter, then signed and tested as a Safari extension.

In practice, this means:

- One shared codebase.
- One Chromium package.
- One Firefox package.
- One Safari-converted package.

### Local install: Chrome / Edge / Brave / Opera / Arc

```bash
npm install
npm run build --workspace @scholartag/contracts
npm run build:chromium --workspace @scholartag/extension
```

Open the browser extension page:

- Chrome: `chrome://extensions`
- Edge: `edge://extensions`
- Brave: `brave://extensions`
- Opera: `opera://extensions`
- Arc: open the Chrome extension management page

Then:

1. Enable Developer Mode.
2. Click “Load unpacked”.
3. Select `apps/extension/.output/chrome-mv3`.

### Local install: Firefox

```bash
npm install
npm run build:firefox --workspace @scholartag/extension
```

Open `about:debugging#/runtime/this-firefox`:

1. Click “Load Temporary Add-on...”.
2. Select `apps/extension/.output/firefox-mv2/manifest.json`.

### Safari adaptation path

Safari needs conversion on macOS:

```bash
npm run build:chromium --workspace @scholartag/extension
xcrun safari-web-extension-converter apps/extension/.output/chrome-mv3
```

After conversion, run, sign, and test the generated project in Xcode. Safari should be treated as a separate acceptance track.

### Packaging commands

```bash
npm run zip:chromium --workspace @scholartag/extension
npm run zip:firefox --workspace @scholartag/extension
```

### Release checks

```bash
npm run typecheck
npm test
npm run build --workspace @scholartag/extension
npm run zip --workspace @scholartag/extension
```

Ranking datasets are not bundled into the extension. Users import their own JSON datasets through the “Journal Badge Dataset Management” page.
