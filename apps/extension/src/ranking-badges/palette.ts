import type { RankingBadgeSnapshot } from "@scholartag/contracts";
import { createBadgeStyleOverrideKey, type BadgeStyle, type BadgeStyleOverrides } from "./style";

const palette = [
  { background: "#fdd4d8", color: "#7a1629" },
  { background: "#d4f4ef", color: "#125a4f" },
  { background: "#f6e3b4", color: "#6e4b00" },
  { background: "#dbe4ff", color: "#1f3b82" },
  { background: "#eadbff", color: "#52228f" }
];

const fixedLabelPalette: Array<{ match: RegExp; style: BadgeStyle }> = [
  { match: /(a\+|测试a\+)/i, style: { background: "#ffd9df", color: "#7e1730" } },
  { match: /(a-|a|测试a$|测试a[^+])/i, style: { background: "#d8f4ee", color: "#116357" } },
  { match: /(b\+|测试b\+)/i, style: { background: "#dfe7ff", color: "#22408a" } },
  { match: /(b-|b|测试b$|测试b[^+])/i, style: { background: "#f6e3b4", color: "#6d5200" } },
  { match: /cssci/i, style: { background: "#ffd8dd", color: "#8a1f37" } },
  { match: /北大|核心/i, style: { background: "#ffd8dd", color: "#8a1f37" } },
  { match: /swufe/i, style: { background: "#d7f0fb", color: "#0d6283" } },
  { match: /可识别/i, style: { background: "#eef2f7", color: "#66758a" } }
];

function hash(input: string) {
  return Array.from(input).reduce((total, current) => total + current.charCodeAt(0), 0);
}

export function getBadgePalette(seed: string) {
  return palette[hash(seed) % palette.length];
}

export function getBadgePaletteByLabel(label: string, fallbackSeed: string, overrides?: BadgeStyleOverrides) {
  const customized = overrides?.[label];
  if (customized) {
    return customized;
  }
  const fixed = fixedLabelPalette.find((item) => item.match.test(label));
  return fixed?.style ?? getBadgePalette(fallbackSeed);
}

export function getBadgePaletteForBadge(
  badge: Pick<RankingBadgeSnapshot, "datasetId" | "rankingLabel">,
  overrides?: BadgeStyleOverrides
) {
  const overrideKey = createBadgeStyleOverrideKey(badge);
  return getBadgePaletteByLabel(badge.rankingLabel, `${badge.datasetId}:${badge.rankingLabel}`, {
    ...(overrides?.[badge.rankingLabel] ? { [badge.rankingLabel]: overrides[badge.rankingLabel] } : {}),
    ...(overrides?.[overrideKey] ? { [overrideKey]: overrides[overrideKey] } : {})
  });
}
