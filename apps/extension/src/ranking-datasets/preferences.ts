import type { ActiveDatasetConfig, DatasetPreference, RankingDataset } from "@paper-label/contracts";

export function buildDefaultDatasetPreference(datasets: RankingDataset[]): DatasetPreference {
  return {
    configs: datasets.map((dataset, index) => ({
      datasetId: dataset.id,
      enabled: true,
      visible: true,
      order: index
    }))
  };
}

export function mergeDatasetPreference(
  datasets: RankingDataset[],
  preference: DatasetPreference | null | undefined
): DatasetPreference {
  const defaultPreference = buildDefaultDatasetPreference(datasets);
  const currentConfigs = new Map((preference?.configs ?? []).map((config) => [config.datasetId, config]));

  return {
    configs: defaultPreference.configs.map((fallback) => ({
      ...fallback,
      ...(currentConfigs.get(fallback.datasetId) ?? {})
    }))
  };
}

export function sortDatasetConfigs(configs: ActiveDatasetConfig[]) {
  return [...configs].sort((left, right) => left.order - right.order);
}
