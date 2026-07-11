import type { RankingDataset } from "@scholartag/contracts";
import { getImportedLocalDatasets } from "./local";
import { getOfficialDatasets } from "./official";

export async function getAvailableDatasets(): Promise<RankingDataset[]> {
  const [officialDatasets, localDatasets] = await Promise.all([
    getOfficialDatasets(),
    getImportedLocalDatasets()
  ]);

  return [...officialDatasets, ...localDatasets];
}
