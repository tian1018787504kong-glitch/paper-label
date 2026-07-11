import { createEntry, extractYearCandidate, parseYear, pickTitleNode, queryMeta, queryText, splitAuthors } from "./helpers";
import { parseCnkiSearchJournal } from "./search-source-parsers";
import type { SiteAdapter } from "./types";

function normalizeCnkiJournal(text: string) {
  return text
    .replace(/查看该刊数据库收录来源.*$/g, "")
    .replace(/[·•]\s*\d{4}.*$/g, "")
    .replace(/[。．.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCnkiTitle(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/附视频.*$/g, "")
    .replace(/视频解读.*$/g, "")
    .replace(/[【\[]视频[】\]]/g, "")
    .trim();
}

function extractCnkiDetailJournal(root: Document, titleNode: HTMLElement) {
  const directMatch = queryText(root, [
    'meta[name="citation_journal_title"]',
    ".top-tip a",
    ".wx-tit .top-tip a",
    ".brief .top-tip a",
    ".wx-tit .source a",
    ".brief .source a",
    ".wx-tit .docsource a",
    ".brief .docsource a"
  ]);

  if (directMatch) {
    return normalizeCnkiJournal(directMatch);
  }

  const scope =
    titleNode.closest(".brief, .wx-tit, .knowledge-net-wrap, .literature-detail, .doc, .detail") ??
    titleNode.parentElement ??
    root.body;

  const candidateTexts = Array.from(scope.querySelectorAll("a, span, div, p"))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 80);

  for (const text of candidateTexts) {
    const normalized = text.replace(/\s+/g, " ").trim();
    const match = normalized.match(/^(.{2,40}?)[·•]\s*(19|20)\d{2}/);
    if (match?.[1]) {
      return normalizeCnkiJournal(match[1]);
    }
  }

  const scopeText = scope.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const textMatch = scopeText.match(/(.{2,40}?)[·•]\s*(19|20)\d{2}/);
  if (textMatch?.[1]) {
    return normalizeCnkiJournal(textMatch[1]);
  }

  return undefined;
}

function extractCnkiDetailAuthors(root: Document, titleNode: HTMLElement) {
  const scope =
    titleNode.closest(".wx-tit, .brief, .literature-detail, .knowledge-net-wrap, .doc, .detail") ??
    titleNode.parentElement ??
    root.body;

  const directAuthorTexts = [
    ...Array.from(
      scope.querySelectorAll(
        [
          ".author a",
          ".authors a",
          ".author span",
          ".authors span",
          ".author-name",
          ".creator a",
          ".creator span",
          '[class*="author"] a',
          '[class*="author"] span'
        ].join(",")
      )
    ).map((node) => node.textContent?.trim() ?? ""),
    queryMeta(root, ['meta[name="citation_authors"]'])
  ]
    .filter(Boolean)
    .filter((text) => !/(学院|大学|研究院|研究所|中心|实验室)$/.test(text));

  const directAuthors = splitAuthors(directAuthorTexts.join(";"));
  if (directAuthors.length > 0) {
    return directAuthors;
  }

  const candidateLines = (scope.textContent ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !/(摘要|关键词|基金资助|专题|分类号|在线公开时间)/.test(line));

  for (const line of candidateLines) {
    if (/(学院|大学|研究院|研究所|中心|实验室)/.test(line)) {
      continue;
    }
    const parsed = splitAuthors(line);
    if (parsed.length >= 1) {
      return parsed;
    }
  }

  return [];
}

function extractCnkiAbstract(root: Document) {
  const abstractText = queryText(root, [
    ".abstract-text",
    ".wx-baseinfo .abstract",
    ".brief .abstract",
    ".summary-text",
    ".zwj-abstract"
  ]);

  return abstractText
    ?.replace(/^摘要[:：]?\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const cnkiAdapter: SiteAdapter = {
  id: "cnki",
  matches(hostname) {
    return hostname.includes("cnki.net");
  },
  collectEntries(root, context) {
    const selectors = [
      "#gridTable .name a",
      ".result-table-list .name a",
      ".wz_content .name a",
      ".briefBox .name a"
    ];

    for (const selector of selectors) {
      const resultAnchors = Array.from(root.querySelectorAll(selector));
      if (resultAnchors.length > 0) {
        return resultAnchors
          .map((node, index) => {
            if (!(node instanceof HTMLElement)) {
              return null;
            }

            const row = node.closest("tr, .result-table-item, li") ?? node.parentElement;
            const titleNode = node;
            const mountTarget = titleNode.parentElement ?? (row as HTMLElement | null) ?? titleNode;
            const sourceNode = row?.querySelector(
              "td.source a, .source a, td.source, .source, .authors-source span:last-child"
            );
            const journal = parseCnkiSearchJournal(sourceNode?.textContent ?? "");
            const meta = row?.textContent ?? "";

            return createEntry({
              siteId: "cnki",
              anchor: node,
              titleNode,
              mountTarget,
              renderMode: "stacked",
              alignment: "left",
              showPlaceholderBadge: true,
              actionVariant: "links",
              rankingMode: "strict-source",
              title: normalizeCnkiTitle(node.textContent ?? `CNKI Result ${index + 1}`),
              journal,
              url: (node as HTMLAnchorElement).href,
              year: parseYear(meta)
            });
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      }
    }

    const titleNode = pickTitleNode(root, [".wx-tit h1", ".brief .title", "h1"]);
    if (!titleNode) {
      return [];
    }

    return [
      createEntry({
        siteId: "cnki",
        anchor: titleNode,
        titleNode,
        mountTarget: titleNode.parentElement ?? titleNode,
        renderMode: "stacked",
        alignment: "center",
        showPlaceholderBadge: true,
        actionVariant: "links",
        title: normalizeCnkiTitle(queryMeta(root, ['meta[name="citation_title"]']) || titleNode.textContent || context?.pageTitle || document.title),
        itemType: "journalArticle",
        journal: extractCnkiDetailJournal(root, titleNode),
        doi: queryMeta(root, ['meta[name="citation_doi"]', 'meta[name="dc.identifier"]']) || undefined,
        url: context?.url ?? location.href,
        abstractNote: extractCnkiAbstract(root) || undefined,
        authors: extractCnkiDetailAuthors(root, titleNode),
        year: extractYearCandidate(root) ?? parseYear(document.body.textContent ?? "")
      })
    ];
  }
};
