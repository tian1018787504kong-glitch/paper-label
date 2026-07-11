import type { DocumentRecord } from "@paper-label/contracts";

export type SupportedSite = "google-scholar" | "baidu-scholar" | "pubmed" | "cnki" | "sciencedirect" | "generic";

export function detectSite(hostname: string): SupportedSite {
  if (hostname.includes("scholar.google.com")) return "google-scholar";
  if (hostname.includes("xueshu.baidu.com")) return "baidu-scholar";
  if (hostname.includes("pubmed.ncbi.nlm.nih.gov")) return "pubmed";
  if (hostname.includes("cnki.net")) return "cnki";
  if (hostname.includes("sciencedirect.com")) return "sciencedirect";
  return "generic";
}

function textFrom(document: Document, selectors: string[]) {
  for (const selector of selectors) {
    const value =
      document.querySelector(selector)?.textContent?.trim() ??
      document.querySelector(selector)?.getAttribute("content")?.trim();
    if (value) {
      return value;
    }
  }
  return "";
}

export function detectDocumentFromPage(document: Document, site: SupportedSite): DocumentRecord {
  const title = textFrom(document, [
    'meta[name="citation_title"]',
    "h1",
    "title"
  ]);
  const journal = textFrom(document, [
    'meta[name="citation_journal_title"]',
    ".journal-actions-trigger",
    ".doc-title"
  ]);
  const doi = textFrom(document, [
    'meta[name="citation_doi"]',
    'meta[name="dc.identifier"]'
  ]);
  const url = location.href;

  return {
    id: `${site}:${doi || title || url}`,
    title: title || document.title,
    authors: [],
    year: undefined,
    journal: journal || site,
    doi: doi || undefined,
    url,
    folderIds: ["inbox"],
    tags: [],
    notes: [],
    rankingBadges: [],
    updatedAt: new Date().toISOString(),
    version: 1,
    deletedAt: null
  };
}
