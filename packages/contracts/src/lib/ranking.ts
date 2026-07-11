import { z } from "zod";

export const DatasetSourceTypeSchema = z.enum(["official", "local"]);

export const RankingMatchFieldSchema = z.enum(["doi", "issn", "journal", "alias", "manual"]);

export const RankingRecordSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  canonicalTitle: z.string(),
  aliases: z.array(z.string()).default([]),
  issn: z.array(z.string()).default([]),
  doi: z.array(z.string()).default([]),
  rankingLabel: z.string(),
  score: z.number().nullable().optional(),
  version: z.string()
});

export const RankingBadgeSnapshotSchema = z.object({
  datasetId: z.string(),
  datasetName: z.string(),
  datasetVersion: z.string(),
  datasetSourceType: DatasetSourceTypeSchema,
  recordId: z.string(),
  recordTitle: z.string(),
  rankingLabel: z.string(),
  score: z.number().nullable().optional(),
  matchedBy: RankingMatchFieldSchema,
  matchedValue: z.string().optional()
});

export const RankingDatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  sourceType: DatasetSourceTypeSchema.default("local"),
  version: z.string(),
  description: z.string().optional(),
  homepage: z.string().url().optional(),
  records: z.array(RankingRecordSchema)
});

export const ActiveDatasetConfigSchema = z.object({
  datasetId: z.string(),
  enabled: z.boolean().default(true),
  visible: z.boolean().default(true),
  order: z.number().int().nonnegative().default(0)
});

export const DatasetPreferenceSchema = z.object({
  configs: z.array(ActiveDatasetConfigSchema).default([])
});

export type RankingRecord = z.infer<typeof RankingRecordSchema>;
export type RankingBadgeSnapshot = z.infer<typeof RankingBadgeSnapshotSchema>;
export type RankingDataset = z.infer<typeof RankingDatasetSchema>;
export type DatasetSourceType = z.infer<typeof DatasetSourceTypeSchema>;
export type RankingMatchField = z.infer<typeof RankingMatchFieldSchema>;
export type ActiveDatasetConfig = z.infer<typeof ActiveDatasetConfigSchema>;
export type DatasetPreference = z.infer<typeof DatasetPreferenceSchema>;
