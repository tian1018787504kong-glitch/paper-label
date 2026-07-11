import {
  createEntry,
  extractAbstractCandidate,
  extractIssueCandidate,
  extractPagesCandidate,
  extractPublisherCandidate,
  extractVolumeCandidate,
  parseYear,
  pickTitleNode,
  queryMeta,
  splitAuthors
} from "./helpers";
import { parsePubMedSearchJournal } from "./search-source-parsers";
import type { SiteAdapter } from "./types";

export const pubmedAdapter: SiteAdapter = {
  id: "pubmed",
  matches(hostname) {
    return hostname.includes("pubmed.ncbi.nlm.nih.gov");
  },
  collectEntries(root, context) {
    const summaries = Array.from(root.querySelectorAll("article.full-docsum"));
    if (summaries.length > 0) {
      return summaries
        .map((summary, index) => {
          const titleNode = pickTitleNode(summary, ["a.docsum-title"]);
          if (!titleNode) {
            return null;
          }

          const citation = (summary.querySelector(".full-journal-citation")?.textContent ?? "").trim();
          const journal = parsePubMedSearchJournal(citation);
          return createEntry({
            siteId: "pubmed",
            anchor: titleNode,
            titleNode,
            rankingMode: "strict-source",
            title: titleNode.textContent ?? `PubMed Result ${index + 1}`,
            journal,
            url: (titleNode as HTMLAnchorElement).href,
            year: parseYear(citation)
          });
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    }

    const titleNode = pickTitleNode(root, ["h1.heading-title", "h1", "title"]);
    if (!titleNode) {
      return [];
    }

    return [
      createEntry({
        siteId: "pubmed",
        anchor: titleNode,
        titleNode,
        title: queryMeta(root, ['meta[name="citation_title"]']) || titleNode.textContent || context?.pageTitle || document.title,
        itemType: "journalArticle",
        journal: queryMeta(root, ['meta[name="citation_journal_title"]']) || undefined,
        publisher: extractPublisherCandidate(root) || undefined,
        volume: extractVolumeCandidate(root) || undefined,
        issue: extractIssueCandidate(root) || undefined,
        pages: extractPagesCandidate(root) || undefined,
        doi: queryMeta(root, ['meta[name="citation_doi"]']) || undefined,
        url: context?.url ?? location.href,
        abstractNote: extractAbstractCandidate(root) || undefined,
        authors: splitAuthors(queryMeta(root, ['meta[name="citation_authors"]'])),
        year: parseYear(queryMeta(root, ['meta[name="citation_date"]']))
      })
    ];
  }
};
