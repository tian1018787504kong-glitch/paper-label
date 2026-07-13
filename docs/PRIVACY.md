# 隐私说明 / Privacy note

English version: [PRIVACY.en.md](PRIVACY.en.md).

## 基础版处理什么数据？

paper-label 开源基础版默认在浏览器本地保存：

- 用户主动收藏的论文元数据；
- 本地导入的评级数据集；
- 文件夹、分类、普通标签和备注；
- 界面语言、标签颜色和尺寸等设置。

这些数据不会因为使用基础版而自动上传到 paper-label 服务器。本仓库不包含账号、云同步、翻译或共享评级库服务。

## 页面访问权限

扩展需要读取当前学术页面，用于识别标题、作者、DOI、期刊和结构化元数据，并在页面上放置标签和操作按钮。扩展不应读取与论文识别无关的密码、支付信息或表单内容。

## 全文入口

全文功能只生成或打开合法的检索入口。它不会绕过付费墙、破解访问控制或替用户下载受限内容。

## 数据控制

用户可以在文献库中删除记录，也可以通过导出功能备份数据。卸载扩展前请先导出需要保留的文献和评级数据。

## 报告安全问题

请不要在公开 Issue 中提交 Cookie、访问令牌、学校账号、受限论文内容或个人数据。安全问题请按 [SECURITY.md](../SECURITY.md) 中的方式报告。

## English summary

The open-source foundation is local-first. Library records, imported ranking datasets, and preferences stay in browser storage by default. The repository does not contain accounts, cloud sync, translation, shared ranking services, or paywall bypass features. Full-text actions only open lawful access points.
