import type { FullTextSearchTarget, SearchProvider } from "@paper-label/contracts";

export function buildProviderSearchUrl(provider: SearchProvider, target: FullTextSearchTarget) {
  const query = encodeURIComponent(target.doi?.trim() || target.title.trim());
  return `${provider.baseUrl}${provider.queryTemplate.replace("{query}", query)}`;
}
