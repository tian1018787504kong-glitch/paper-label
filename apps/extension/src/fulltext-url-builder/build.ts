import type { FullTextSearchTarget, SearchProvider } from "@scholartag/contracts";

export function buildFullTextProviderUrl(provider: SearchProvider, target: FullTextSearchTarget) {
  const queryValue =
    provider.id === "doi-resolver" && target.doi?.trim()
      ? target.doi.trim()
      : target.doi?.trim() || target.title.trim();

  return `${provider.baseUrl}${provider.queryTemplate.replace("{query}", encodeURIComponent(queryValue))}`;
}
