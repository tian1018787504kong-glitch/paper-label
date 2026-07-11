import type { RankingDataset } from "@scholartag/contracts";

export const sampleRankingDataset: RankingDataset = {
  id: "demo-ranking",
  name: "Sample Open Ranking",
  sourceType: "official",
  version: "2026.06",
  records: [
    {
      id: "nips",
      source: "demo",
      title: "NeurIPS",
      canonicalTitle: "Advances in Neural Information Processing Systems",
      aliases: ["NeurIPS", "NIPS"],
      issn: [],
      doi: [],
      rankingLabel: "A",
      score: 95,
      version: "2026.06"
    },
    {
      id: "nature",
      source: "demo",
      title: "Nature",
      canonicalTitle: "Nature",
      aliases: [],
      issn: ["0028-0836"],
      doi: [],
      rankingLabel: "A+",
      score: 100,
      version: "2026.06"
    }
  ]
};
