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

const supportedHosts = [
  "link.springer.com",
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
  "pnas.org",
  "journals.asm.org",
  "biorxiv.org",
  "medrxiv.org"
];

export const publisherDetailAdapter: SiteAdapter = {
  id: "publisher-detail",
  matches(hostname) {
    return supportedHosts.some((host) => hostname.includes(host));
  },
  collectEntries(root, context) {
    if (isLikelyPublisherErrorPage(root)) {
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
      '[class*="article-title" i]',
      '[class*="document-title" i]',
      '[class*="citation-title" i]',
      '[class*="item-title" i]',
      '[itemprop="name"]',
      "h1.article-title",
      "h1.c-article-title",
      "h1.content-header__title",
      "h1.article-header-title",
      "h1.document-title",
      "h1.citation__title",
      "h1.article-header__title",
      "h1.title",
      ".article-title",
      ".document-title",
      ".citation__title",
      ".item-title",
      ".title",
      "h1"
    ], expectedTitle);

    if (!titleNode) {
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
        siteId: "publisher-detail",
        anchor: titleNode,
        titleNode,
        mountTarget: (titleNode.closest("article, main, .article, .content") as HTMLElement | null) ?? titleNode,
        renderMode: "stacked",
        alignment: "left",
        showPlaceholderBadge: true,
        actionVariant: "links",
        title: expectedTitle || extractTitleCandidate(root, titleNode.textContent || context?.pageTitle || document.title),
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
