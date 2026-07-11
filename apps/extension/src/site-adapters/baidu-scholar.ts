import { createEntry, parseYear, pickTitleNode, splitAuthors } from "./helpers";
import { parseBaiduScholarJournal } from "./search-source-parsers";
import type { SiteAdapter } from "./types";

export const baiduScholarAdapter: SiteAdapter = {
  id: "baidu-scholar",
  matches(hostname) {
    return hostname.includes("xueshu.baidu.com");
  },
  collectEntries(root, context) {
    const resultCards = Array.from(root.querySelectorAll(".result.sc_default_result, .sc_content_result"));
    if (resultCards.length > 0) {
      return resultCards
        .map((card, index) => {
          const titleNode = pickTitleNode(card, [".c_font a", "h3 a", ".result-title a"]);
          if (!titleNode) {
            return null;
          }

          const meta = (card.querySelector(".sc_info, .c_font_normal")?.textContent ?? "").trim();
          const source = (card.querySelector(".sc_source, .c_color_gray")?.textContent ?? "").trim();
          const journal = parseBaiduScholarJournal(source, meta);

          return createEntry({
            siteId: "baidu-scholar",
            anchor: titleNode,
            titleNode,
            rankingMode: "strict-source",
            title: titleNode.textContent ?? `Baidu Scholar Result ${index + 1}`,
            journal,
            url: (titleNode as HTMLAnchorElement).href,
            authors: splitAuthors(meta.split("-")[0] ?? ""),
            year: parseYear(meta)
          });
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    }

    const titleNode = pickTitleNode(root, ["h1", "title"]);
    return titleNode
      ? [
          createEntry({
            siteId: "baidu-scholar",
            anchor: titleNode,
            titleNode,
            title: titleNode.textContent ?? document.title,
            journal: context?.pageTitle ?? document.title
          })
        ]
      : [];
  }
};
