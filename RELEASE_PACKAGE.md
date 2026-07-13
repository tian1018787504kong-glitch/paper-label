# paper-label 0.1.0 测试包说明

## 这次生成了什么

本次生成 3 个浏览器内核版本：

| 内核 | 文件 | 适用浏览器 |
| --- | --- | --- |
| Chromium MV3 | `apps/extension/.output/paper-labelextension-0.1.0-chrome.zip` | Chrome、Edge、Brave、Arc、Opera、Vivaldi 等 |
| Firefox / Gecko | `apps/extension/.output/paper-labelextension-0.1.0-firefox.zip` | Firefox |
| Safari / WebKit | `apps/extension/.output/paper-labelextension-0.1.0-safari.zip` | Safari Web Extension 转换/测试 |

另有 Firefox 商店审核可能需要的源码包：

- `apps/extension/.output/paper-labelextension-0.1.0-sources.zip`

开发时也可以直接加载已解压目录：

- Chromium：`apps/extension/.output/chrome-mv3`
- Firefox：`apps/extension/.output/firefox-mv2/manifest.json`
- Safari：`apps/extension/.output/safari-mv3`

## 安装测试方式

### Chrome / Edge / Brave / Arc

1. 打开扩展管理页，例如 Chrome 是 `chrome://extensions`。
2. 打开“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择 `apps/extension/.output/chrome-mv3`。

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`。
2. 点击 “Load Temporary Add-on...”。
3. 选择 `apps/extension/.output/firefox-mv2/manifest.json`。

### Safari

Safari 后续正式发布需要走 Xcode / Safari Web Extension Converter、签名、公证和 App Store 或本地分发流程。当前 `paper-labelextension-0.1.0-safari.zip` 主要用于保留 WebKit 构建结果。

## 发布前已跑检查

```bash
npm run typecheck --workspace @paper-label/extension
npm run test --workspace @paper-label/extension
npm run build:chromium --workspace @paper-label/extension
npm run zip:chromium --workspace @paper-label/extension
npm run build:firefox --workspace @paper-label/extension
npm run zip:firefox --workspace @paper-label/extension
npm run build:safari --workspace @paper-label/extension
npm run zip:safari --workspace @paper-label/extension
```

## 语言显示

- 默认使用“跟随系统 / Follow system”。
- 自动语言优先读取 Chrome 扩展 API 返回的浏览器 UI 语言，再回退到网页运行环境语言。
- 用户也可以在设置页手动选择中文或英文。

## 当前开源基础版边界

包含：

- 期刊标签展示
- 本地导入期刊标签数据
- 本地文献收藏和管理
- 文献分类、普通标签、备注
- JSON / CSV / BibTeX / RIS 导出
- 合法全文搜索和下载入口跳转

不包含：

- 共享评级库服务端
- 用户账号
- 云同步
- 翻译
- Zotero 同步
- 会员和支付
- 绕过付费墙下载

## 下一步建议

1. 用 Chromium 包做主测试，因为 Chrome/Edge/Brave/Arc 都走这一套。
2. 选 10-20 篇真实文献做人工验收。
3. 稳定后再单独做 Firefox 和 Safari 兼容性收尾。
4. 之后再开始闭源共享评级库服务端。
