import { baiduScholarAdapter } from "../site-adapters/baidu-scholar";
import { cnkiAdapter } from "../site-adapters/cnki";
import { genericAdapter, hasScholarlySignals } from "../site-adapters/generic";
import { googleScholarAdapter } from "../site-adapters/google-scholar";
import { pubmedAdapter } from "../site-adapters/pubmed";
import { publisherDetailAdapter } from "../site-adapters/publisher-detail";
import { scienceDirectAdapter } from "../site-adapters/sciencedirect";
import type { SiteAdapter, SiteDocumentEntry } from "../site-adapters/types";

const adapters: SiteAdapter[] = [
  googleScholarAdapter,
  baiduScholarAdapter,
  pubmedAdapter,
  cnkiAdapter,
  scienceDirectAdapter,
  publisherDetailAdapter,
  genericAdapter
];

const specificAdapters = adapters.filter((adapter) => adapter.id !== "generic");

export function resolveSiteAdapter(hostname: string) {
  return adapters.find((adapter) => adapter.matches(hostname)) ?? genericAdapter;
}

export function shouldAttemptSiteCollection(hostname: string, root: Document) {
  return specificAdapters.some((adapter) => adapter.matches(hostname)) || hasScholarlySignals(root);
}

export function collectSiteEntries(
  root: Document,
  context?: {
    hostname?: string;
    url?: string;
    pageTitle?: string;
  }
): SiteDocumentEntry[] {
  const adapter = resolveSiteAdapter(context?.hostname ?? location.hostname);
  const entries = adapter.collectEntries(root, context);
  if (entries.length > 0 || adapter.id === "generic") {
    return entries;
  }
  return genericAdapter.collectEntries(root, context);
}
