import { z } from "zod";
import { RankingBadgeSnapshotSchema } from "./ranking.js";

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  itemType: z.string().nullable().optional(),
  authors: z.array(z.string()).default([]),
  year: z.number().int().nullable().optional(),
  journal: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  volume: z.string().nullable().optional(),
  issue: z.string().nullable().optional(),
  pages: z.string().nullable().optional(),
  doi: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  abstractNote: z.string().nullable().optional(),
  folderIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  rankingBadges: z.array(RankingBadgeSnapshotSchema).default([]),
  updatedAt: z.string(),
  version: z.number().int().nonnegative(),
  deletedAt: z.string().nullable().optional()
});

export type DocumentRecord = z.infer<typeof DocumentSchema>;
