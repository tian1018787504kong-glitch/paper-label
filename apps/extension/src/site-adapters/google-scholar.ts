import { createEntry, parseYear, pickTitleNode, splitAuthors } from "./helpers";
import { parseGoogleScholarJournal } from "./search-source-parsers";
import type { SiteAdapter } from "./types";

export const googleScholarAdapter: SiteAdapter = {
  id: "google-scholar",
  matches(hostname) {
    return hostname.includes("scholar.google.com");
  },
  collectEntries(root, context) {
    const resultCards = Array.from(root.querySelectorAll(".gs_r.gs_or.gs_scl"));
    if (resultCards.length > 0) {
      return resultCards
        .map((card, index) => {
          const titleNode = pickTitleNode(card, ["h3.gs_rt"]);
          const anchor = card.querySelector("h3.gs_rt a") as HTMLAnchorElement | null;
          const mountTarget =
            (card.querySelector(".gs_ri") as HTMLElement | null) ??
            titleNode?.parentElement ??
            (card as HTMLElement);
          if (!titleNode) {
            return null;
          }
          const meta = (card.querySelector(".gs_a")?.textContent ?? "").trim();
          const rawTitle = titleNode.textContent ?? `Google Scholar Result ${index + 1}`;
          const journal = parseGoogleScholarJournal(meta, rawTitle);
          return createEntry({
            siteId: "google-scholar",
            anchor: anchor ?? titleNode,
            titleNode,
            mountTarget,
            renderMode: "stacked",
            alignment: "left",
            showPlaceholderBadge: true,
            actionVariant: "links",
            rankingMode: "strict-source",
            title: rawTitle,
            journal,
            url: anchor?.href,
            authors: splitAuthors(meta.split("-")[0] ?? ""),
            year: parseYear(meta)
          });
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    }

    const titleNode = pickTitleNode(root, ["h1", "title"]);
    if (!titleNode) {
      return [];
    }

    return [
      createEntry({
        siteId: "google-scholar",
        anchor: titleNode,
        titleNode,
        mountTarget: titleNode.parentElement ?? titleNode,
        alignment: "left",
        showPlaceholderBadge: true,
        actionVariant: "links",
        title: titleNode.textContent ?? document.title,
        journal: context?.pageTitle ?? document.title
      })
    ];
  }
};
