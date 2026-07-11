import type {
  ActiveDatasetConfig,
  DocumentRecord,
  RankingBadgeSnapshot,
  RankingDataset,
  RankingMatchField,
  RankingRecord
} from "@paper-label/contracts";
import { normalizeDoi, normalizeIssn, normalizeJournalText, normalizeText } from "./normalize";

type ResolveOptions = {
  manualQuery?: string;
  activeConfigs?: ActiveDatasetConfig[];
  includeTitleCandidate?: boolean;
};

const knownJournalAliasGroups = [
  [
    "pnas",
    "proceedings of the national academy of sciences",
    "proceedings of the national academy of sciences of the united states of america",
    "proc natl acad sci usa",
    "proc natl acad sci u s a",
    "proc natl acad sci"
  ]
];

function expandKnownJournalAliases(normalizedValue: string) {
  const values = new Set([normalizedValue]);
  for (const group of knownJournalAliasGroups) {
    const normalizedGroup = group.map((item) => normalizeJournalText(item)).filter(Boolean);
    if (normalizedGroup.some((alias) => alias === normalizedValue || normalizedValue.includes(alias) || alias.includes(normalizedValue))) {
      normalizedGroup.forEach((alias) => values.add(alias));
    }
  }
  return [...values];
}

function matchRecord(
  document: Pick<DocumentRecord, "journal" | "doi" | "title">,
  record: RankingRecord,
  manualQuery?: string,
  includeTitleCandidate = true
): { matchedBy: RankingMatchField; matchedValue: string } | null {
  const candidateDois = [document.doi, manualQuery].map((value) => normalizeDoi(value)).filter(Boolean);
  const recordDois = record.doi.map((value) => normalizeDoi(value)).filter(Boolean);
  if (candidateDois.some((value) => recordDois.includes(value))) {
    return {
      matchedBy: manualQuery ? "manual" : "doi",
      matchedValue: candidateDois.find((value) => recordDois.includes(value)) ?? ""
    };
  }

  const manualIssn = normalizeIssn(manualQuery);
  const recordIssn = record.issn.map((value) => normalizeIssn(value)).filter(Boolean);
  if (manualIssn && recordIssn.includes(manualIssn)) {
    return {
      matchedBy: "manual",
      matchedValue: manualIssn
    };
  }

  const candidateJournalValues = [
    document.journal,
    ...(includeTitleCandidate ? [document.title] : []),
    manualQuery
  ]
    .flatMap((value) => {
      const normalized = normalizeJournalText(value);
      if (!normalized) {
        return [];
      }

      const parts = [
        normalized,
        ...normalized
          .split(/\s>\s| - |, /)
          .map((part) => normalizeJournalText(part))
          .filter((part) => part.length >= 3)
      ];

      return parts.flatMap((part) => expandKnownJournalAliases(part));
    })
    .filter(Boolean)
    .filter((value, index, source) => source.indexOf(value) === index);

  const normalizedCanonicalTitle = normalizeJournalText(record.canonicalTitle);
  const normalizedRecordTitle = normalizeJournalText(record.title);
  const normalizedAliases = record.aliases.flatMap((alias) => expandKnownJournalAliases(normalizeJournalText(alias))).filter(Boolean);
  const normalizedRecordTargets = [normalizedCanonicalTitle, normalizedRecordTitle]
    .flatMap((value) => (value ? expandKnownJournalAliases(value) : []))
    .filter((value, index, source) => source.indexOf(value) === index);

  for (const candidate of candidateJournalValues) {
    if (normalizedRecordTargets.includes(candidate)) {
      return {
        matchedBy: manualQuery ? "manual" : "journal",
        matchedValue: candidate
      };
    }

    if (normalizedAliases.some((alias) => alias === candidate)) {
      return {
        matchedBy: manualQuery ? "manual" : "alias",
        matchedValue: candidate
      };
    }

    const fuzzyTargets = [normalizedCanonicalTitle, normalizedRecordTitle]
      .filter(Boolean)
      .filter((value) => value.length >= 8);

    if (fuzzyTargets.some((value) => value.includes(candidate) || candidate.includes(value))) {
      return {
        matchedBy: manualQuery ? "manual" : "alias",
        matchedValue: candidate
      };
    }
  }

  return null;
}

function isDatasetEnabled(datasetId: string, configs?: ActiveDatasetConfig[]) {
  const config = configs?.find((item) => item.datasetId === datasetId);
  return config?.enabled ?? true;
}

export function resolveRankingBadges(
  document: Pick<DocumentRecord, "journal" | "doi" | "title">,
  datasets: RankingDataset[],
  options?: ResolveOptions
): RankingBadgeSnapshot[] {
  const configs = options?.activeConfigs;
  const collected: RankingBadgeSnapshot[] = [];

  datasets
    .filter((dataset) => isDatasetEnabled(dataset.id, configs))
    .forEach((dataset) => {
      dataset.records.forEach((record) => {
        const match = matchRecord(document, record, options?.manualQuery, options?.includeTitleCandidate ?? true);
        if (!match) {
          return;
        }

        collected.push({
          datasetId: dataset.id,
          datasetName: dataset.name,
          datasetVersion: dataset.version,
          datasetSourceType: dataset.sourceType,
          recordId: record.id,
          recordTitle: record.canonicalTitle,
          rankingLabel: record.rankingLabel,
          score: record.score ?? undefined,
          matchedBy: match.matchedBy,
          matchedValue: match.matchedValue
        });
      });
    });

  return collected
    .filter((badge, index, collection) => {
      const key = `${badge.datasetId}:${badge.recordId}:${badge.rankingLabel}`;
      return collection.findIndex((item) => `${item.datasetId}:${item.recordId}:${item.rankingLabel}` === key) === index;
    });
}
