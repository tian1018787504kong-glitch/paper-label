# paper-label 发布前安全说明

## 中文

### 当前审计结论

`npm audit` 仍会报告若干依赖告警，但需要分开看：

1. 开源浏览器扩展运行时
   - 扩展生产包主要包含前端脚本、页面 UI、本地存储和站点注入逻辑。
   - 当前已声明 Firefox 数据采集权限为 `none`。
   - 已验证 Chromium / Firefox 构建和 zip 打包通过。

2. 扩展开发/打包工具链
   - `wxt` 依赖的 Firefox 本地运行工具链会触发 `web-ext-run`、`fx-runner`、`shell-quote`、`tmp` 等告警。
   - 这些依赖用于开发、测试、打包，不会作为扩展运行时代码注入学术网站。
   - 已把 `wxt` 升级到当前 patch 版本 `0.20.27`；剩余告警需要等待上游工具链继续修复，或未来评估替换 Firefox 打包路径。

3. 闭源/预留后端与网站
   - 主仓库中的 NestJS / Next.js 审计告警属于后端和网站模块。
   - 这些模块不进入开源基础版导出包。
   - 真正上线服务器前，需要对后端、网站、共享库服务单独做依赖升级和安全验收。

### 发布前必须执行

```bash
npm run typecheck
npm test
npm run build --workspace @paper-label/extension
npm run zip:chromium --workspace @paper-label/extension
npm run zip:firefox --workspace @paper-label/extension
npm run export:public -- --force
```

然后在导出的开源包中执行：

```bash
cd release/paper-label-open-source
npm run typecheck
npm test
npm run build
```

### 不应直接执行的操作

不要直接运行：

```bash
npm audit fix --force
```

原因是它可能把 WXT、NestJS、Next.js 等关键框架降级或跨大版本替换，导致扩展或后端不可用。

## English

### Current audit summary

`npm audit` still reports several dependency advisories. They should be interpreted separately:

1. Open-source browser extension runtime
   - The production extension bundle mainly contains frontend scripts, UI pages, local storage, and content-script injection logic.
   - Firefox data collection permission is explicitly declared as `none`.
   - Chromium and Firefox builds, including zip packaging, have been verified.

2. Extension development / packaging toolchain
   - `wxt` currently pulls Firefox local-run tooling that triggers advisories in `web-ext-run`, `fx-runner`, `shell-quote`, `tmp`, and related packages.
   - These dependencies are used for development, testing, and packaging. They are not injected into scholarly websites as runtime extension code.
   - `wxt` has been upgraded to the current patch version `0.20.27`. Remaining advisories need upstream fixes or a future evaluation of an alternative Firefox packaging path.

3. Closed-source / reserved backend and website modules
   - NestJS / Next.js audit advisories belong to backend and website modules in the private monorepo.
   - These modules are not included in the open-source base export.
   - Before deploying server-side modules, the backend, website, and shared ranking service need a separate dependency upgrade and security acceptance pass.

### Required release checks

```bash
npm run typecheck
npm test
npm run build --workspace @paper-label/extension
npm run zip:chromium --workspace @paper-label/extension
npm run zip:firefox --workspace @paper-label/extension
npm run export:public -- --force
```

Then run the following inside the exported open-source package:

```bash
cd release/paper-label-open-source
npm run typecheck
npm test
npm run build
```

### Do not run blindly

Do not blindly run:

```bash
npm audit fix --force
```

It may downgrade or cross-upgrade critical frameworks such as WXT, NestJS, and Next.js, breaking the extension or backend modules.
