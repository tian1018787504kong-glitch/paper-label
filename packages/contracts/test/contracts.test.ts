import { describe, expect, it } from "vitest";
import { DocumentSchema, RankingDatasetSchema, SearchProviderSchema } from "../src";

describe("public open-source contracts", () => {
  it("parses local ranking datasets", () => {
    const dataset = RankingDatasetSchema.parse({
      id: "local-demo",
      name: "Local Demo",
      version: "2026.07",
      records: [
        {
          id: "nature",
          source: "local",
          title: "Nature",
          canonicalTitle: "Nature",
          rankingLabel: "A+",
          version: "2026.07"
        }
      ]
    });

    expect(dataset.sourceType).toBe("local");
  });

  it("parses local document records", () => {
    const document = DocumentSchema.parse({
      id: "doc-1",
      title: "Example article",
      updatedAt: new Date(0).toISOString(),
      version: 1
    });

    expect(document.authors).toEqual([]);
  });

  it("parses lawful full-text search providers", () => {
    const provider = SearchProviderSchema.parse({
      id: "doi",
      name: "DOI Resolver",
      baseUrl: "https://doi.org",
      queryTemplate: "/{query}"
    });

    expect(provider.supportsProgrammaticDownload).toBe(false);
  });
});
