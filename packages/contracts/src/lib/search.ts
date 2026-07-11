import { z } from "zod";

export const FullTextSearchTargetSchema = z.object({
  doi: z.string().optional(),
  title: z.string(),
  url: z.string().optional()
});

export const SearchProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseUrl: z.string().url(),
  queryTemplate: z.string(),
  allowedDomains: z.array(z.string()).default([]),
  requiresAuth: z.boolean().default(false),
  supportsProgrammaticDownload: z.boolean().default(false),
  status: z.enum(["active", "disabled"]).default("active")
});

export type FullTextSearchTarget = z.infer<typeof FullTextSearchTargetSchema>;
export type SearchProvider = z.infer<typeof SearchProviderSchema>;
