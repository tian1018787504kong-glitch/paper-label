import browser from "webextension-polyfill";
import type { DatasetPreference, DocumentRecord, RankingDataset, SearchProvider } from "@paper-label/contracts";
import type { BadgeStyleOverrides } from "../ranking-badges/style";
import { mergeDatasetPreference } from "../ranking-datasets/preferences";
import { withUpdatedDocument } from "../library-model/document";
import { getDefaultFullTextProviders } from "../fulltext-providers/defaults";
import { AUTO_FULLTEXT_PROVIDER_ID } from "../fulltext-providers/resolve";
import type { AppLanguage } from "../i18n/messages";

const DOCUMENTS_KEY = "documents";
const SETTINGS_KEY = "settings";
const LOCAL_DATASETS_KEY = "localDatasets";
const DATASET_PREFERENCES_KEY = "datasetPreferences";
const BADGE_STYLE_OVERRIDES_KEY = "badgeStyleOverrides";

export type Settings = {
  language: AppLanguage;
  defaultSearchProvider: string;
  defaultDownloadProvider: string;
  badgeSizeScale: number;
  diagnosticsEnabled: boolean;
  folderLabels: Record<string, string>;
  customFolders: string[];
  customSearchProviders: SearchProvider[];
  customDownloadProviders: SearchProvider[];
};

const defaultSettings: Settings = {
  language: "auto",
  defaultSearchProvider: AUTO_FULLTEXT_PROVIDER_ID,
  defaultDownloadProvider: "doi-resolver",
  badgeSizeScale: 1,
  diagnosticsEnabled: false,
  folderLabels: {},
  customFolders: [],
  customSearchProviders: [],
  customDownloadProviders: []
};

export async function getDocuments(): Promise<DocumentRecord[]> {
  const stored = await browser.storage.local.get(DOCUMENTS_KEY);
  const documents = (stored[DOCUMENTS_KEY] as DocumentRecord[] | undefined) ?? [];
  return documents.map(normalizeDocumentRecord);
}

export async function getDocumentById(documentId: string) {
  const documents = await getDocuments();
  return documents.find((item) => item.id === documentId) ?? null;
}

export async function saveDocument(document: DocumentRecord) {
  const documents = await getDocuments();
  const existing = documents.find((item) => item.id === document.id);
  const nextDocument = existing
    ? withUpdatedDocument(existing, {
        ...document,
        rankingBadges: document.rankingBadges,
        deletedAt: null
      })
    : normalizeDocumentRecord(document);
  const nextDocuments = [nextDocument, ...documents.filter((item) => item.id !== document.id)];
  await browser.storage.local.set({
    [DOCUMENTS_KEY]: nextDocuments
  });
}

export async function replaceDocuments(documents: DocumentRecord[]) {
  await browser.storage.local.set({
    [DOCUMENTS_KEY]: documents.map(normalizeDocumentRecord)
  });
}

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  const merged = {
    ...defaultSettings,
    ...((stored[SETTINGS_KEY] as Settings | undefined) ?? {})
  };
  if (merged.defaultSearchProvider === "google-scholar" && !(stored[SETTINGS_KEY] as Settings | undefined)?.customSearchProviders?.length) {
    return {
      ...merged,
      defaultSearchProvider: AUTO_FULLTEXT_PROVIDER_ID
    };
  }
  return merged;
}

export async function updateSettings(patch: Partial<Settings>) {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await browser.storage.local.set({
    [SETTINGS_KEY]: next
  });
  return next;
}

export async function getFullTextProviders() {
  const settings = await getSettings();
  return [...getDefaultFullTextProviders(), ...settings.customSearchProviders.filter((provider) => provider.status === "active")];
}

export async function getFullTextDownloadProviders() {
  const settings = await getSettings();
  return [...getDefaultFullTextProviders(), ...settings.customDownloadProviders.filter((provider) => provider.status === "active")];
}

export async function updateDocument(documentId: string, patch: Partial<DocumentRecord>) {
  const documents = await getDocuments();
  const nextDocuments = documents.map((item) =>
    item.id === documentId ? withUpdatedDocument(item, patch) : item
  );
  await replaceDocuments(nextDocuments);
  return nextDocuments.find((item) => item.id === documentId) ?? null;
}

export async function deleteDocument(documentId: string) {
  const documents = await getDocuments();
  const nextDocuments = documents.filter((item) => item.id !== documentId);
  await browser.storage.local.set({
    [DOCUMENTS_KEY]: nextDocuments
  });
  return nextDocuments;
}

export async function toggleDocumentSaved(document: DocumentRecord) {
  const existing = await getDocumentById(document.id);
  if (existing) {
    await deleteDocument(document.id);
    return { saved: false, document: null };
  }

  await saveDocument(document);
  return { saved: true, document };
}

export async function getLocalDatasets(): Promise<RankingDataset[]> {
  const stored = await browser.storage.local.get(LOCAL_DATASETS_KEY);
  return ((stored[LOCAL_DATASETS_KEY] as RankingDataset[] | undefined) ?? []).map((dataset) => ({
    ...dataset,
    sourceType: "local"
  }));
}

export async function saveLocalDataset(dataset: RankingDataset) {
  const datasets = await getLocalDatasets();
  const nextDatasets = [
    { ...dataset, sourceType: "local" as const },
    ...datasets.filter((item) => item.id !== dataset.id)
  ];
  await browser.storage.local.set({
    [LOCAL_DATASETS_KEY]: nextDatasets
  });
  return nextDatasets;
}

export async function deleteLocalDataset(datasetId: string) {
  const datasets = await getLocalDatasets();
  const nextDatasets = datasets.filter((item) => item.id !== datasetId);
  await browser.storage.local.set({
    [LOCAL_DATASETS_KEY]: nextDatasets
  });
  return nextDatasets;
}

export async function getDatasetPreferences(): Promise<DatasetPreference> {
  const stored = await browser.storage.local.get(DATASET_PREFERENCES_KEY);
  const localDatasets = await getLocalDatasets();
  return mergeDatasetPreference(
    localDatasets,
    (stored[DATASET_PREFERENCES_KEY] as DatasetPreference | undefined) ?? null
  );
}

export async function updateDatasetPreference(
  datasetId: string,
  patch: Partial<DatasetPreference["configs"][number]>
) {
  const current = await getDatasetPreferences();
  const nextConfigs = current.configs.map((config) =>
    config.datasetId === datasetId ? { ...config, ...patch } : config
  );
  const next = { configs: nextConfigs };
  await browser.storage.local.set({
    [DATASET_PREFERENCES_KEY]: next
  });
  return next;
}

export async function getBadgeStyleOverrides(): Promise<BadgeStyleOverrides> {
  const stored = await browser.storage.local.get(BADGE_STYLE_OVERRIDES_KEY);
  return (stored[BADGE_STYLE_OVERRIDES_KEY] as BadgeStyleOverrides | undefined) ?? {};
}

export async function updateBadgeStyleOverride(
  label: string,
  patch: Partial<BadgeStyleOverrides[string]>
) {
  const current = await getBadgeStyleOverrides();
  const base = current[label] ?? {
    background: "#ffd9df",
    color: "#7e1730"
  };
  const next = {
    ...current,
    [label]: {
      ...base,
      ...patch
    }
  };
  await browser.storage.local.set({
    [BADGE_STYLE_OVERRIDES_KEY]: next
  });
  return next;
}

export async function deleteBadgeStyleOverride(label: string) {
  const current = await getBadgeStyleOverrides();
  const next = { ...current };
  delete next[label];
  await browser.storage.local.set({
    [BADGE_STYLE_OVERRIDES_KEY]: next
  });
  return next;
}

export async function moveDatasetPreference(datasetId: string, direction: "up" | "down") {
  const current = await getDatasetPreferences();
  const configs = [...current.configs].sort((left, right) => left.order - right.order);
  const currentIndex = configs.findIndex((config) => config.datasetId === datasetId);
  const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0 || swapIndex < 0 || swapIndex >= configs.length) {
    return current;
  }

  const [left, right] = [configs[currentIndex], configs[swapIndex]];
  configs[currentIndex] = { ...right, order: currentIndex };
  configs[swapIndex] = { ...left, order: swapIndex };

  const next = { configs };
  await browser.storage.local.set({
    [DATASET_PREFERENCES_KEY]: next
  });
  return next;
}

function normalizeDocumentRecord(document: DocumentRecord): DocumentRecord {
  const title = normalizeLegacyTitle(document.title ?? "");
  const authors = normalizeLegacyAuthors(document.authors ?? [], title, document.year);
  const rankingBadges = dedupeBadgesByLabel(document.rankingBadges ?? []);

  return {
    ...document,
    title,
    itemType: document.itemType ?? "journalArticle",
    authors,
    publisher: document.publisher ?? undefined,
    volume: document.volume ?? undefined,
    issue: document.issue ?? undefined,
    pages: document.pages ?? undefined,
    abstractNote: document.abstractNote ?? undefined,
    folderIds: document.folderIds?.length ? document.folderIds : ["inbox"],
    tags: document.tags ?? [],
    notes: document.notes ?? [],
    rankingBadges,
    updatedAt: document.updatedAt ?? new Date().toISOString(),
    version: document.version ?? 1,
    deletedAt: document.deletedAt ?? null
  };
}

function normalizeLegacyTitle(title: string) {
  return title
    .replace(/\s+-\s+[^-]{2,180},\s*(19|20)\d{2}$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLegacyAuthors(authors: string[], title: string, year?: number | null) {
  const ignoredPattern =
    /^(all authors?|author information|authors? info|view author|view all authors?|view all publications.*|corresponding author|cite this article|similar articles?)$/i;
  const organizationPattern =
    /(university|college|school|academy|institute|department|hospital|laboratory|centre|center|faculty|商学院|学院|大学|研究院|研究所|医院|实验室|中心)/i;
  const yearText = year ? String(year) : "";

  return Array.from(
    new Set(
      authors
        .flatMap((author) => author.split(/[;；\n]+/))
        .map((author) =>
          author
            .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "")
            .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "")
            .replace(/^\d+\s*[.)、-]?\s*/g, "")
            .replace(/\d+$/g, "")
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter((author) => {
          if (!author || author.length > 80) return false;
          if (ignoredPattern.test(author) || organizationPattern.test(author)) return false;
          if (author.includes("@")) return false;
          if (author === title || (yearText && author === yearText)) return false;
          return true;
        })
    )
  ).slice(0, 20);
}

function dedupeBadgesByLabel(badges: DocumentRecord["rankingBadges"]) {
  const seen = new Set<string>();
  return (badges ?? []).filter((badge) => {
    const key = badge.rankingLabel.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
