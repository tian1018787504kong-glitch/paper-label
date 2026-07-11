import type { RankingDataset } from "@paper-label/contracts";
import { getLocalDatasets } from "../storage/local-store";

export async function getImportedLocalDatasets(): Promise<RankingDataset[]> {
  return getLocalDatasets();
}
