export type BadgeStyle = {
  background: string;
  color: string;
};

export type BadgeStyleOverrides = Record<string, BadgeStyle>;

export function createBadgeStyleOverrideKey(input: {
  datasetId: string;
  rankingLabel: string;
}) {
  return `${input.datasetId}::${input.rankingLabel}`;
}
