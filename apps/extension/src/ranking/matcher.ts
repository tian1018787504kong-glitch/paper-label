import type { DocumentRecord, RankingRecord } from "@paper-label/contracts";

function normalize(input: string | null | undefined) {
  return (input ?? "").trim().toLowerCase();
}

export function findRanking(document: DocumentRecord, records: RankingRecord[]) {
  const journal = normalize(document.journal);
  return records.find((record) => {
    if (normalize(record.canonicalTitle) === journal) {
      return true;
    }

    if (normalize(record.title) === journal) {
      return true;
    }

    return record.aliases.some((alias) => normalize(alias) === journal);
  });
}
