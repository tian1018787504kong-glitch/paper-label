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

export const scienceDirectAdapter: SiteAdapter = {
  id: "sciencedirect",
  matches(hostname) {
    return hostname.includes("sciencedirect.com");
  },
  collectEntries(root, context) {
    if (isLikelyPublisherErrorPage(root)) {
      return [];
    }

    const titleNode = pickTitleNode(root, ["span.title-text", "h1"]);
    if (!titleNode) {
      return [];
    }

    const mountTarget =
      (titleNode.closest("article") as HTMLElement | null) ??
      titleNode.parentElement ??
      titleNode;
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
        siteId: "sciencedirect",
        anchor: titleNode,
        titleNode,
        mountTarget,
        renderMode: "stacked",
        alignment: "left",
        showPlaceholderBadge: true,
        actionVariant: "links",
        title: extractTitleCandidate(root, titleNode.textContent || context?.pageTitle || document.title),
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
