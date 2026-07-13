import { useEffect, useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import browser from "webextension-polyfill";
import type { DatasetPreference, DocumentRecord, RankingDataset, SearchProvider } from "@paper-label/contracts";
import { RankingDatasetSchema } from "@paper-label/contracts";
import { getAvailableDatasets } from "../../src/dataset-sources";
import {
  exportDocumentsAsBibTeX,
  exportDocumentsAsCsv,
  exportDocumentsAsJson,
  exportDocumentsAsRis,
  libraryExportFields,
  type LibraryExportField
} from "../../src/library-export/exporters";
import { refetchDocumentMetadataFromUrl } from "../../src/library-metadata/refetch";
import { queryDocuments, type LibrarySortMode } from "../../src/library-query/search";
import { getBadgePaletteForBadge } from "../../src/ranking-badges/palette";
import { recomputeAllDocumentRankings, recomputeDocumentRanking } from "../../src/ranking-recompute/recompute";
import { createBadgeStyleOverrideKey, type BadgeStyleOverrides } from "../../src/ranking-badges/style";
import {
  deleteBadgeStyleOverride,
  deleteDocument,
  deleteLocalDataset,
  getBadgeStyleOverrides,
  getDatasetPreferences,
  getDocuments,
  getLocalDatasets,
  getSettings,
  moveDatasetPreference,
  replaceDocuments,
  saveLocalDataset,
  updateBadgeStyleOverride,
  updateDatasetPreference,
  updateDocument,
  updateSettings
} from "../../src/storage/local-store";
import { getDefaultFullTextProviders } from "../../src/fulltext-providers/defaults";
import { AUTO_FULLTEXT_PROVIDER_ID, resolveFullTextProvider } from "../../src/fulltext-providers/resolve";
import { buildFullTextProviderUrl } from "../../src/fulltext-url-builder/build";
import { createTranslator, languageOptions, type AppLanguage } from "../../src/i18n/messages";

type TabKey = "library" | "datasets";
type ExportScope = "visible" | "all" | "journal";

type DatasetImportReport = {
  totalRecords: number;
  duplicateTitles: number;
  emptyIssnRecords: number;
  emptyAliasRecords: number;
  labels: Array<{ label: string; count: number }>;
};

function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function splitListInput(value: string) {
  return value
    .split(/[\n,，;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTokenInput(value: string) {
  return value
    .split(/[\s,\n，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitAuthorInput(value: string) {
  const baseSegments = value
    .split(/[\n;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return baseSegments.flatMap((segment) => {
    const commaSegments = segment
      .split(/[,，]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const isSingleLastFirst =
      commaSegments.length === 2 &&
      /^[A-Za-zÀ-ÿ'’.-]+$/.test(commaSegments[0]) &&
      /^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,3}$/.test(commaSegments[1]);
    if (isSingleLastFirst) {
      return [`${commaSegments[1]} ${commaSegments[0]}`];
    }
    return commaSegments.length > 1 ? commaSegments : [segment];
  });
}

function splitLineInput(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatRelativeMeta(document: DocumentRecord) {
  const parts = [
    document.journal?.trim() || "未识别期刊",
    document.year ? String(document.year) : null,
    document.authors.length ? `${document.authors.slice(0, 2).join(", ")}${document.authors.length > 2 ? " 等" : ""}` : null
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getItemTypeLabel(itemType?: string | null) {
  switch (itemType) {
    case "conferencePaper":
      return "会议论文";
    case "bookSection":
      return "书籍章节";
    case "thesis":
      return "学位论文";
    case "preprint":
      return "预印本";
    case "journalArticle":
    default:
      return "期刊论文";
  }
}

function getFolderDisplayName(folderId: string, labels: Record<string, string>) {
  const customLabel = labels[folderId]?.trim();
  if (customLabel) {
    return customLabel;
  }

  if (folderId === "inbox") {
    return "默认收纳";
  }

  return folderId;
}

function readInitialTab(): TabKey {
  if (location.hash === "#datasets") return "datasets";
  return "library";
}

function parseImportedDatasets(raw: string): RankingDataset[] {
  const payload = JSON.parse(raw) as unknown;
  const candidates = Array.isArray(payload) ? payload : [payload];

  return candidates.map((candidate, index) => {
    const result = RankingDatasetSchema.safeParse(candidate);
    if (!result.success) {
      throw new Error(`第 ${index + 1} 个数据集格式不正确`);
    }
    return {
      ...result.data,
      sourceType: "local" as const
    };
  });
}

function buildDatasetImportReport(datasets: RankingDataset[]): DatasetImportReport {
  const titleCounts = new Map<string, number>();
  const labelCounts = new Map<string, number>();
  let totalRecords = 0;
  let emptyIssnRecords = 0;
  let emptyAliasRecords = 0;

  for (const dataset of datasets) {
    for (const record of dataset.records) {
      totalRecords += 1;
      const normalizedTitle = record.canonicalTitle.trim().toLocaleLowerCase();
      titleCounts.set(normalizedTitle, (titleCounts.get(normalizedTitle) ?? 0) + 1);
      labelCounts.set(record.rankingLabel, (labelCounts.get(record.rankingLabel) ?? 0) + 1);
      if (record.issn.length === 0) {
        emptyIssnRecords += 1;
      }
      if (record.aliases.length === 0) {
        emptyAliasRecords += 1;
      }
    }
  }

  return {
    totalRecords,
    duplicateTitles: Array.from(titleCounts.values()).filter((count) => count > 1).length,
    emptyIssnRecords,
    emptyAliasRecords,
    labels: Array.from(labelCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"))
  };
}

function makeBadgeSignature(document: DocumentRecord) {
  return document.rankingBadges
    .map((badge) => `${badge.datasetId}:${badge.recordId}:${badge.rankingLabel}`)
    .sort()
    .join("|");
}

function makeRankingSummary(documents: DocumentRecord[]) {
  return {
    matched: documents.filter((document) => document.rankingBadges.length > 0).length,
    badges: documents.reduce((sum, document) => sum + document.rankingBadges.length, 0)
  };
}

function sortDatasetsByPreference(datasets: RankingDataset[], preference: DatasetPreference | null) {
  return [...datasets].sort((left, right) => {
    const leftOrder = preference?.configs.find((item) => item.datasetId === left.id)?.order ?? 0;
    const rightOrder = preference?.configs.find((item) => item.datasetId === right.id)?.order ?? 0;
    return leftOrder - rightOrder;
  });
}

function createCustomProvider(name: string, template: string, existingProviders: SearchProvider[], idPrefix: string): SearchProvider {
  const trimmedName = name.trim();
  const trimmedTemplate = template.trim();
  if (!trimmedName) {
    throw new Error("先输入站点名称");
  }
  if (!trimmedTemplate.includes("{query}")) {
    throw new Error("搜索 URL 需要包含 {query}");
  }

  const marker = "__SCHOLARTAG_QUERY__";
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedTemplate.replace("{query}", marker));
  } catch {
    throw new Error("搜索 URL 格式不正确");
  }

  const providerUrl = `${parsedUrl.origin}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  const [baseUrl, templateSuffix = ""] = providerUrl.split(marker);
  const queryTemplate = `{query}${templateSuffix}`;
  const baseId = `${idPrefix}-${trimmedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "provider"}`;
  const existingIds = new Set(existingProviders.map((provider) => provider.id));
  let id = baseId;
  let suffix = 2;
  while (existingIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return {
    id,
    name: trimmedName,
    baseUrl,
    queryTemplate,
    allowedDomains: [parsedUrl.hostname],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  };
}

export function OptionsApp() {
  const [activeTab, setActiveTab] = useState<TabKey>(readInitialTab());
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("updatedAt");
  const [folderFilter, setFolderFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [rankingFilter, setRankingFilter] = useState("");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [lastSelectedDocumentId, setLastSelectedDocumentId] = useState("");
  const [bulkFolderId, setBulkFolderId] = useState("");
  const [exportScope, setExportScope] = useState<ExportScope>("visible");
  const [exportJournal, setExportJournal] = useState("");
  const [exportFields, setExportFields] = useState<LibraryExportField[]>(
    libraryExportFields.map((field) => field.id)
  );
  const [datasets, setDatasets] = useState<RankingDataset[]>([]);
  const [localDatasets, setLocalDatasets] = useState<RankingDataset[]>([]);
  const [preference, setPreference] = useState<DatasetPreference | null>(null);
  const [badgeStyleOverrides, setBadgeStyleOverrides] = useState<BadgeStyleOverrides>({});
  const [baseProviders] = useState<SearchProvider[]>(getDefaultFullTextProviders());
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getSettings>> | null>(null);
  const [message, setMessage] = useState("");
  const [datasetSearchKeyword, setDatasetSearchKeyword] = useState("");
  const [badgeColorSearch, setBadgeColorSearch] = useState("");
  const [expandedDatasetIds, setExpandedDatasetIds] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    datasets: RankingDataset[];
  } | null>(null);
  const [showLibraryDetailModal, setShowLibraryDetailModal] = useState(false);
  const [newFolderId, setNewFolderId] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [customProviderName, setCustomProviderName] = useState("");
  const [customProviderTemplate, setCustomProviderTemplate] = useState("");
  const [customDownloadProviderName, setCustomDownloadProviderName] = useState("");
  const [customDownloadProviderTemplate, setCustomDownloadProviderTemplate] = useState("");
  const isLocalDevelopmentExtension = useMemo(
    () => !(browser.runtime.getManifest() as { update_url?: string }).update_url,
    []
  );
  const showDiagnosticsControlsByUrl = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("debug") === "1" || searchParams.get("diagnostics") === "1";
  }, []);
  const showDiagnosticsControls = isLocalDevelopmentExtension || showDiagnosticsControlsByUrl;

  async function refreshAll() {
    const [nextDocuments, nextDatasets, nextLocalDatasets, nextPreference, nextBadgeStyleOverrides, nextSettings] = await Promise.all([
      getDocuments(),
      getAvailableDatasets(),
      getLocalDatasets(),
      getDatasetPreferences(),
      getBadgeStyleOverrides(),
      getSettings()
    ]);
    setDocuments(nextDocuments);
    setDatasets(nextDatasets);
    setLocalDatasets(nextLocalDatasets);
    setPreference(nextPreference);
    setBadgeStyleOverrides(nextBadgeStyleOverrides);
    setSettings(nextSettings);
    if (!selectedDocumentId && nextDocuments[0]) {
      setSelectedDocumentId(nextDocuments[0].id);
    }
  }

  useEffect(() => {
    void refreshAll();
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveTab(readInitialTab());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    setAuthorDraft("");
    setTagDraft("");
  }, [selectedDocumentId]);

  const allFolders = useMemo(
    () => Array.from(new Set(documents.flatMap((document) => document.folderIds))).sort((left, right) => left.localeCompare(right)),
    [documents]
  );

  const folderEntries = useMemo(
    () =>
      Array.from(new Set([...(settings?.customFolders ?? []), ...allFolders]))
        .sort((left, right) => left.localeCompare(right))
        .map((folderId) => ({
        id: folderId,
        label: getFolderDisplayName(folderId, settings?.folderLabels ?? {})
      })),
    [allFolders, settings]
  );

  const allTags = useMemo(
    () => Array.from(new Set(documents.flatMap((document) => document.tags))).sort((left, right) => left.localeCompare(right)),
    [documents]
  );

  const allJournals = useMemo(
    () =>
      Array.from(new Set(documents.map((document) => document.journal?.trim()).filter(Boolean) as string[])).sort((left, right) =>
        left.localeCompare(right)
      ),
    [documents]
  );

  const allRankingLabels = useMemo(
    () =>
      Array.from(new Set(documents.flatMap((document) => document.rankingBadges.map((badge) => badge.rankingLabel)))).sort(
        (left, right) => left.localeCompare(right)
      ),
    [documents]
  );

  const visibleDocuments = useMemo(() => {
    const queried = queryDocuments(documents, searchKeyword, sortMode);
    return queried.filter(
      (document) =>
        (!folderFilter || document.folderIds.includes(folderFilter)) &&
        (!tagFilter || document.tags.includes(tagFilter)) &&
        (!rankingFilter || document.rankingBadges.some((badge) => badge.rankingLabel === rankingFilter))
    );
  }, [documents, searchKeyword, sortMode, folderFilter, tagFilter, rankingFilter]);

  const selectedDocument =
    visibleDocuments.find((document) => document.id === selectedDocumentId) ??
    documents.find((document) => document.id === selectedDocumentId) ??
    null;

  const selectedBulkDocuments = useMemo(
    () => documents.filter((document) => selectedDocumentIds.includes(document.id)),
    [documents, selectedDocumentIds]
  );

  const visibleDocumentIds = useMemo(() => visibleDocuments.map((document) => document.id), [visibleDocuments]);

  const allVisibleSelected =
    visibleDocumentIds.length > 0 && visibleDocumentIds.every((documentId) => selectedDocumentIds.includes(documentId));

  const exportDocuments = useMemo(() => {
    if (exportScope === "all") {
      return documents;
    }
    if (exportScope === "journal") {
      return documents.filter((document) => document.journal?.trim() === exportJournal);
    }
    return visibleDocuments;
  }, [documents, exportJournal, exportScope, visibleDocuments]);

  const libraryStats = useMemo(() => {
    const matchedCount = documents.filter((document) => document.rankingBadges.length > 0).length;
    return {
      total: documents.length,
      matched: matchedCount,
      unmatched: documents.length - matchedCount,
      badges: documents.reduce((sum, document) => sum + document.rankingBadges.length, 0)
    };
  }, [documents]);

  const sortedDatasets = useMemo(() => sortDatasetsByPreference(datasets, preference), [datasets, preference]);

  const providers = useMemo(
    () => [...baseProviders, ...(settings?.customSearchProviders ?? [])],
    [baseProviders, settings]
  );

  const downloadProviders = useMemo(
    () => [...baseProviders, ...(settings?.customDownloadProviders ?? [])],
    [baseProviders, settings]
  );

  const uniqueBadgeEntries = useMemo(() => {
    const seen = new Set<string>();
    return sortedDatasets
      .flatMap((dataset) =>
        dataset.records.flatMap((record) => {
          const key = createBadgeStyleOverrideKey({
            datasetId: dataset.id,
            rankingLabel: record.rankingLabel
          });
          if (!record.rankingLabel || seen.has(key)) {
            return [];
          }
          seen.add(key);
          return [
            {
              key,
              datasetId: dataset.id,
              datasetName: dataset.name,
              rankingLabel: record.rankingLabel
            }
          ];
        })
      )
      .sort(
        (left, right) =>
          left.datasetName.localeCompare(right.datasetName, "zh-CN") ||
          left.rankingLabel.localeCompare(right.rankingLabel, "zh-CN") ||
          left.datasetId.localeCompare(right.datasetId, "zh-CN")
      );
  }, [sortedDatasets]);

  const filteredBadgeColorEntries = useMemo(() => {
    const keyword = badgeColorSearch.trim().toLowerCase();
    if (!keyword) {
      return uniqueBadgeEntries;
    }
    return uniqueBadgeEntries.filter((badgeEntry) =>
      [badgeEntry.rankingLabel, badgeEntry.datasetName, badgeEntry.datasetId].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }, [badgeColorSearch, uniqueBadgeEntries]);

  const datasetStats = useMemo(() => {
    const enabledIds = new Set(
      preference?.configs.filter((config) => config.enabled).map((config) => config.datasetId) ?? []
    );
    const visibleIds = new Set(
      preference?.configs.filter((config) => config.visible).map((config) => config.datasetId) ?? []
    );
    return {
      total: datasets.length,
      enabled: datasets.filter((dataset) => enabledIds.has(dataset.id)).length,
      visible: datasets.filter((dataset) => visibleIds.has(dataset.id)).length,
      records: datasets.reduce((sum, dataset) => sum + dataset.records.length, 0)
    };
  }, [datasets, preference]);

  const datasetSearchResults = useMemo(() => {
    const keyword = datasetSearchKeyword.trim().toLocaleLowerCase();
    if (!keyword) {
      return [];
    }
    return sortedDatasets
      .flatMap((dataset) =>
        dataset.records.flatMap((record) => {
          const searchable = [record.title, record.canonicalTitle, record.rankingLabel, ...record.aliases, ...record.issn]
            .join(" ")
            .toLocaleLowerCase();
          return searchable.includes(keyword) ? [{ dataset, record }] : [];
        })
      )
      .slice(0, 50);
  }, [datasetSearchKeyword, sortedDatasets]);

  async function handleImportDatasets(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const raw = await file.text();
      const importedDatasets = parseImportedDatasets(raw);
      setPendingImport({
        fileName: file.name,
        datasets: importedDatasets
      });
      setMessage(`已读取文件：${file.name}，待确认导入`);
    } catch (error) {
      setPendingImport(null);
      setMessage(error instanceof Error ? error.message : "导入失败");
    } finally {
      event.target.value = "";
    }
  }

  async function handleConfirmImport() {
    if (!pendingImport) {
      return;
    }

    const report = buildDatasetImportReport(pendingImport.datasets);
    const existingIds = new Set(localDatasets.map((dataset) => dataset.id));
    const replaceCount = pendingImport.datasets.filter((dataset) => existingIds.has(dataset.id)).length;
    const newCount = pendingImport.datasets.length - replaceCount;

    for (const dataset of pendingImport.datasets) {
      await saveLocalDataset(dataset);
    }
    await refreshAll();
    setMessage(
      `已导入 ${pendingImport.datasets.length} 个本地期刊标签数据集：新增 ${newCount} 个，替换 ${replaceCount} 个，共 ${report.totalRecords} 条期刊记录。建议点击“批量更新期刊标签”。`
    );
    setPendingImport(null);
  }

  async function handleRecompute() {
    if (!preference) {
      return;
    }
    const beforeSummary = makeRankingSummary(documents);
    const recomputed = recomputeAllDocumentRankings(documents, datasets, preference.configs);
    const changedCount = recomputed.filter((document, index) => makeBadgeSignature(document) !== makeBadgeSignature(documents[index])).length;
    const afterSummary = makeRankingSummary(recomputed);
    await replaceDocuments(recomputed);
    await refreshAll();
    setMessage(
      `已批量更新期刊标签：共 ${recomputed.length} 篇，变化 ${changedCount} 篇，有标签 ${beforeSummary.matched}→${afterSummary.matched}，标签数 ${beforeSummary.badges}→${afterSummary.badges}`
    );
  }

  async function handleRecomputeSelected(document: DocumentRecord) {
    if (!preference) {
      return;
    }
    const recomputed = recomputeDocumentRanking(document, datasets, preference.configs);
    const next = await updateDocument(document.id, {
      rankingBadges: recomputed.rankingBadges
    });
    await refreshAll();
    if (next) {
      setSelectedDocumentId(next.id);
    }
    setMessage(`已更新期刊标签：${document.title}`);
  }

  async function handleRecomputeSelectedBulk() {
    if (!preference) {
      return;
    }
    if (selectedBulkDocuments.length === 0) {
      setMessage("请先勾选要批量更新的文献");
      return;
    }

    const selectedIds = new Set(selectedBulkDocuments.map((document) => document.id));
    const beforeSummary = makeRankingSummary(selectedBulkDocuments);
    const nextDocuments = documents.map((document) =>
      selectedIds.has(document.id) ? recomputeDocumentRanking(document, datasets, preference.configs) : document
    );
    const nextSelectedDocuments = nextDocuments.filter((document) => selectedIds.has(document.id));
    const beforeById = new Map(selectedBulkDocuments.map((document) => [document.id, makeBadgeSignature(document)]));
    const changedCount = nextSelectedDocuments.filter((document) => beforeById.get(document.id) !== makeBadgeSignature(document)).length;
    const afterSummary = makeRankingSummary(nextSelectedDocuments);
    await replaceDocuments(nextDocuments);
    await refreshAll();
    setMessage(
      `已批量重算期刊标签：共 ${selectedBulkDocuments.length} 篇，变化 ${changedCount} 篇，有标签 ${beforeSummary.matched}→${afterSummary.matched}，标签数 ${beforeSummary.badges}→${afterSummary.badges}`
    );
  }

  async function handleBulkAddFolder() {
    if (!bulkFolderId) {
      setMessage("先选择要加入的分类");
      return;
    }
    if (selectedBulkDocuments.length === 0) {
      setMessage("请先勾选要加入分类的文献");
      return;
    }

    const selectedIds = new Set(selectedBulkDocuments.map((document) => document.id));
    const nextDocuments = documents.map((document) => {
      if (!selectedIds.has(document.id)) {
        return document;
      }
      const folderIds = Array.from(new Set([...document.folderIds.filter((item) => item !== "inbox"), bulkFolderId]));
      return {
        ...document,
        folderIds: folderIds.length ? folderIds : ["inbox"],
        updatedAt: new Date().toISOString(),
        version: document.version + 1
      };
    });

    await replaceDocuments(nextDocuments);
    await refreshAll();
    setMessage(`已将 ${selectedBulkDocuments.length} 篇文献加入分类：${getFolderDisplayName(bulkFolderId, settings?.folderLabels ?? {})}`);
  }

  async function handleBulkDeleteDocuments() {
    if (selectedBulkDocuments.length === 0) {
      setMessage("请先勾选要取消收藏的文献");
      return;
    }

    const selectedIds = new Set(selectedBulkDocuments.map((document) => document.id));
    await replaceDocuments(documents.filter((document) => !selectedIds.has(document.id)));
    setSelectedDocumentIds([]);
    setSelectedDocumentId("");
    await refreshAll();
    setMessage(`已取消收藏 ${selectedIds.size} 篇文献`);
  }

  function toggleDocumentSelection(documentId: string, checked: boolean) {
    setSelectedDocumentIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, documentId]));
      }
      return current.filter((item) => item !== documentId);
    });
    setLastSelectedDocumentId(documentId);
  }

  function selectDocumentWithSystemKeys(documentId: string, event: MouseEvent, forcedChecked?: boolean) {
    const isRangeSelect = event.shiftKey && lastSelectedDocumentId && visibleDocumentIds.includes(lastSelectedDocumentId);
    const isAdditiveSelect = event.metaKey || event.ctrlKey;

    if (isRangeSelect) {
      const anchorIndex = visibleDocumentIds.indexOf(lastSelectedDocumentId);
      const currentIndex = visibleDocumentIds.indexOf(documentId);
      const [start, end] = [anchorIndex, currentIndex].sort((left, right) => left - right);
      const rangeIds = visibleDocumentIds.slice(start, end + 1);
      setSelectedDocumentIds((current) => (isAdditiveSelect ? Array.from(new Set([...current, ...rangeIds])) : rangeIds));
      setSelectedDocumentId(documentId);
      return;
    }

    if (isAdditiveSelect || typeof forcedChecked === "boolean") {
      setSelectedDocumentIds((current) => {
        const shouldSelect = typeof forcedChecked === "boolean" ? forcedChecked : !current.includes(documentId);
        return shouldSelect
          ? Array.from(new Set([...current, documentId]))
          : current.filter((item) => item !== documentId);
      });
      setLastSelectedDocumentId(documentId);
      setSelectedDocumentId(documentId);
    }
  }

  function toggleVisibleSelection() {
    setSelectedDocumentIds((current) => {
      if (allVisibleSelected) {
        return current.filter((documentId) => !visibleDocumentIds.includes(documentId));
      }
      return Array.from(new Set([...current, ...visibleDocumentIds]));
    });
  }

  async function handleRefetchSelected(document: DocumentRecord) {
    try {
      const refreshed = await refetchDocumentMetadataFromUrl(document);
      const recomputed = preference
        ? recomputeDocumentRanking(refreshed, datasets, preference.configs)
        : refreshed;
      const next = await patchSelectedDocument(document, recomputed);
      if (next) {
        setMessage(`已更新元数据：${next.title}`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重新抓取元数据失败");
    }
  }

  function openOriginal(document: DocumentRecord) {
    if (!document.url) {
      setMessage("这篇文献没有原文链接");
      return;
    }
    window.open(document.url, "_blank", "noopener,noreferrer");
  }

  function openFullText(document: DocumentRecord) {
    const provider = resolveFullTextProvider(providers, settings?.defaultSearchProvider, {
      title: document.title,
      doi: document.doi ?? undefined,
      url: document.url ?? undefined
    });
    if (!provider) {
      setMessage("还没有可用的全文搜索入口");
      return;
    }
    const url = buildFullTextProviderUrl(provider, {
      title: document.title,
      doi: document.doi ?? undefined,
      url: document.url ?? undefined
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openDownloadFullText(document: DocumentRecord) {
    const provider = downloadProviders.find((item) => item.id === settings?.defaultDownloadProvider) ?? downloadProviders[0];
    if (!provider) {
      setMessage("还没有可用的全文下载入口");
      return;
    }
    const url = buildFullTextProviderUrl(provider, {
      title: document.title,
      doi: document.doi ?? undefined,
      url: document.url ?? undefined
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function toggleExportField(field: LibraryExportField, checked: boolean) {
    setExportFields((current) => {
      if (checked) {
        return Array.from(new Set([...current, field]));
      }
      return current.filter((item) => item !== field);
    });
  }

  function selectedExportFields() {
    return exportFields.length ? exportFields : libraryExportFields.map((field) => field.id);
  }

  function exportLibrary(format: "json" | "csv" | "bibtex" | "ris") {
    const fields = selectedExportFields();
    if (exportDocuments.length === 0) {
      setMessage("当前导出范围没有文献");
      return;
    }

    if (format === "json") {
      downloadText("paper-label-library.json", exportDocumentsAsJson(exportDocuments, fields), "application/json");
    }
    if (format === "csv") {
      downloadText("paper-label-library.csv", exportDocumentsAsCsv(exportDocuments, fields), "text/csv");
    }
    if (format === "bibtex") {
      downloadText("paper-label-library.bib", exportDocumentsAsBibTeX(exportDocuments, fields), "application/x-bibtex");
    }
    if (format === "ris") {
      downloadText("paper-label-library.ris", exportDocumentsAsRis(exportDocuments, fields), "application/x-research-info-systems");
    }
    setMessage(`已导出 ${exportDocuments.length} 篇文献`);
  }

  async function patchSelectedDocument(document: DocumentRecord, patch: Partial<DocumentRecord>) {
    const next = await updateDocument(document.id, patch);
    if (next) {
      await refreshAll();
      setSelectedDocumentId(next.id);
    }
    return next;
  }

  async function commitAuthorTokens(document: DocumentRecord, incomingValue: string) {
    const nextAuthors = Array.from(new Set([...document.authors, ...splitAuthorInput(incomingValue)]));
    await patchSelectedDocument(document, {
      authors: nextAuthors
    });
    setAuthorDraft("");
  }

  async function removeAuthorToken(document: DocumentRecord, author: string) {
    await patchSelectedDocument(document, {
      authors: document.authors.filter((item) => item !== author)
    });
  }

  async function updateAuthorAt(document: DocumentRecord, index: number, value: string) {
    const nextAuthors = document.authors.map((author, authorIndex) => (authorIndex === index ? value.trim() : author)).filter(Boolean);
    await patchSelectedDocument(document, {
      authors: Array.from(new Set(nextAuthors))
    });
  }

  async function removeAuthorAt(document: DocumentRecord, index: number) {
    await patchSelectedDocument(document, {
      authors: document.authors.filter((_, authorIndex) => authorIndex !== index)
    });
  }

  async function commitTagTokens(document: DocumentRecord, incomingValue: string) {
    const nextTags = Array.from(new Set([...document.tags, ...splitTokenInput(incomingValue)]));
    await patchSelectedDocument(document, {
      tags: nextTags
    });
    setTagDraft("");
  }

  async function removeTagToken(document: DocumentRecord, tag: string) {
    await patchSelectedDocument(document, {
      tags: document.tags.filter((item) => item !== tag)
    });
  }

  async function toggleDocumentFolder(document: DocumentRecord, folderId: string, checked: boolean) {
    const foldersWithoutInbox = document.folderIds.filter((item) => item !== "inbox");
    const nextFolders = checked
      ? Array.from(new Set([...foldersWithoutInbox, folderId]))
      : foldersWithoutInbox.filter((item) => item !== folderId);
    await patchSelectedDocument(document, {
      folderIds: nextFolders.length ? nextFolders : ["inbox"]
    });
  }

  async function deleteCustomFolder(folderId: string) {
    if (!settings || !folderId || folderId === "inbox") {
      return;
    }

    const nextCustomFolders = settings.customFolders.filter((item) => item !== folderId);
    const nextFolderLabels = { ...settings.folderLabels };
    delete nextFolderLabels[folderId];
    const nextDocuments = documents.map((document) => {
      const nextFolderIds = document.folderIds.filter((item) => item !== folderId);
      return {
        ...document,
        folderIds: nextFolderIds.length ? nextFolderIds : ["inbox"]
      };
    });

    await replaceDocuments(nextDocuments);
    const nextSettings = await updateSettings({
      customFolders: nextCustomFolders,
      folderLabels: nextFolderLabels
    });
    setSettings(nextSettings);
    await refreshAll();
    if (folderFilter === folderId) {
      setFolderFilter("");
    }
    setMessage(`已删除分类：${getFolderDisplayName(folderId, settings.folderLabels)}`);
  }

  function toggleFolderFilter(folderId: string) {
    if (folderFilter === folderId) {
      setFolderFilter("");
      setNewFolderId("");
      return;
    }

    setFolderFilter(folderId);
    setNewFolderId(getFolderDisplayName(folderId, settings?.folderLabels ?? {}));
  }

  async function createCustomFolder() {
    if (!settings) {
      return;
    }
    const nextFolderId = newFolderId.trim();
    if (!nextFolderId) {
      setMessage("先输入分类名");
      return;
    }

    const nextCustomFolders = Array.from(new Set([...(settings.customFolders ?? []), nextFolderId]));
    const nextFolderLabels = {
      ...settings.folderLabels,
      [nextFolderId]: settings.folderLabels[nextFolderId] ?? nextFolderId
    };
    const next = await updateSettings({
      customFolders: nextCustomFolders,
      folderLabels: nextFolderLabels
    });
    setSettings(next);
    setNewFolderId("");
    setMessage(`已新增分类：${nextFolderId}`);
  }

  async function renameSelectedFolder() {
    if (!settings || !folderFilter) {
      setMessage("先选择一个文件夹");
      return;
    }
    const nextName = newFolderId.trim();
    if (!nextName) {
      setMessage("先输入新的文件夹名称");
      return;
    }

    const next = await updateSettings({
      folderLabels: {
        ...settings.folderLabels,
        [folderFilter]: nextName
      }
    });
    setSettings(next);
    setMessage(`已更名：${nextName}`);
  }

  async function addCustomProvider() {
    if (!settings) {
      return;
    }
    try {
      const provider = createCustomProvider(customProviderName, customProviderTemplate, providers, "custom-search");
      const next = await updateSettings({
        customSearchProviders: [...settings.customSearchProviders, provider],
        defaultSearchProvider: provider.id
      });
      setSettings(next);
      setCustomProviderName("");
      setCustomProviderTemplate("");
      setMessage(`已新增全文站点：${provider.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增全文站点失败");
    }
  }

  async function addCustomDownloadProvider() {
    if (!settings) {
      return;
    }
    try {
      const provider = createCustomProvider(
        customDownloadProviderName,
        customDownloadProviderTemplate,
        downloadProviders,
        "custom-download"
      );
      const next = await updateSettings({
        customDownloadProviders: [...settings.customDownloadProviders, provider],
        defaultDownloadProvider: provider.id
      });
      setSettings(next);
      setCustomDownloadProviderName("");
      setCustomDownloadProviderTemplate("");
      setMessage(`已新增下载站点：${provider.name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "新增下载站点失败");
    }
  }

  async function removeCustomProvider(providerId: string) {
    if (!settings) {
      return;
    }
    const nextProviders = settings.customSearchProviders.filter((provider) => provider.id !== providerId);
    const fallbackProviderId =
      settings.defaultSearchProvider === providerId
        ? AUTO_FULLTEXT_PROVIDER_ID
        : settings.defaultSearchProvider;
    const next = await updateSettings({
      customSearchProviders: nextProviders,
      defaultSearchProvider: fallbackProviderId
    });
    setSettings(next);
    setMessage("已删除自定义全文站点");
  }

  async function removeCustomDownloadProvider(providerId: string) {
    if (!settings) {
      return;
    }
    const nextProviders = settings.customDownloadProviders.filter((provider) => provider.id !== providerId);
    const fallbackProviderId =
      settings.defaultDownloadProvider === providerId
        ? baseProviders.find((provider) => provider.id === "doi-resolver")?.id ?? baseProviders[0]?.id ?? nextProviders[0]?.id ?? ""
        : settings.defaultDownloadProvider;
    const next = await updateSettings({
      customDownloadProviders: nextProviders,
      defaultDownloadProvider: fallbackProviderId
    });
    setSettings(next);
    setMessage("已删除自定义下载站点");
  }

  if (!preference || !settings) {
    return <div className="popup-shell">Loading...</div>;
  }

  const { t } = createTranslator(settings.language);

  return (
    <div className="popup-shell options-shell">
      <div className="popup-card">
        <div className="eyebrow">paper-label</div>
        <h1>{t("openCoreTitle")}</h1>
        <p className="muted">{t("appSubtitle")}</p>
        <label className="label" htmlFor="options-language">
          {t("language")}
        </label>
        <select
          id="options-language"
          value={settings.language}
          onChange={async (event) => {
            const next = await updateSettings({
              language: event.target.value as AppLanguage
            });
            setSettings(next);
          }}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {message ? <p className="auth-message">{message}</p> : null}
      </div>

      <div className="popup-card tab-row">
        <button
          className={`tab-button ${activeTab === "library" ? "tab-button-active" : ""}`}
          onClick={() => {
            location.hash = "library";
            setActiveTab("library");
          }}
        >
          {t("localLibrary")}
        </button>
        <button
          className={`tab-button ${activeTab === "datasets" ? "tab-button-active" : ""}`}
          onClick={() => {
            location.hash = "datasets";
            setActiveTab("datasets");
          }}
        >
          {t("datasetManagement")}
        </button>
      </div>

      {activeTab === "library" ? (
        <>
          <div className="popup-card">
            <div className="button-row-inline">
              <input
                value={searchKeyword}
                placeholder={t("searchPlaceholder")}
                onChange={(event) => setSearchKeyword(event.target.value)}
              />
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as LibrarySortMode)}>
                <option value="updatedAt">{t("recentlyUpdated")}</option>
                <option value="year">{t("year")}</option>
                <option value="title">{t("title")}</option>
              </select>
            </div>
            <div className="filter-grid">
              <select value={folderFilter} onChange={(event) => setFolderFilter(event.target.value)}>
                <option value="">{t("literatureCategory")}</option>
                {folderEntries.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.label}
                  </option>
                ))}
              </select>
              <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
                <option value="">{t("allTags")}</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <select value={rankingFilter} onChange={(event) => setRankingFilter(event.target.value)}>
                <option value="">{t("allJournalLabels")}</option>
                {allRankingLabels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
              <details className="export-dropdown">
                <summary>{t("export")}</summary>
                <div className="export-dropdown-menu">
                  <div className="export-panel-section">
                    <strong>导出范围</strong>
                    <select value={exportScope} onChange={(event) => setExportScope(event.target.value as ExportScope)}>
                      <option value="visible">当前界面筛选结果（{visibleDocuments.length}）</option>
                      <option value="all">全部文献（{documents.length}）</option>
                      <option value="journal">指定期刊</option>
                    </select>
                    {exportScope === "journal" ? (
                      <select value={exportJournal} onChange={(event) => setExportJournal(event.target.value)}>
                        <option value="">选择期刊</option>
                        {allJournals.map((journal) => (
                          <option key={journal} value={journal}>
                            {journal}
                          </option>
                        ))}
                      </select>
                    ) : null}
                    <span className="muted">将导出 {exportDocuments.length} 篇</span>
                  </div>

                  <div className="export-panel-section">
                    <div className="export-field-header">
                      <strong>导出信息</strong>
                      <button
                        type="button"
                        onClick={() => setExportFields(libraryExportFields.map((field) => field.id))}
                      >
                        全选
                      </button>
                      <button type="button" onClick={() => setExportFields(["title", "authors", "year", "journal", "doi", "rankingBadges"])}>
                        常用
                      </button>
                    </div>
                    <div className="export-field-grid">
                      {libraryExportFields.map((field) => (
                        <label key={field.id} className="export-field-option">
                          <input
                            type="checkbox"
                            checked={exportFields.includes(field.id)}
                            onChange={(event) => toggleExportField(field.id, event.target.checked)}
                          />
                          <span>{field.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="export-format-grid">
                    <button type="button" onClick={() => exportLibrary("json")}>JSON</button>
                    <button type="button" onClick={() => exportLibrary("csv")}>CSV</button>
                    <button type="button" onClick={() => exportLibrary("bibtex")}>BibTeX</button>
                    <button type="button" onClick={() => exportLibrary("ris")}>RIS</button>
                  </div>
                </div>
              </details>
            </div>

            <div className="dataset-stat-grid library-stat-grid">
              <div><strong>{libraryStats.total}</strong><span>{t("documentTotal")}</span></div>
              <div><strong>{libraryStats.matched}</strong><span>{t("withJournalLabels")}</span></div>
              <div><strong>{libraryStats.unmatched}</strong><span>{t("pendingRecognition")}</span></div>
              <div><strong>{libraryStats.badges}</strong><span>{t("journalLabels")}</span></div>
            </div>
          </div>

          <div className="popup-card">
            <div className="library-category-header">
              <div>
                <div className="library-subtab-title">{t("literatureManagement")}</div>
                <span className="muted">{t("libraryHelp")}</span>
              </div>
              <span className="selection-pill">{t("selectedCount", { count: selectedBulkDocuments.length })}</span>
            </div>

            <div className="library-category-control-row">
              <details className="folder-dropdown">
                <summary>{folderFilter ? getFolderDisplayName(folderFilter, settings.folderLabels) : t("allDocuments")}</summary>
                <div className="folder-dropdown-menu">
                  <button
                    type="button"
                    className={`folder-dropdown-option ${folderFilter === "" ? "folder-dropdown-option-active" : ""}`}
                    onClick={() => {
                      setFolderFilter("");
                      setNewFolderId("");
                    }}
                  >
                    {t("allDocuments")}
                  </button>
                  {folderEntries.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className={`folder-dropdown-option ${folderFilter === folder.id ? "folder-dropdown-option-active" : ""}`}
                      onClick={() => toggleFolderFilter(folder.id)}
                    >
                      {folder.label}
                    </button>
                  ))}
                </div>
              </details>
              <input
                value={newFolderId}
                placeholder={folderFilter ? t("renameFolderPlaceholder") : t("newFolderPlaceholder")}
                onChange={(event) => setNewFolderId(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createCustomFolder();
                  }
                }}
              />
              <button
                type="button"
                className="refresh-button secondary-button"
                onClick={() => void createCustomFolder()}
              >
                {t("add")}
              </button>
              <button
                type="button"
                className="category-action-button"
                disabled={!folderFilter}
                onClick={() => void renameSelectedFolder()}
              >
                {t("rename")}
              </button>
              <button
                type="button"
                className="category-delete-button"
                disabled={!folderFilter || folderFilter === "inbox"}
                title={folderFilter === "inbox" ? t("cannotDeleteDefaultFolder") : t("deleteSelectedFolder")}
                onClick={() => void deleteCustomFolder(folderFilter)}
              >
                {t("delete")}
              </button>
            </div>

            <div className="bulk-action-panel">
              <span className="bulk-help-text">{t("multiSelectHint")}</span>
              <button type="button" className="soft-action-button" onClick={toggleVisibleSelection}>
                {allVisibleSelected ? t("unselectCurrentList") : t("selectCurrentList")}
              </button>
              <button type="button" className="soft-action-button" onClick={() => setSelectedDocumentIds([])}>
                {t("clear")}
              </button>
              <select value={bulkFolderId} onChange={(event) => setBulkFolderId(event.target.value)}>
                <option value="">{t("addToFolder")}</option>
                {folderEntries.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="refresh-button"
                disabled={selectedBulkDocuments.length === 0 || !bulkFolderId}
                onClick={() => void handleBulkAddFolder()}
              >
                {t("add")}
              </button>
              <button
                type="button"
                className="soft-action-button"
                disabled={selectedBulkDocuments.length === 0}
                onClick={() => void handleRecomputeSelectedBulk()}
              >
                {t("recomputeLabels")}
              </button>
              <button
                type="button"
                className="danger-action-button"
                disabled={selectedBulkDocuments.length === 0}
                onClick={() => void handleBulkDeleteDocuments()}
              >
                {t("cancelSaved")}
              </button>
            </div>
          </div>

          <div className="popup-card">
            {visibleDocuments.length === 0 ? <div className="muted">{t("noLocalDocuments")}</div> : null}
            <div className="library-card-grid">
              {visibleDocuments.map((document) => (
                <div
                  key={document.id}
                  className={`library-item library-item-compact library-item-selectable ${
                    document.id === selectedDocument?.id ? "library-item-active" : ""
                  }`}
                >
                  <label className="library-select-row" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.includes(document.id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectDocumentWithSystemKeys(document.id, event, !selectedDocumentIds.includes(document.id));
                      }}
                      onChange={() => undefined}
                    />
                    <span>{t("select")}</span>
                  </label>
                  <button
                    type="button"
                    className="library-item-open-button"
                    onClick={(event) => {
                      if (event.shiftKey || event.metaKey || event.ctrlKey) {
                        selectDocumentWithSystemKeys(document.id, event);
                        return;
                      }
                      setSelectedDocumentId(document.id);
                      setShowLibraryDetailModal(true);
                    }}
                  >
                    <strong className="library-item-title">{document.title}</strong>
                    <span className="muted library-item-meta">{formatRelativeMeta(document)}</span>
                    <div className="library-item-footer">
                    <span className="muted">{t("updated")} {formatUpdatedAt(document.updatedAt)}</span>
                    <span className="muted">
                      {document.rankingBadges.length > 0 ? t("labelCount", { count: document.rankingBadges.length }) : t("unmatchedJournalLabels")}
                    </span>
                    </div>
                    <span className="badge-row">
                      {document.rankingBadges.map((badge) => (
                        <span
                          key={`${badge.datasetId}:${badge.recordId}`}
                          className="static-badge"
                          style={getBadgePaletteForBadge(badge, badgeStyleOverrides)}
                        >
                          {badge.rankingLabel}
                        </span>
                      ))}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {showLibraryDetailModal && selectedDocument ? (
            <div className="modal-backdrop" onClick={() => setShowLibraryDetailModal(false)}>
              <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
                <div className="detail-form">
                  <div className="modal-header">
                    <h2>{selectedDocument.title}</h2>
                    <button className="refresh-button secondary-button modal-close-button" onClick={() => setShowLibraryDetailModal(false)}>
                      {t("close")}
                    </button>
                  </div>
                  <div className="popup-card inline-subcard">
                    <strong>期刊标签</strong>
                    <div className="ranking-snapshot-list">
                      {selectedDocument.rankingBadges.length === 0 ? (
                        <span className="muted">当前没有匹配到期刊标签</span>
                      ) : (
                        selectedDocument.rankingBadges.map((badge) => (
                          <span
                            key={`${badge.datasetId}:${badge.recordId}`}
                            className="static-badge ranking-snapshot-badge"
                            style={getBadgePaletteForBadge(badge, badgeStyleOverrides)}
                          >
                            {badge.rankingLabel}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                  <p className="muted">本地库保存文献信息，不保存全文 PDF；“查找全文”只会跳转合法入口。</p>

                  <div className="detail-summary-grid">
                    <div className="detail-summary-card">
                      <span className="muted">类型</span>
                      <strong>{getItemTypeLabel(selectedDocument.itemType)}</strong>
                    </div>
                    <div className="detail-summary-card">
                      <span className="muted">期刊</span>
                      <strong>{selectedDocument.journal ?? "未识别期刊"}</strong>
                    </div>
                    <div className="detail-summary-card">
                      <span className="muted">年份</span>
                      <strong>{selectedDocument.year ?? "未填写"}</strong>
                    </div>
                    <div className="detail-summary-card">
                      <span className="muted">期刊标签</span>
                      <strong>{selectedDocument.rankingBadges.length || "0"}</strong>
                    </div>
                    <div className="detail-summary-card">
                      <span className="muted">更新</span>
                      <strong>{formatUpdatedAt(selectedDocument.updatedAt)}</strong>
                    </div>
                  </div>

                  <div className="detail-actions">
                    <button
                      className="refresh-button secondary-button"
                      disabled={!selectedDocument.url}
                      onClick={() => openOriginal(selectedDocument)}
                    >
                      打开原文页面
                    </button>
                    <button className="refresh-button secondary-button" onClick={() => openFullText(selectedDocument)}>
                      {t("findFullText")}
                    </button>
                    <button className="refresh-button secondary-button" onClick={() => openDownloadFullText(selectedDocument)}>
                      {t("downloadFullText")}
                    </button>
                    <button className="refresh-button secondary-button" onClick={() => void handleRecomputeSelected(selectedDocument)}>
                      更新期刊标签
                    </button>
                    <button
                      className="refresh-button secondary-button"
                      disabled={!selectedDocument.url}
                      onClick={() => void handleRefetchSelected(selectedDocument)}
                    >
                      重新抓取元数据
                    </button>
                  </div>

                  <label className="label">标题</label>
                  <input
                    value={selectedDocument.title}
                    onChange={async (event) => {
                      await patchSelectedDocument(selectedDocument, {
                        title: event.target.value
                      });
                    }}
                  />

                  <label className="label">文献类型</label>
                  <select
                    value={selectedDocument.itemType ?? "journalArticle"}
                    onChange={async (event) => {
                      await patchSelectedDocument(selectedDocument, {
                        itemType: event.target.value
                      });
                    }}
                  >
                    <option value="journalArticle">期刊论文</option>
                    <option value="conferencePaper">会议论文</option>
                    <option value="bookSection">书籍章节</option>
                    <option value="thesis">学位论文</option>
                    <option value="preprint">预印本</option>
                  </select>

                  <label className="label">作者</label>
                  <div className="creator-editor creator-editor-inline">
                    {selectedDocument.authors.length === 0 ? <span className="muted">还没有作者</span> : null}
                    {selectedDocument.authors.map((author, authorIndex) => (
                      <div key={`${author}:${authorIndex}`} className="creator-chip">
                        <input
                          aria-label="作者"
                          defaultValue={author}
                          onBlur={(event) => void updateAuthorAt(selectedDocument, authorIndex, event.target.value)}
                        />
                        <button
                          type="button"
                          className="creator-remove-button"
                          title="删除作者"
                          onClick={() => void removeAuthorAt(selectedDocument, authorIndex)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <input
                      value={authorDraft}
                      placeholder="添加作者，多个作者可用逗号或回车分隔"
                      onChange={(event) => setAuthorDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void commitAuthorTokens(selectedDocument, authorDraft);
                        }
                      }}
                      onBlur={() => {
                        if (authorDraft.trim()) {
                          void commitAuthorTokens(selectedDocument, authorDraft);
                        }
                      }}
                    />
                  </div>

                  <label className="label">年份</label>
                  <input
                    type="number"
                    value={selectedDocument.year ?? ""}
                    onChange={async (event) => {
                      await patchSelectedDocument(selectedDocument, {
                        year: event.target.value ? Number(event.target.value) : undefined
                      });
                    }}
                  />

                  <label className="label">期刊 / 来源</label>
                  <input
                    value={selectedDocument.journal ?? ""}
                    onChange={async (event) => {
                      await patchSelectedDocument(selectedDocument, {
                        journal: event.target.value
                      });
                    }}
                  />

                  <label className="label">标签</label>
                  <div className="token-editor">
                    <div className="token-chip-row">
                      {selectedDocument.tags.length === 0 ? <span className="muted">还没有标签</span> : null}
                      {selectedDocument.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className="token-chip"
                          onClick={() => void removeTagToken(selectedDocument, tag)}
                        >
                          {tag} <span>×</span>
                        </button>
                      ))}
                    </div>
                    <input
                      value={tagDraft}
                      placeholder="输入标签后按空格或回车"
                      onChange={(event) => setTagDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " " || event.key === "," || event.key === "，") {
                          event.preventDefault();
                          void commitTagTokens(selectedDocument, tagDraft);
                        }
                      }}
                      onBlur={() => {
                        if (tagDraft.trim()) {
                          void commitTagTokens(selectedDocument, tagDraft);
                        }
                      }}
                    />
                  </div>

                  <label className="label">文件夹</label>
                  <div className="folder-multi-select">
                    {folderEntries.map((folder) => (
                      <label key={folder.id} className="folder-option">
                        <input
                          type="checkbox"
                          checked={selectedDocument.folderIds.includes(folder.id)}
                          onChange={(event) => void toggleDocumentFolder(selectedDocument, folder.id, event.target.checked)}
                        />
                        <span>{folder.label}</span>
                      </label>
                    ))}
                  </div>

                  <label className="label">备注（每行一条）</label>
                  <textarea
                    value={selectedDocument.notes.join("\n")}
                    onChange={async (event) => {
                      await patchSelectedDocument(selectedDocument, {
                        notes: splitLineInput(event.target.value)
                      });
                    }}
                  />

                  <button
                    className="refresh-button secondary-button"
                    onClick={async () => {
                      await deleteDocument(selectedDocument.id);
                      await refreshAll();
                      setSelectedDocumentId("");
                      setShowLibraryDetailModal(false);
                    }}
                  >
                    取消收藏
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="popup-card compact-settings-card">
            <div className="settings-section">
              <div className="settings-section-header">
                <strong>{t("defaultFullTextSearch")}</strong>
                <span className="muted">{t("autoChineseEnglishSearch")}</span>
              </div>
              <div className="provider-config-grid">
                <div className="provider-config-panel">
                  <div className="provider-config-header">
                    <strong>{t("findFullText")}</strong>
                    <span className="muted">{t("findFullText")}</span>
                  </div>
                  <label className="compact-field" htmlFor="provider-select">
                    <span>{t("defaultFullTextSearch")}</span>
                    <select
                      id="provider-select"
                      value={settings.defaultSearchProvider}
                      onChange={async (event) => {
                        const next = await updateSettings({
                          defaultSearchProvider: event.target.value
                        });
                        setSettings(next);
                      }}
                    >
                      <option value={AUTO_FULLTEXT_PROVIDER_ID}>{t("autoChineseEnglishSearch")}</option>
                      {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <details className="advanced-settings-details">
                    <summary>自定义查找站点</summary>
                    <div className="custom-provider-list">
                      {settings.customSearchProviders.length === 0 ? (
                        <span className="muted">还没有自定义查找站点</span>
                      ) : (
                        settings.customSearchProviders.map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            className="token-chip"
                            onClick={() => void removeCustomProvider(provider.id)}
                            title="点击删除"
                          >
                            {provider.name} <span>×</span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="custom-provider-row">
                      <input
                        value={customProviderName}
                        placeholder="查找站点名称"
                        onChange={(event) => setCustomProviderName(event.target.value)}
                      />
                      <input
                        value={customProviderTemplate}
                        placeholder="查找 URL，例如 https://example.com/search?q={query}"
                        onChange={(event) => setCustomProviderTemplate(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void addCustomProvider();
                          }
                        }}
                      />
                      <button type="button" className="refresh-button secondary-button" onClick={() => void addCustomProvider()}>
                        添加
                      </button>
                    </div>
                  </details>
                </div>

                <div className="provider-config-panel">
                  <div className="provider-config-header">
                    <strong>{t("downloadFullText")}</strong>
                    <span className="muted">{t("downloadFullText")}</span>
                  </div>
                  <label className="compact-field" htmlFor="download-provider-select">
                    <span>{t("downloadFullText")}</span>
                    <select
                      id="download-provider-select"
                      value={settings.defaultDownloadProvider}
                      onChange={async (event) => {
                        const next = await updateSettings({
                          defaultDownloadProvider: event.target.value
                        });
                        setSettings(next);
                      }}
                    >
                      {downloadProviders.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <details className="advanced-settings-details">
                    <summary>自定义下载站点</summary>
                    <div className="custom-provider-list">
                      {settings.customDownloadProviders.length === 0 ? (
                        <span className="muted">还没有自定义下载站点</span>
                      ) : (
                        settings.customDownloadProviders.map((provider) => (
                          <button
                            key={provider.id}
                            type="button"
                            className="token-chip"
                            onClick={() => void removeCustomDownloadProvider(provider.id)}
                            title="点击删除"
                          >
                            {provider.name} <span>×</span>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="custom-provider-row">
                      <input
                        value={customDownloadProviderName}
                        placeholder="下载站点名称"
                        onChange={(event) => setCustomDownloadProviderName(event.target.value)}
                      />
                      <input
                        value={customDownloadProviderTemplate}
                        placeholder="下载 URL，例如 https://example.com/fulltext?doi={query}"
                        onChange={(event) => setCustomDownloadProviderTemplate(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void addCustomDownloadProvider();
                          }
                        }}
                      />
                      <button type="button" className="refresh-button secondary-button" onClick={() => void addCustomDownloadProvider()}>
                        添加
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <div className="settings-section compact-control-grid">
              <label className="compact-field" htmlFor="badge-size-scale">
                <span>{t("badgeSize")}</span>
                <input
                  id="badge-size-scale"
                  type="range"
                  min="0.8"
                  max="1.4"
                  step="0.05"
                  value={settings.badgeSizeScale}
                  onChange={async (event) => {
                    const next = await updateSettings({
                      badgeSizeScale: Number(event.target.value)
                    });
                    setSettings(next);
                  }}
                />
              </label>
              <div className="badge-size-preview-row compact-preview-row">
                <span
                  className="static-badge"
                  style={{
                    fontSize: `${Math.round(11 * settings.badgeSizeScale * 10) / 10}px`,
                    padding: `${Math.round(2 * settings.badgeSizeScale)}px ${Math.round(8 * settings.badgeSizeScale)}px`
                  }}
                >
                  {t("journalLabels")}
                </span>
                <strong>{Math.round(settings.badgeSizeScale * 100)}%</strong>
              </div>
              <div className="dataset-stat-grid compact-stat-grid">
                <div><strong>{datasetStats.total}</strong><span>数据集</span></div>
                <div><strong>{datasetStats.enabled}</strong><span>启用</span></div>
                <div><strong>{datasetStats.visible}</strong><span>显示</span></div>
                <div><strong>{datasetStats.records}</strong><span>{t("journalLabels")}</span></div>
              </div>
              {showDiagnosticsControls ? (
                <label className="compact-field" htmlFor="diagnostics-enabled">
                  <span>{t("diagnostics")}</span>
                  <span className="field-hint">默认关闭；开启后文献页悬浮框会显示“诊断”按钮。</span>
                  <select
                    id="diagnostics-enabled"
                    value={settings.diagnosticsEnabled ? "on" : "off"}
                    onChange={async (event) => {
                      const next = await updateSettings({
                        diagnosticsEnabled: event.target.value === "on"
                      });
                      setSettings(next);
                    }}
                  >
                    <option value="off">{t("close")}</option>
                    <option value="on">{t("diagnostics")}</option>
                  </select>
                </label>
              ) : null}
            </div>

            <div className="settings-section compact-action-grid">
              <label className="compact-field" htmlFor="dataset-import">
                <span>{t("datasetManagement")}</span>
                <input id="dataset-import" type="file" accept="application/json,.json" onChange={handleImportDatasets} />
              </label>
              <button className="refresh-button" onClick={() => void handleRecompute()}>
                {t("recomputeLabels")}
              </button>
              <button
                className="refresh-button secondary-button"
                onClick={() =>
                  downloadText(
                    "paper-label-datasets.json",
                    JSON.stringify(localDatasets, null, 2),
                    "application/json"
                  )
                }
              >
                {t("export")}
              </button>
            </div>

            {pendingImport ? (
              <div className="import-preview">
                <strong>待导入文件</strong>
                <span className="muted">{pendingImport.fileName}</span>
                <span className="muted">检测到 {pendingImport.datasets.length} 个数据集</span>
                {(() => {
                  const report = buildDatasetImportReport(pendingImport.datasets);
                  return (
                    <div className="import-report-grid">
                      <div>
                        <strong>{report.totalRecords}</strong>
                        <span>期刊记录</span>
                      </div>
                      <div>
                        <strong>{report.duplicateTitles}</strong>
                        <span>重复标准名</span>
                      </div>
                      <div>
                        <strong>{report.emptyIssnRecords}</strong>
                        <span>缺 ISSN</span>
                      </div>
                      <div>
                        <strong>{report.emptyAliasRecords}</strong>
                        <span>缺别名</span>
                      </div>
                    </div>
                  );
                })()}
                <div className="list compact-list">
                  {pendingImport.datasets.map((dataset) => (
                    <div key={dataset.id} className="item compact-item">
                      <strong>{dataset.name}</strong>
                      <span className="muted">
                        {dataset.version} · {dataset.records.length} 条
                      </span>
                      {localDatasets.some((item) => item.id === dataset.id) ? (
                        <span className="import-warning">将替换同编号的已有数据集</span>
                      ) : (
                        <span className="import-success">新数据集</span>
                      )}
                    </div>
                  ))}
                </div>
                {(() => {
                  const report = buildDatasetImportReport(pendingImport.datasets);
                  return report.labels.length ? (
                    <div className="ranking-group-row">
                      {report.labels.slice(0, 12).map((item) => (
                        <span key={item.label} className="ranking-group-chip">
                          {item.label} · {item.count}
                        </span>
                      ))}
                      {report.labels.length > 12 ? <span className="muted">+{report.labels.length - 12} 个标签</span> : null}
                    </div>
                  ) : null;
                })()}
                <div className="button-row-inline">
                  <button className="refresh-button" onClick={() => void handleConfirmImport()}>
                    确认导入
                  </button>
                  <button
                    className="refresh-button secondary-button"
                    onClick={() => {
                      setPendingImport(null);
                      setMessage("已取消这次导入");
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}

          </div>

          <div className="popup-card list dataset-management-card">
            <div className="item dataset-management-header">
              <strong>当前已导入数据集</strong>
              <span className="muted">共 {localDatasets.length} 个本地数据集</span>
            </div>
            <label className="label dataset-management-search-label" htmlFor="dataset-search">
              检查期刊是否已收录
            </label>
            <input
              className="dataset-management-search-input"
              id="dataset-search"
              type="search"
              value={datasetSearchKeyword}
              placeholder="输入期刊名、别名、ISSN 或期刊标签"
              onChange={(event) => setDatasetSearchKeyword(event.target.value)}
            />
            {datasetSearchKeyword.trim() ? (
              <div className="dataset-search-results dataset-management-search-results">
                <strong>找到 {datasetSearchResults.length} 条结果</strong>
                {datasetSearchResults.length === 0 ? (
                  <span className="muted">当前数据集没有匹配记录</span>
                ) : (
                  datasetSearchResults.map(({ dataset, record }) => (
                    <div key={`${dataset.id}:${record.id}`} className="dataset-search-result">
                      <div>
                        <strong>{record.canonicalTitle}</strong>
                        <span className="muted">{dataset.name}</span>
                        <span className="muted">
                          {[
                            record.issn.length ? `ISSN ${record.issn.join(" / ")}` : null,
                            record.aliases.length ? `别名 ${record.aliases.slice(0, 3).join("、")}` : null
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      <span
                        className="static-badge"
                        style={getBadgePaletteForBadge(
                          {
                            datasetId: dataset.id,
                            rankingLabel: record.rankingLabel
                          },
                          badgeStyleOverrides
                        )}
                      >
                        {record.rankingLabel}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : null}
            {datasets
              .slice()
              .sort((left, right) => {
                const leftOrder = preference.configs.find((item) => item.datasetId === left.id)?.order ?? 0;
                const rightOrder = preference.configs.find((item) => item.datasetId === right.id)?.order ?? 0;
                return leftOrder - rightOrder;
              })
              .map((dataset) => {
                const config = preference.configs.find((item) => item.datasetId === dataset.id);
                const isExpanded = expandedDatasetIds.includes(dataset.id);
                const previewTitles = dataset.records.slice(0, isExpanded ? 20 : 3).map((record) => record.canonicalTitle);
                const rankingGroups = Array.from(
                  dataset.records.reduce((groups, record) => {
                    groups.set(record.rankingLabel, (groups.get(record.rankingLabel) ?? 0) + 1);
                    return groups;
                  }, new Map<string, number>())
                ).sort((left, right) => right[1] - left[1]);

                return (
                  <div key={dataset.id} className="item dataset-card">
                    <div className="dataset-card-heading">
                      <div>
                        <strong>{dataset.name}</strong>
                        <span className="muted">
                          {dataset.version} · {dataset.records.length} 条
                        </span>
                      </div>
                      <span className="dataset-source-chip">{dataset.sourceType === "local" ? "本地" : dataset.sourceType}</span>
                    </div>
                    <span className="muted dataset-description">{dataset.description ?? "无说明"}</span>

                    <div className="ranking-group-row" title="此数据集内各期刊标签的期刊数量">
                      {rankingGroups.slice(0, 8).map(([label, count]) => (
                        <span
                          key={`${dataset.id}:${label}`}
                          className="ranking-group-chip"
                          style={getBadgePaletteForBadge(
                            { datasetId: dataset.id, rankingLabel: label },
                            badgeStyleOverrides
                          )}
                        >
                          {label} · {count}
                        </span>
                      ))}
                      {rankingGroups.length > 8 ? <span className="muted">+{rankingGroups.length - 8}个标签</span> : null}
                    </div>

                    <div className="dataset-toggle-row">
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={config?.enabled ?? true}
                          onChange={async (event) => {
                            const enabled = event.target.checked;
                            const next = await updateDatasetPreference(dataset.id, {
                              enabled
                            });
                            setPreference(next);
                            setMessage(`${enabled ? "已启用" : "已停用"}数据集：${dataset.name}`);
                          }}
                        />
                        启用
                      </label>

                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={config?.visible ?? true}
                          onChange={async (event) => {
                            const visible = event.target.checked;
                            const next = await updateDatasetPreference(dataset.id, {
                              visible
                            });
                            setPreference(next);
                            setMessage(`${visible ? "页面会显示" : "页面会隐藏"}数据集标签：${dataset.name}`);
                          }}
                        />
                        页面显示
                      </label>
                    </div>

                    <div className="button-row-inline compact-actions">
                      <button
                        className="refresh-button secondary-button"
                        onClick={async () => {
                          const next = await moveDatasetPreference(dataset.id, "up");
                          setPreference(next);
                        }}
                      >
                        上移
                      </button>
                      <button
                        className="refresh-button secondary-button"
                        onClick={async () => {
                          const next = await moveDatasetPreference(dataset.id, "down");
                          setPreference(next);
                        }}
                      >
                        下移
                      </button>
                    </div>

                    <div className="dataset-preview">
                      <span className="muted">示例期刊：</span>
                      <div className="dataset-preview-titles">
                        {previewTitles.map((title) => (
                          <span key={`${dataset.id}:${title}`} className="dataset-preview-pill">
                            {title}
                          </span>
                        ))}
                      </div>
                      {dataset.records.length > 3 ? (
                        <button
                          className="inline-link-button"
                          onClick={() =>
                            setExpandedDatasetIds((current) =>
                              current.includes(dataset.id)
                                ? current.filter((item) => item !== dataset.id)
                                : [...current, dataset.id]
                            )
                          }
                        >
                          {isExpanded ? "收起期刊明细" : `展开期刊明细（共 ${dataset.records.length} 条）`}
                        </button>
                      ) : null}
                    </div>

                    {dataset.sourceType === "local" ? (
                      <button
                        className="refresh-button secondary-button"
                        onClick={async () => {
                          const confirmed = window.confirm(`确定删除本地数据集“${dataset.name}”吗？已收藏文献不会删除，但需要重新批量更新期刊标签。`);
                          if (!confirmed) {
                            return;
                          }
                          await deleteLocalDataset(dataset.id);
                          await refreshAll();
                          setMessage(`已删除本地数据集：${dataset.name}`);
                        }}
                      >
                        删除本地数据集
                      </button>
                    ) : null}
                  </div>
                );
              })}
          </div>

          <div className="popup-card list">
            <div className="eyebrow">Badge Colors</div>
            <h2>标签颜色自定义</h2>
            <p className="muted">优先按“体系 + 标签”生效；如果你以前改过同名标签颜色，也会继续作为回退颜色。</p>
            <div className="badge-color-toolbar">
              <input
                value={badgeColorSearch}
                onChange={(event) => setBadgeColorSearch(event.target.value)}
                placeholder="搜索标签、数据集或体系"
              />
              <span className="muted">
                {filteredBadgeColorEntries.length} / {uniqueBadgeEntries.length} 个标签
              </span>
            </div>
            <div className="badge-color-grid">
              {filteredBadgeColorEntries.map((badgeEntry) => {
                const style = getBadgePaletteForBadge(badgeEntry, badgeStyleOverrides);
                const isCustomized = Boolean(badgeStyleOverrides[badgeEntry.key]);

                return (
                  <div key={badgeEntry.key} className="item badge-color-card">
                    <div className="badge-style-header">
                      <span className="static-badge" style={style}>
                        {badgeEntry.rankingLabel}
                      </span>
                      {isCustomized ? <span className="muted">已自定义</span> : <span className="muted">默认颜色</span>}
                    </div>
                    <span className="muted">{badgeEntry.datasetName}</span>

                    <div className="badge-preview-strip">
                      <span className="static-badge" style={style}>
                        预览效果
                      </span>
                    </div>

                    <div className="button-row-inline compact-color-grid">
                      <label className="color-field">
                        背景色
                        <input
                          type="color"
                          value={style.background}
                          onChange={async (event) => {
                            const next = await updateBadgeStyleOverride(badgeEntry.key, {
                              background: event.target.value
                            });
                            setBadgeStyleOverrides(next);
                          }}
                        />
                      </label>

                      <label className="color-field">
                        文字色
                        <input
                          type="color"
                          value={style.color}
                          onChange={async (event) => {
                            const next = await updateBadgeStyleOverride(badgeEntry.key, {
                              color: event.target.value
                            });
                            setBadgeStyleOverrides(next);
                          }}
                        />
                      </label>
                    </div>

                    <button
                      className="refresh-button secondary-button compact-reset-button"
                      onClick={async () => {
                        const next = await deleteBadgeStyleOverride(badgeEntry.key);
                        setBadgeStyleOverrides(next);
                      }}
                    >
                      恢复默认颜色
                    </button>
                  </div>
                );
              })}
            </div>
            {filteredBadgeColorEntries.length === 0 ? <div className="muted badge-empty-state">没有匹配的期刊标签。</div> : null}
          </div>
        </>
      )}
    </div>
  );
}
