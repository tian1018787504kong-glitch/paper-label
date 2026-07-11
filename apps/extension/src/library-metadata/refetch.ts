import type { DocumentRecord } from "@scholartag/contracts";
import { collectSiteEntries } from "../site-registry";

function normalizeFetchedHtml(html: string, sourceUrl: string) {
  const baseTag = `<base href="${sourceUrl}">`;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  }
  return `${baseTag}${html}`;
}

export async function refetchDocumentMetadataFromUrl(document: DocumentRecord) {
  if (!document.url) {
    throw new Error("这篇文献没有 URL，无法重新抓取");
  }

  const response = await fetch(document.url, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error(`抓取失败：${response.status}`);
  }

  const html = await response.text();
  const parsed = new DOMParser().parseFromString(normalizeFetchedHtml(html, document.url), "text/html");
  const url = new URL(document.url);
  const entries = collectSiteEntries(parsed, {
    hostname: url.hostname,
    url: document.url,
    pageTitle: parsed.title || document.title
  });
  const matchedEntry = entries.find((entry) => {
    const entryDoi = entry.document.doi?.trim().toLowerCase();
    const targetDoi = document.doi?.trim().toLowerCase();
    if (entryDoi && targetDoi) {
      return entryDoi === targetDoi;
    }
    return entry.document.title.trim().toLowerCase() === document.title.trim().toLowerCase();
  });
  const nextDocument = matchedEntry?.document ?? entries[0]?.document;

  if (!nextDocument) {
    throw new Error("没有从网页提取到文献元数据");
  }

  return {
    ...document,
    title: nextDocument.title || document.title,
    itemType: nextDocument.itemType || document.itemType,
    authors: nextDocument.authors.length ? nextDocument.authors : document.authors,
    year: nextDocument.year ?? document.year,
    journal: nextDocument.journal ?? document.journal,
    publisher: nextDocument.publisher ?? document.publisher,
    volume: nextDocument.volume ?? document.volume,
    issue: nextDocument.issue ?? document.issue,
    pages: nextDocument.pages ?? document.pages,
    doi: nextDocument.doi ?? document.doi,
    url: nextDocument.url ?? document.url,
    abstractNote: nextDocument.abstractNote ?? document.abstractNote
  } satisfies DocumentRecord;
}
