import type { DocumentRecord, RankingBadgeSnapshot } from "@paper-label/contracts";

export type DraftDocumentInput = {
  id: string;
  title: string;
  itemType?: string | null;
  authors?: string[];
  year?: number | null;
  journal?: string | null;
  publisher?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
  abstractNote?: string | null;
  folderIds?: string[];
  tags?: string[];
  notes?: string[];
  rankingBadges?: RankingBadgeSnapshot[];
};

export function createDocumentRecord(input: DraftDocumentInput): DocumentRecord {
  return {
    id: input.id,
    title: input.title.trim(),
    itemType: input.itemType ?? "journalArticle",
    authors: input.authors ?? [],
    year: input.year ?? undefined,
    journal: input.journal ?? undefined,
    publisher: input.publisher ?? undefined,
    volume: input.volume ?? undefined,
    issue: input.issue ?? undefined,
    pages: input.pages ?? undefined,
    doi: input.doi ?? undefined,
    url: input.url ?? undefined,
    abstractNote: input.abstractNote ?? undefined,
    folderIds: input.folderIds?.length ? input.folderIds : ["inbox"],
    tags: input.tags ?? [],
    notes: input.notes ?? [],
    rankingBadges: input.rankingBadges ?? [],
    updatedAt: new Date().toISOString(),
    version: 1,
    deletedAt: null
  };
}

export function withUpdatedDocument(
  current: DocumentRecord,
  patch: Partial<Omit<DocumentRecord, "id" | "updatedAt" | "version">>
): DocumentRecord {
  return {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    version: current.version + 1
  };
}
