import {
  createEntry,
  extractAbstractCandidate,
  extractAuthorCandidates,
  extractDoiCandidate,
  extractIssueCandidate,
  extractItemTypeCandidate,
  extractJournalCandidates,
  extractPagesCandidate,
  extractPublisherCandidate,
  extractTitleCandidate,
  extractVolumeCandidate,
  extractYearCandidate,
  isLikelyPublisherErrorPage,
  pickTitleNode
} from "./helpers";
import type { SiteAdapter } from "./types";

function hasJsonLdScholarlyArticle(root: Document) {
  return Array.from(root.querySelectorAll('script[type="application/ld+json"]')).some((script) =>
    /ScholarlyArticle|Periodical|PublicationIssue|citation|doi/i.test(script.textContent ?? "")
  );
}

export function hasScholarlySignals(root: Document) {
  if (
    root.querySelector(
      [
        'meta[name^="citation_"]',
        'meta[name="prism.doi"]',
        'meta[name="prism.publicationName"]',
        'meta[name="dc.identifier"]',
        'meta[name="DC.Identifier"]',
        'meta[name="dc.source"]',
        'meta[name="DC.Source"]',
        'meta[name="journal_title"]',
        'a[href*="doi.org/10."]',
        'a[href*="/doi/10."]'
      ].join(",")
    )
  ) {
    return true;
  }

  return hasJsonLdScholarlyArticle(root);
}

export const genericAdapter: SiteAdapter = {
  id: "generic",
  matches() {
    return true;
  },
  collectEntries(root, context) {
    if (isLikelyPublisherErrorPage(root)) {
      return [];
    }

    if (!hasScholarlySignals(root)) {
      return [];
    }

    const expectedTitle = extractTitleCandidate(root, context?.pageTitle || root.title || document.title);
    const titleNode = pickTitleNode(root, [
      "h1[data-test='article-title']",
      "h1[data-testid='article-title']",
      '[data-testid="article-title"]',
      '[data-test="article-title"]',
      '[data-testid="item-title"]',
      '[data-test="item-title"]',
      '[data-testid="title"]',
      '[data-test="title"]',
      "mfe-turnaway-pharos-heading",
      ".content-meta-data-heading > span",
      ".content-meta-data-heading span",
      '[role="heading"][aria-level="1"]',
      'main [role="heading"]',
      'article [role="heading"]',
      "h1[property='name']",
      '[itemprop="name"]',
      "h1.article-title",
      "h1.c-article-title",
      "h1.highwire-cite-title",
      '[class*="article-title" i]',
      '[class*="document-title" i]',
      '[class*="citation-title" i]',
      '[class*="item-title" i]',
      ".citation__title",
      ".article__title",
      ".article-title",
      ".document-title",
      ".item-title",
      "h1.title",
      "h1",
      "title"
    ], expectedTitle);
    if (!titleNode) {
      return [];
    }

    const title = expectedTitle || extractTitleCandidate(root, titleNode.textContent || context?.pageTitle || document.title);
    if (!title.trim()) {
      return [];
    }

    const journalCandidates = extractJournalCandidates(root);
    const authors = extractAuthorCandidates(root);
    const year = extractYearCandidate(root);
    const itemType = extractItemTypeCandidate(root);
    const publisher = extractPublisherCandidate(root);
    const volume = extractVolumeCandidate(root);
    const issue = extractIssueCandidate(root);
    const pages = extractPagesCandidate(root);
    const abstractNote = extractAbstractCandidate(root);

    return [
      createEntry({
        siteId: "generic",
        anchor: titleNode,
        titleNode,
        title,
        itemType,
        journal: journalCandidates[0],
        publisher: publisher || undefined,
        volume: volume || undefined,
        issue: issue || undefined,
        pages: pages || undefined,
        rankingCandidates: journalCandidates,
        doi: extractDoiCandidate(root) || undefined,
        url: context?.url ?? location.href,
        abstractNote: abstractNote || undefined,
        authors,
        year
      })
    ];
  }
};
