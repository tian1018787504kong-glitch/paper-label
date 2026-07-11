# paper-label 开源基础版验收清单

## 1. 安装与打包

- [ ] Chromium 包可以构建：`npm run build:chromium --workspace @scholartag/extension`
- [ ] Firefox 包可以构建：`npm run build:firefox --workspace @scholartag/extension`
- [ ] Chromium zip 可以生成：`npm run zip:chromium --workspace @scholartag/extension`
- [ ] Firefox zip 可以生成：`npm run zip:firefox --workspace @scholartag/extension`
- [ ] 开源导出包可以生成：`npm run export:public -- --force`
- [ ] 导出的开源包可以独立通过：

```bash
cd release/scholartag-open-source
npm run typecheck
npm test
npm run build
```

## 2. 期刊标签数据

- [ ] 扩展不内置正式评级数据。
- [ ] 用户可以导入本地 JSON 期刊标签数据集。
- [ ] 导入后页面显示数据集数量、启用数量、显示数量、期刊记录数量。
- [ ] 可以启用/停用数据集。
- [ ] 可以控制数据集是否在页面显示。
- [ ] 可以调整数据集显示顺序。
- [ ] 可以检查某个期刊是否被收录。
- [ ] 可以批量更新本地文献的期刊标签。
- [ ] 未命中的期刊不显示空框、占位框或假标签。

## 3. 标签显示

- [ ] 一篇文献同时命中多个体系时，显示多个标签。
- [ ] 不同标签自动区分颜色。
- [ ] 标签颜色可以自定义。
- [ ] 标签大小可以手动调节。
- [ ] 默认标签大小在 Google Scholar、知网、Nature、ScienceDirect 等页面不遮挡标题。
- [ ] 搜索结果页只在确认期刊来源命中时显示标签，不能仅因标题关键词命中而误显示。
- [ ] 详情页可以根据期刊名、DOI、ISSN、别名等信息匹配标签。

## 4. 学术站点识别

至少手动检查以下站点中的搜索页或详情页：

- [ ] Google Scholar
- [ ] 百度学术
- [ ] 知网 CNKI
- [ ] PubMed
- [ ] ScienceDirect
- [ ] Springer / Nature
- [ ] Wiley Online Library
- [ ] IEEE Xplore
- [ ] ACM Digital Library
- [ ] Science
- [ ] PNAS
- [ ] JSTOR
- [ ] Emerald
- [ ] SAGE Journals
- [ ] ASM Journals

验收标准：

- [ ] 适配站点能显示悬浮操作框。
- [ ] 能识别到标题。
- [ ] 能尽量识别期刊/来源。
- [ ] 能尽量识别作者、年份、DOI、URL。
- [ ] 如果网页元数据不足，允许字段为空，但不能乱填。
- [ ] 如果 Google Scholar 搜索页与原文详情页结果不同，以详情页期刊来源为准。

## 5. 文献收藏

- [ ] 点击“收藏文献”后，按钮变成“取消收藏”。
- [ ] 再次点击可以取消收藏。
- [ ] 收藏后本地文献库出现该文献。
- [ ] 本地文献库保存的是文献信息，不保存全文 PDF。
- [ ] 同一篇文献重复点击不会生成重复记录。
- [ ] 打开原文页面按钮可跳回原网页。
- [ ] 查找全文按钮只跳转合法入口。
- [ ] 下载全文按钮只跳转用户配置的合法下载入口，不由扩展绕过付费墙下载。

## 6. 本地文献库

- [ ] 可以搜索标题、期刊、DOI、标签。
- [ ] 可以按文献分类筛选。
- [ ] 可以新增、重命名、删除分类。
- [ ] 一篇文献可以属于多个分类。
- [ ] 可以给文献设置多个普通标签。
- [ ] 标签输入支持空格或回车成标签。
- [ ] 可以编辑标题、文献类型、作者、年份、期刊、DOI、URL、备注。
- [ ] 详情以弹窗或面板方式打开，不跳转离开列表页。
- [ ] 多选文献支持 Shift 连选、macOS Command 多选、Windows Ctrl 多选。
- [ ] 批量加入分类、批量重算期刊标签、批量取消收藏操作直观可见。

## 7. 导出

- [ ] JSON 导出可用。
- [ ] CSV 导出可用。
- [ ] BibTeX 导出可用。
- [ ] RIS 导出可用。
- [ ] 导出的内容不包含用户未保存的全文 PDF。

## 8. 诊断模式

- [ ] 默认关闭诊断模式。
- [ ] 只有在设置页明确开启后，论文页悬浮框才显示“诊断”按钮。
- [ ] 诊断面板能显示站点、标题、期刊、DOI、年份、候选期刊名和命中标签。
- [ ] 发布包默认不依赖诊断模式才能正常使用。

## 9. 稳定性与性能

打开任意一篇论文详情页，例如 Nature、ScienceDirect、CNKI、PNAS 中的一篇，停留 2 分钟：

- [ ] 页面只出现一个 paper-label 悬浮框。
- [ ] 同一条文献标题附近不会不断追加重复标签。
- [ ] `.scholartag-inline-root` 节点数量稳定，不随时间持续增长。
- [ ] `#scholartag-floating-actions` 最多只有一个。
- [ ] 页面滚动、拖动悬浮框、点击收藏后，CPU 不应长期维持异常高占用。
- [ ] Chrome 任务管理器中该标签页内存不应持续线性增长。
- [ ] 离开学术站点后，扩展不应在普通网页加载内容脚本。

可在页面控制台辅助检查：

```js
document.querySelectorAll(".scholartag-inline-root").length
document.querySelectorAll("#scholartag-floating-actions").length
```

刷新页面后再次检查，数量应保持稳定。

## 10. 开源边界

- [ ] 开源导出包不包含共享评级库服务端。
- [ ] 开源导出包不包含 API 后端。
- [ ] 开源导出包不包含官网/会员/支付页面。
- [ ] 开源导出包不包含云同步、Zotero、翻译、支付逻辑。
- [ ] 开源导出包只包含基础扩展、本地文献库、本地期刊标签数据管理和合法全文跳转。
