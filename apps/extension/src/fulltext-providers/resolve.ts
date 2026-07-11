import type { FullTextSearchTarget, SearchProvider } from "@paper-label/contracts";

export const AUTO_FULLTEXT_PROVIDER_ID = "auto-language";

export function containsCjkText(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

export function resolveFullTextProvider(
  providers: SearchProvider[],
  preferredProviderId: string | undefined,
  target: FullTextSearchTarget
) {
  if (preferredProviderId && preferredProviderId !== AUTO_FULLTEXT_PROVIDER_ID) {
    const preferred = providers.find((item) => item.id === preferredProviderId);
    if (preferred) {
      return preferred;
    }
  }

  const textForLanguage = `${target.title} ${target.doi ?? ""} ${target.url ?? ""}`;
  const automaticProviderId = containsCjkText(textForLanguage) ? "cnki" : "google-scholar";
  return providers.find((item) => item.id === automaticProviderId) ?? providers[0] ?? null;
}
