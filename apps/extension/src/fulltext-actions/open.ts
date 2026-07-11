import browser from "webextension-polyfill";
import type { FullTextSearchTarget, SearchProvider } from "@paper-label/contracts";
import { buildFullTextProviderUrl } from "../fulltext-url-builder/build";

export async function openFullTextProvider(provider: SearchProvider, target: FullTextSearchTarget) {
  const url = buildFullTextProviderUrl(provider, target);
  await browser.tabs.create({ url });
  return url;
}
