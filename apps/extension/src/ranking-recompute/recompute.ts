import type { ActiveDatasetConfig, DocumentRecord, RankingDataset } from "@scholartag/contracts";
import { withUpdatedDocument } from "../library-model/document";
import { resolveRankingBadges } from "../ranking-engine/resolve-badges";

export function recomputeDocumentRanking(
  document: DocumentRecord,
  datasets: RankingDataset[],
  activeConfigs?: ActiveDatasetConfig[]
) {
  return withUpdatedDocument(document, {
    rankingBadges: resolveRankingBadges(document, datasets, {
      activeConfigs
    })
  });
}

export function recomputeAllDocumentRankings(
  documents: DocumentRecord[],
  datasets: RankingDataset[],
  activeConfigs?: ActiveDatasetConfig[]
) {
  return documents.map((document) => recomputeDocumentRanking(document, datasets, activeConfigs));
}
