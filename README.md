# paper-label

> A local-first browser extension for showing journal labels on scholarly pages and managing a personal paper library.
>
> 一个本地优先的学术浏览器扩展：在论文网页显示期刊标签，并管理自己的文献库。

[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](LICENSE)
[![Latest release](https://img.shields.io/github/v/release/tian1018787504kong-glitch/paper-label?display_name=tag)](https://github.com/tian1018787504kong-glitch/paper-label/releases)
[![Build status](https://img.shields.io/github/actions/workflow/status/tian1018787504kong-glitch/paper-label/ci.yml?label=checks)](https://github.com/tian1018787504kong-glitch/paper-label/actions)

## 这是什么？ / What is it?

paper-label 是一个浏览器扩展，用来帮助研究者在阅读论文时快速看到自己关心的期刊分级，并把论文信息保存到本地文献库。

它采用“本地优先”设计：基础版不要求注册、不依赖服务器，评级数据和文献记录默认保存在浏览器本地。你可以导入自己的评级数据集，也可以随时导出全部数据。

paper-label is a browser extension for researchers who want journal labels next to scholarly articles and a lightweight local paper library. The open-source foundation works without an account or server. Ranking datasets and library records stay in the browser unless you explicitly export them.

## 适合谁？ / Who is it for?

- 需要在 Google Scholar、知网和出版社论文页快速查看期刊标签的人。
- 需要按文件夹、标签和备注管理论文信息的人。
- 希望自己控制评级数据来源，而不是依赖内置或不可核验数据的人。
- 想在本地运行、审查代码并参与适配新网站的开发者。

## 当前功能 / Features

- 在学术搜索结果页和论文详情页显示多个期刊标签。
- 支持按 DOI、ISSN、期刊名和别名匹配。
- 支持本地导入、启用、排序和批量重算评级数据集。
- 支持标签颜色、大小和显示顺序调整。
- 本地文献库：收藏、取消收藏、搜索、分类、多个分类、普通标签、备注和详情编辑。
- 支持 JSON、CSV、BibTeX、RIS 导出。
- “查找全文”只提供合法的开放获取、出版社或机构入口跳转。
- 中英文界面：跟随系统语言，也可以手动切换。
- 悬浮操作按钮可拖拽，适配不同论文网站布局。

## 明确不包含 / Deliberate boundaries

这个仓库是纯开源基础版，暂不包含：

- 共享评级库、用户账号和云同步；
- 在线翻译、Zotero 双向同步、会员和支付；
- 服务器代下载或任何绕过出版社付费墙的功能；
- 未经授权打包发布的商业评级数据。

这些边界是有意保留的：用户可以自行选择、核验和维护评级数据，基础版也能离线使用。

## 三个浏览器构建包 / Browser packages

项目使用一套核心代码，生成三个技术构建目标：

| 构建包 | 主要浏览器 | 下载 |
| --- | --- | --- |
| Chromium MV3 | Chrome、Edge、Brave、Arc、Opera、Vivaldi 等 | [Chrome package](https://github.com/tian1018787504kong-glitch/paper-label/releases/latest) |
| Firefox WebExtension | Firefox | [Firefox package](https://github.com/tian1018787504kong-glitch/paper-label/releases/latest) |
| Safari Web Extension | Safari（需要 macOS/Xcode 转换和签名） | [Safari package](https://github.com/tian1018787504kong-glitch/paper-label/releases/latest) |

普通用户优先下载 GitHub Releases 中对应浏览器的 zip；开发者可以加载解压目录。

## 5 分钟安装 / Quick start

### 直接下载发布包

打开 [最新版本 Releases](https://github.com/tian1018787504kong-glitch/paper-label/releases/latest)，下载对应浏览器的 zip 并解压。

### Chrome / Edge / Brave / Arc / Opera

1. 打开浏览器扩展管理页（例如 Chrome 的 `chrome://extensions`）。
2. 开启“开发者模式 / Developer mode”。
3. 点击“加载已解压的扩展程序 / Load unpacked”。
4. 选择解压后的 `chrome-mv3` 目录。

### Firefox

打开 `about:debugging#/runtime/this-firefox`，选择“Load Temporary Add-on...”，再选择 `firefox-mv2/manifest.json`。

### Safari

Safari 需要在 macOS 上使用 Xcode 的 Safari Web Extension Converter 转换、签名并启用。详见 [安装手册](docs/INSTALLATION.md)。

更完整的首次使用流程（导入评级数据、设置语言、收藏论文和导出数据）见 [用户手册](docs/USER_GUIDE.md)。

## 从源码构建 / Build from source

要求：Node.js 20+、npm 10+。

```bash
git clone https://github.com/tian1018787504kong-glitch/paper-label.git
cd paper-label
npm install
npm run typecheck
npm test
npm run build:chromium --workspace @paper-label/extension
```

常用打包命令：

```bash
npm run zip:chromium --workspace @paper-label/extension
npm run zip:firefox --workspace @paper-label/extension
npm run zip:safari --workspace @paper-label/extension
```

开发和测试说明见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## 评级数据怎么来？ / Ranking datasets

扩展不内置期刊评级数据。请在“期刊标签数据管理”页面导入自己有权使用的 JSON 数据集。这样可以避免把未经授权、过时或无法核验的数据伪装成软件默认结论。

最小格式示例和字段说明见 [docs/DATASET_FORMAT.md](docs/DATASET_FORMAT.md)。导入后可选择启用哪些数据集、哪些标签显示以及显示顺序；一篇论文匹配多个体系时会同时显示多个标签。

The extension does not ship ranking data. Import a JSON dataset that you are allowed to use, then choose which datasets and labels should be visible. See [docs/DATASET_FORMAT.md](docs/DATASET_FORMAT.md).

## 隐私与安全 / Privacy and safety

- 基础版默认只写入浏览器本地存储。
- 不要求账号、API key 或云端登录。
- 翻译、共享库、同步等服务端能力不在本仓库中。
- 全文功能只负责查找合法入口，不代替用户登录学校或出版社，也不绕过访问控制。

详见 [SECURITY.md](SECURITY.md) 和 [安全说明](docs/PRIVACY.md)。

## 项目结构 / Project structure

```text
apps/extension/       浏览器扩展、页面适配和 UI
packages/contracts/   跨模块共享的数据类型和接口
docs/                 安装、开发、数据格式和发布文档
examples/             可导入的数据集示例
```

站点适配、评级引擎、本地文献库和全文跳转保持模块化。新增网站通常只需要增加或调整对应 adapter，不需要重写整个扩展。

## 参与贡献 / Contributing

欢迎提交网站适配、解析器测试、可访问性改进、文档和数据格式建议。提交前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 与 [行为准则](CODE_OF_CONDUCT.md)。

建议先运行：

```bash
npm run typecheck
npm test
npm run build
```

新增网站适配时，请优先使用页面的 DOI、`citation_*`、Dublin Core、JSON-LD 等结构化元数据，并把选择器限制在站点适配模块内。

## 路线图 / Roadmap

当前重点是继续完善主流学术网站适配、元数据准确性、解析器自动化测试、键盘可访问性和导入导出兼容性。共享评级库、账号、同步、翻译、Zotero 和付费能力属于独立的后续产品边界，不会混入这个基础开源仓库。

## 许可证 / License

paper-label 基础版以 [MPL-2.0](LICENSE) 发布。第三方数据集、网站内容和出版社服务仍受其各自许可证、服务条款和访问权限约束。

如果这个项目对你有帮助，欢迎在 GitHub 点 Star、提交 Issue，或贡献一个可复现的网站适配测试。
