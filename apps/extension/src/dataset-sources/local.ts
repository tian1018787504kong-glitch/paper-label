import type { RankingDataset } from "@scholartag/contracts";
import { getLocalDatasets } from "../storage/local-store";

export async function getImportedLocalDatasets(): Promise<RankingDataset[]> {
  return getLocalDatasets();
}
