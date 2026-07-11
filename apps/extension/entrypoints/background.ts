import browser from "webextension-polyfill";
import type { SearchProvider } from "@paper-label/contracts";
import { defineBackground } from "wxt/utils/define-background";
import { buildFullTextProviderUrl } from "../src/fulltext-url-builder/build";
import { resolveFullTextProvider } from "../src/fulltext-providers/resolve";
import {
  getDocumentById,
  getFullTextDownloadProviders,
  getFullTextProviders,
  getSettings,
  saveDocument,
  toggleDocumentSaved
} from "../src/storage/local-store";

type RuntimeMessage =
  | { type: "scholartag:save-document"; payload: Parameters<typeof saveDocument>[0] }
  | { type: "scholartag:toggle-document"; payload: Parameters<typeof saveDocument>[0] }
  | { type: "scholartag:get-document-state"; payload: { documentId: string } }
  | { type: "scholartag:get-providers" };

const CONTENT_SCRIPT_FILE = "content-scripts/content.js";

const SCHOLAR_HOST_MATCHES = [
  "scholar.google.com",
  "xueshu.baidu.com",
  "pubmed.ncbi.nlm.nih.gov",
  "kns.cnki.net",
  "sciencedirect.com",
  "springer.com",
  "onlinelibrary.wiley.com",
  "ieeexplore.ieee.org",
  "dl.acm.org",
  "webofscience.com",
  "scopus.com",
  "tandfonline.com",
  "nature.com",
  "cell.com",
  "arxiv.org",
  "science.org",
  "pubs.acs.org",
  "pubs.aip.org",
  "iopscience.iop.org",
  "royalsocietypublishing.org",
  "mdpi.com",
  "frontiersin.org",
  "plos.org",
  "academic.oup.com",
  "cambridge.org",
  "sagepub.com",
  "emerald.com",
  "jstor.org",
  "biorxiv.org",
  "medrxiv.org",
  "pnas.org",
  "journals.asm.org"
];

function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return typeof value === "object" && value !== null && "type" in value;
}

function isScholarPageUrl(url: string | undefined) {
  if (!url) {
    return false;
  }

  try {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:") {
      return false;
    }
    return SCHOLAR_HOST_MATCHES.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await browser.contextMenus.create({
      id: "scholartag-search-fulltext",
      title: "paper-label 查找全文",
      contexts: ["page", "selection"]
    });
    await browser.contextMenus.create({
      id: "scholartag-download-fulltext",
      title: "paper-label 下载全文",
      contexts: ["page", "selection"]
    });
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !isScholarPageUrl(tab.url)) {
      return;
    }

    void browser.scripting
      .executeScript({
        target: { tabId },
        files: [CONTENT_SCRIPT_FILE]
      })
      .catch(() => {
        // Some pages intentionally block extension injection or are already gone.
        // Keep this silent so a blocked publisher page never creates a retry loop.
      });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) {
      return;
    }

    if (info.menuItemId === "scholartag-search-fulltext" || info.menuItemId === "scholartag-download-fulltext") {
      const [{ result }] = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const title = document.title;
          const doiMeta =
            document.querySelector('meta[name="citation_doi"]')?.getAttribute("content") ??
            document.querySelector('meta[name="dc.identifier"]')?.getAttribute("content") ??
            "";

          return {
            title,
            doi: doiMeta || undefined
          };
        }
      });

      const settings = await getSettings();
      const isDownload = info.menuItemId === "scholartag-download-fulltext";
      const candidates = isDownload ? await getFullTextDownloadProviders() : await getFullTextProviders();
      const defaultProviderId = isDownload ? settings.defaultDownloadProvider : settings.defaultSearchProvider;
      const payload = (result ?? { title: tab.title ?? "", doi: undefined }) as {
        title: string;
        doi?: string;
      };
      const provider = isDownload
        ? candidates.find((item) => item.id === defaultProviderId) ?? candidates[0]
        : resolveFullTextProvider(candidates, defaultProviderId, payload);
      if (!provider) {
        return;
      }
      const url = buildFullTextProviderUrl(provider, payload);
      await browser.tabs.create({ url });
    }
  });

  browser.runtime.onMessage.addListener(async (message: unknown) => {
    if (!isRuntimeMessage(message)) {
      return undefined;
    }

    if (message.type === "scholartag:save-document") {
      await saveDocument(message.payload);
      return { ok: true };
    }

    if (message.type === "scholartag:toggle-document") {
      return toggleDocumentSaved(message.payload);
    }

    if (message.type === "scholartag:get-document-state") {
      const document = await getDocumentById(message.payload.documentId);
      return {
        saved: Boolean(document)
      };
    }

    if (message.type === "scholartag:get-providers") {
      return {
        providers: (await getFullTextProviders()) satisfies SearchProvider[],
        downloadProviders: (await getFullTextDownloadProviders()) satisfies SearchProvider[],
        providerSource: "settings" as const
      };
    }

    return undefined;
  });
});
