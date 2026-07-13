# paper-label 0.1.0

这是 paper-label 的第一个公开开源基础版。

## 适合什么场景

paper-label 在学术搜索结果页和论文详情页显示用户自己导入的期刊标签，并提供一个无需账号、无需服务器的本地文献库。

## 已包含

- Chromium MV3、Firefox WebExtension 和 Safari Web Extension 三个构建目标；
- 多数据集、多标签匹配；
- 本地评级数据导入、启用、排序和批量重算；
- 本地文献收藏、分类、标签、备注和搜索；
- JSON、CSV、BibTeX、RIS 导出；
- 合法全文入口跳转；
- 中英文界面和跟随系统语言模式。

## 下载

- `paper-labelextension-0.1.0-chrome.zip`：Chrome、Edge、Brave、Arc、Opera、Vivaldi 等 Chromium 浏览器；
- `paper-labelextension-0.1.0-firefox.zip`：Firefox；
- `paper-labelextension-0.1.0-safari.zip`：Safari 转换和测试；
- `paper-labelextension-0.1.0-sources.zip`：Firefox 商店审核或源码归档。

普通用户下载对应 zip 后解压，再按照 [安装手册](../docs/INSTALLATION.md) 加载。开发者也可以从源码构建。

## 重要边界

评级数据不内置在扩展中，用户应只导入自己有权使用的数据。此版本不包含共享评级库、账号、云同步、翻译、Zotero、会员、支付或绕过付费墙的下载功能。

## 已验证

发布前已通过：

```text
npm run typecheck
npm test
npm run build
```

欢迎通过 GitHub Issue 报告可复现的问题，提交页面 URL、浏览器版本和步骤即可；不要提交 Cookie、账号、访问令牌或受限全文。

