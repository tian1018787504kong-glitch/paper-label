import type { DocumentRecord } from "@scholartag/contracts";

export type LibrarySortMode = "updatedAt" | "title" | "year";

export function queryDocuments(documents: DocumentRecord[], keyword: string, sortMode: LibrarySortMode) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  const filtered = normalizedKeyword
    ? documents.filter((document) => {
        const haystack = [
          document.title,
          document.journal ?? "",
          document.doi ?? "",
          document.authors.join(" "),
          document.tags.join(" "),
          document.folderIds.join(" ")
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedKeyword);
      })
    : documents;

  return [...filtered].sort((left, right) => {
    if (sortMode === "title") {
      return left.title.localeCompare(right.title);
    }

    if (sortMode === "year") {
      return (right.year ?? 0) - (left.year ?? 0);
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}
