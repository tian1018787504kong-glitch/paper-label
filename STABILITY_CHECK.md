# paper-label 稳定性检查记录

## 检查目标

确认打开一篇论文详情页后，不会因为扩展导致异常 CPU 或内存占用，尤其避免：

- content script 在所有网页加载；
- MutationObserver 被自身插入的节点反复触发；
- 标签节点重复追加；
- 悬浮框重复创建；
- 页面轻微变动导致高频重算。

## 已做的稳定性修复

### 1. 收窄 content script 注入范围

已移除 `https://*/*` 和 `http://*/*` 这类全站匹配。

现在扩展只在声明的学术站点上注入，例如：

- Google Scholar
- 百度学术
- CNKI
- PubMed
- ScienceDirect
- Springer / Nature
- Wiley
- IEEE
- ACM
- Science
- PNAS
- JSTOR
- Emerald
- SAGE
- ASM Journals

这可以避免用户打开普通网页时也加载 paper-label content script。

### 2. 避免自身 DOM 变化触发重复渲染

MutationObserver 会忽略 `.scholartag-inline-root` 内部变化，避免扩展自己插入标签后又触发自己重算。

### 3. 普通重渲染节流

页面广告、推荐文章、异步模块加载时可能持续触发 DOM 变化。

现在普通重渲染至少间隔约 900ms；设置变化、导入数据变化等主动刷新仍会立即重算。

### 4. 悬浮框唯一

每次注入悬浮框前会删除旧的 `#scholartag-floating-actions`，页面中最多保留一个悬浮操作框。

### 5. 标签节点唯一

每条文献使用稳定的 `entryId`，已渲染的条目不会重复追加；强制刷新时会先清理旧的 `.scholartag-inline-root`。

## 单篇论文抽查方法

建议用一篇详情页做抽查，例如：

- Nature detail page
- PNAS detail page
- ScienceDirect detail page
- CNKI detail page

打开页面后等待 2 分钟，执行：

```js
document.querySelectorAll(".scholartag-inline-root").length
document.querySelectorAll("#scholartag-floating-actions").length
```

验收标准：

- `.scholartag-inline-root` 数量稳定，不随时间持续增长。
- `#scholartag-floating-actions` 数量必须是 `0` 或 `1`，不能超过 `1`。
- 页面滚动、拖动悬浮框、点击收藏后，不应出现新的重复悬浮框。
- Chrome 任务管理器中该标签页 CPU 不应长期异常高占用。
- Chrome 任务管理器中该标签页内存不应持续线性增长。

## 本次自动检查结果

已通过：

- `npm run typecheck --workspace @paper-label/extension`
- `npm run test --workspace @paper-label/extension`
- `npm run build:chromium --workspace @paper-label/extension`
- `npm run build:firefox --workspace @paper-label/extension`
- 开源导出包独立 `typecheck / test / build`

自动测试已加入：

- 搜索页期刊来源解析测试。
- 禁止 content script 回退到 `https://*/*` / `http://*/*` 全站匹配的防回归测试。
