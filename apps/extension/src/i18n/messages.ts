export type AppLanguage = "auto" | "zh-CN" | "en-US";
export type ResolvedLanguage = "zh-CN" | "en-US";

export const languageOptions: Array<{ value: AppLanguage; label: string }> = [
  { value: "auto", label: "跟随系统 / Follow system" },
  { value: "zh-CN", label: "中文" },
  { value: "en-US", label: "English" }
];

const zhCN = {
  loading: "加载中...",
  appSubtitle: "本地管理文献、维护期刊标签数据，并在学术网站显示期刊标签；基础功能无需登录或服务器。",
  openCoreTitle: "开源基础版控制台",
  openCoreShortTitle: "纯开源基础版",
  openCoreSummary: "当前只包含本地文献库、期刊标签展示、期刊标签数据管理和合法全文跳转。",
  language: "界面语言",
  localLibrary: "本地文献库",
  datasetManagement: "期刊标签数据管理",
  defaultFullTextSearch: "默认全文搜索站点",
  autoChineseEnglishSearch: "自动：中文知网 / 英文 Google",
  badgeSize: "标签大小",
  current: "当前",
  openLocalLibrary: "打开本地文献库",
  openDatasetManagement: "打开期刊标签数据管理",
  localDocuments: "本地文献",
  enabledDatasets: "启用中的期刊标签数据集",
  visibleSystems: "页面显示中的体系",
  searchPlaceholder: "搜索标题、期刊、DOI、标签",
  recentlyUpdated: "最近更新",
  year: "年份",
  title: "标题",
  literatureCategory: "文献分类",
  allTags: "全部标签",
  allJournalLabels: "全部期刊标签",
  export: "导出",
  documentTotal: "文献总数",
  withJournalLabels: "有期刊标签",
  pendingRecognition: "待补识别",
  journalLabels: "期刊标签",
  literatureManagement: "文献管理",
  libraryHelp: "分类、批量操作和多选都在这里处理",
  selectedCount: "已选 {count} 篇",
  allDocuments: "全部文献",
  newFolderPlaceholder: "输入新文件夹名称",
  renameFolderPlaceholder: "输入新名称或新增文件夹",
  add: "新增",
  rename: "更名",
  delete: "删除",
  cannotDeleteDefaultFolder: "默认分类不能删除",
  deleteSelectedFolder: "删除选中文件夹",
  multiSelectHint: "Shift 连选，⌘/Ctrl 多选",
  selectCurrentList: "选择当前列表",
  unselectCurrentList: "取消当前列表",
  clear: "清空",
  addToFolder: "加入到分类...",
  recomputeLabels: "重算标签",
  cancelSaved: "取消收藏",
  noLocalDocuments: "还没有本地文献。",
  select: "选择",
  updated: "更新",
  unmatchedJournalLabels: "未匹配期刊标签",
  labelCount: "{count} 个期刊标签",
  close: "关闭",
  findFullText: "查找全文",
  downloadFullText: "下载全文",
  saveDocument: "收藏文献",
  savedClickToCancel: "已收藏，点击可取消",
  saveToLibrary: "收藏到 paper-label 文献库",
  opened: "已打开",
  fullTextOpened: "已打开全文查找入口",
  downloadOpened: "已打开全文下载入口",
  diagnostics: "诊断",
  diagnosticsTitle: "paper-label 页面诊断",
  diagnosticsTooltip: "查看本页识别与期刊标签命中信息",
  diagnosticsHint: "这个面板只在隐藏测试模式开启时出现，用来判断原站页面是元数据没抽到，还是期刊标签数据没有命中。",
  site: "站点",
  matchMode: "匹配模式",
  strictSourceMode: "搜索页严格来源匹配",
  detailMode: "详情页完整匹配",
  entryId: "入口 ID",
  journalSource: "期刊/来源",
  unidentified: "未识别",
  candidateJournals: "候选期刊名",
  noCandidates: "无",
  matchedLabels: "命中标签",
  noMatch: "未命中"
} as const;

const enUS: Record<keyof typeof zhCN, string> = {
  loading: "Loading...",
  appSubtitle: "Manage local papers, maintain journal label datasets, and show labels on scholarly websites. Core features do not require login or a server.",
  openCoreTitle: "Open-source core console",
  openCoreShortTitle: "Open-source core",
  openCoreSummary: "Includes only local library, journal label display, dataset management, and lawful full-text navigation.",
  language: "Interface language",
  localLibrary: "Local Library",
  datasetManagement: "Journal Label Datasets",
  defaultFullTextSearch: "Default full-text search site",
  autoChineseEnglishSearch: "Auto: CNKI for Chinese / Google for English",
  badgeSize: "Badge size",
  current: "Current",
  openLocalLibrary: "Open local library",
  openDatasetManagement: "Open dataset management",
  localDocuments: "Local papers",
  enabledDatasets: "Enabled journal label datasets",
  visibleSystems: "Visible label systems",
  searchPlaceholder: "Search title, journal, DOI, tag",
  recentlyUpdated: "Recently updated",
  year: "Year",
  title: "Title",
  literatureCategory: "Category",
  allTags: "All tags",
  allJournalLabels: "All journal labels",
  export: "Export",
  documentTotal: "Total papers",
  withJournalLabels: "With labels",
  pendingRecognition: "Needs review",
  journalLabels: "Journal labels",
  literatureManagement: "Library management",
  libraryHelp: "Manage categories, batch actions, and multi-select here",
  selectedCount: "{count} selected",
  allDocuments: "All papers",
  newFolderPlaceholder: "Enter a new folder name",
  renameFolderPlaceholder: "Enter a new name or folder",
  add: "Add",
  rename: "Rename",
  delete: "Delete",
  cannotDeleteDefaultFolder: "The default category cannot be deleted",
  deleteSelectedFolder: "Delete selected folder",
  multiSelectHint: "Shift for range, ⌘/Ctrl for multi-select",
  selectCurrentList: "Select current list",
  unselectCurrentList: "Unselect current list",
  clear: "Clear",
  addToFolder: "Add to category...",
  recomputeLabels: "Recompute labels",
  cancelSaved: "Unsave",
  noLocalDocuments: "No local papers yet.",
  select: "Select",
  updated: "Updated",
  unmatchedJournalLabels: "No matched journal labels",
  labelCount: "{count} journal labels",
  close: "Close",
  findFullText: "Find full text",
  downloadFullText: "Download full text",
  saveDocument: "Save paper",
  savedClickToCancel: "Saved. Click to unsave.",
  saveToLibrary: "Save to paper-label library",
  opened: "Opened",
  fullTextOpened: "Opened full-text search",
  downloadOpened: "Opened full-text download entry",
  diagnostics: "Diagnostics",
  diagnosticsTitle: "paper-label page diagnostics",
  diagnosticsTooltip: "View page recognition and journal-label matching",
  diagnosticsHint: "This panel appears only when hidden test mode is enabled. It helps distinguish metadata extraction failures from unmatched journal-label data.",
  site: "Site",
  matchMode: "Match mode",
  strictSourceMode: "Strict search-result source match",
  detailMode: "Article detail full match",
  entryId: "Entry ID",
  journalSource: "Journal / source",
  unidentified: "Unidentified",
  candidateJournals: "Candidate journals",
  noCandidates: "None",
  matchedLabels: "Matched labels",
  noMatch: "No match"
};

const dictionaries = {
  "zh-CN": zhCN,
  "en-US": enUS
};

export type MessageKey = keyof typeof zhCN;

type ChromeI18nGlobal = {
  chrome?: {
    i18n?: {
      getUILanguage?: () => string;
    };
  };
};

function getChromeUiLanguage(): string | undefined {
  return (globalThis as typeof globalThis & ChromeI18nGlobal).chrome?.i18n?.getUILanguage?.();
}

function getSystemLanguageCandidates(): string[] {
  const candidates: string[] = [];

  // In an extension page Chrome's UI locale is the most reliable signal. It
  // may differ from navigator.language when macOS has retained an older
  // preferred language in the browser profile.
  const chromeLanguage = getChromeUiLanguage();
  if (chromeLanguage) {
    candidates.push(chromeLanguage);
  }

  if (typeof navigator !== "undefined") {
    candidates.push(...Array.from(navigator.languages ?? []));
    if (navigator.language) {
      candidates.push(navigator.language);
    }
  }

  return candidates;
}

export type LanguageDiagnostics = {
  chromeUiLanguage: string;
  navigatorLanguage: string;
  navigatorLanguages: string[];
  resolvedLanguage: ResolvedLanguage;
};

export function getLanguageDiagnostics(language: AppLanguage | undefined): LanguageDiagnostics {
  const chromeUiLanguage = getChromeUiLanguage() ?? "unavailable";
  const navigatorLanguage = typeof navigator === "undefined" ? "unavailable" : navigator.language || "unavailable";
  const navigatorLanguages = typeof navigator === "undefined" ? [] : Array.from(navigator.languages ?? []);
  return {
    chromeUiLanguage,
    navigatorLanguage,
    navigatorLanguages,
    resolvedLanguage: resolveLanguage(language)
  };
}

export function resolveLanguage(language: AppLanguage | undefined, languageCandidates = getSystemLanguageCandidates()): ResolvedLanguage {
  if (language === "zh-CN" || language === "en-US") {
    return language;
  }
  const primaryLanguage = languageCandidates.find((candidate) => candidate.trim().length > 0)?.toLowerCase() ?? "";
  if (primaryLanguage.startsWith("zh")) {
    return "zh-CN";
  }
  return "en-US";
}

export function createTranslator(language: AppLanguage | undefined) {
  const resolvedLanguage = resolveLanguage(language);
  const dictionary = dictionaries[resolvedLanguage];
  return {
    language: resolvedLanguage,
    t(key: MessageKey, params?: Record<string, string | number>) {
      let value = dictionary[key] ?? zhCN[key] ?? key;
      if (params) {
        for (const [paramKey, paramValue] of Object.entries(params)) {
          value = value.replaceAll(`{${paramKey}}`, String(paramValue));
        }
      }
      return value;
    }
  };
}
