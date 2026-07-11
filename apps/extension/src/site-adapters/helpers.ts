import { createDocumentRecord } from "../library-model/document";
import type { SupportedSiteId, SiteDocumentEntry } from "./types";

export function queryText(root: ParentNode, selectors: string[]) {
  for (const selector of selectors) {
    const element = root.querySelector(selector);
    const textValue = element?.textContent?.trim();
    const contentValue = element?.getAttribute("content")?.trim();
    const value = textValue || contentValue;
    if (value) {
      return value;
    }
  }
  return "";
}

export function queryMeta(root: Document, selectors: string[]) {
  return queryText(root, selectors);
}

export function queryMetaList(root: Document, selectors: string[]) {
  const values: string[] = [];
  const seen = new Set<string>();
  for (const selector of selectors) {
    const nodes = Array.from(root.querySelectorAll(selector));
    for (const node of nodes) {
      const value = node.getAttribute("content")?.trim() ?? node.textContent?.trim() ?? "";
      const key = value.toLowerCase();
      if (value && !seen.has(key)) {
        seen.add(key);
        values.push(value);
      }
    }
  }
  return values;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const found: string = firstString(...value);
      if (found) {
        return found;
      }
    }
  }

  return "";
}

const journalTitleHintPattern =
  /\b(Journal|Review|Quarterly|Proceedings|Transactions|Letters|Communications|Magazine|Nature|Science|Cell|Lancet|JAMA|PNAS)\b/i;

const journalResearchTitlePattern = /\b[A-Z][A-Za-z,&.'’\-\s]{2,90}\sResearch\b/;

function cleanJournalText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*>\s*/g, " > ")
    .replace(/\s*[|]\s*.*$/g, "")
    .replace(/\s*[-–—]\s*(Article|ScienceDirect|Springer|Wiley|IEEE Xplore|ACM Digital Library).*$/i, "")
    .replace(/^Publisher:\s*/i, "")
    .replace(/^Published By:\s*/i, "")
    .replace(/^Published in:\s*/i, "")
    .replace(/^Source:\s*/i, "")
    .replace(/^Journal:\s*/i, "")
    .replace(/\s*[·•]\s*\d{1,2}\s+[A-Za-z]{3,9}\s+(19|20)\d{2}.*$/i, "")
    .replace(/\s+(Vol\.?|Volume|Issue|No\.?|Number|Article number|Pages?|pp\.?)\b.*$/i, "")
    .replace(/\s+\d{1,4}\s*,\s*[\d–—-]+.*\((19|20)\d{2}\).*$/i, "")
    .replace(/\s*\((19|20)\d{2}\)\s+\d+.*$/i, "")
    .replace(/[·•]\s*(19|20)\d{2}.*$/g, "")
    .replace(/,\s*(19|20)\d{2}.*$/g, "")
    .trim();
}

function isUsableJournalCandidate(value: string) {
  const cleaned = cleanJournalText(value);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 120) {
    return false;
  }

  const lower = cleaned.toLowerCase();
  return ![
    "article",
    "articles",
    "journal",
    "journals",
    "journal home",
    "journals & magazines",
    "browse",
    "publisher",
    "ieee",
    "elsevier",
    "springer",
    "wiley",
    "science direct",
    "sciencedirect",
    "acm digital library",
    "jstor",
    "emerald insight",
    "volume",
    "issue",
    "open access",
    "citation manager"
  ].includes(lower);
}

function looksLikeJournalTitle(value: string) {
  const cleaned = cleanJournalText(value);
  return (
    isUsableJournalCandidate(cleaned) &&
    (journalTitleHintPattern.test(cleaned) || journalResearchTitlePattern.test(cleaned))
  );
}

export function isLikelyPublisherErrorPage(root: Document) {
  const title = `${root.title || ""} ${root.querySelector("h1")?.textContent ?? ""} ${root.body?.textContent?.slice(0, 1200) ?? ""}`
    .replace(/\s+/g, " ")
    .trim();
  return /\b(page not found|not found|access denied|forbidden|there was a problem|request blocked|just a moment)\b/i.test(title) ||
    /请稍候|正在检查您的浏览器|正在进行安全验证|验证您不是自动程序|验证成功|等待.*响应/.test(title);
}

function uniqueValues(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = cleanJournalText(value ?? "");
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function uniqueTextValues(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = (value ?? "").replace(/\s+/g, " ").trim();
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(cleaned);
  }
  return result;
}

function queryNestedPeriodicalName(value: unknown): string {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = queryNestedPeriodicalName(item);
      if (found) {
        return found;
      }
    }
    return "";
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  const nested = firstString(
    queryNestedPeriodicalName(record.isPartOf),
    queryNestedPeriodicalName(record.journal),
    queryNestedPeriodicalName(record.periodical),
    queryNestedPeriodicalName(record.publication)
  );
  if (nested) {
    return nested;
  }

  return firstString(record.name, record.headline);
}

function queryNestedPersonNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => queryNestedPersonNames(item));
  }

  const record = asRecord(value);
  if (!record) {
    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
    return [];
  }

  const directName = firstString(record.name, record.familyName && record.givenName ? `${record.givenName} ${record.familyName}` : "");
  if (directName) {
    return [directName];
  }

  return [
    ...queryNestedPersonNames(record.author),
    ...queryNestedPersonNames(record.creator),
    ...queryNestedPersonNames(record.authors)
  ];
}

function queryNestedDate(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = queryNestedDate(item);
      if (found) {
        return found;
      }
    }
    return "";
  }

  const record = asRecord(value);
  if (!record) {
    return "";
  }

  return firstString(
    record.datePublished,
    record.dateCreated,
    record.dateModified,
    record.uploadDate,
    queryNestedDate(record.mainEntity),
    queryNestedDate(record.isPartOf)
  );
}

function queryNestedPublisherName(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => queryNestedPublisherName(item));
  }

  const record = asRecord(value);
  if (!record) {
    return typeof value === "string" ? [value] : [];
  }

  return [firstString(record.name, record.legalName, record.publisher) ?? ""].filter(Boolean);
}

function queryJsonLdObjects(root: Document) {
  const scripts = Array.from(root.querySelectorAll('script[type="application/ld+json"]'));
  const objects: Record<string, unknown>[] = [];

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent ?? "");
      const candidates = Array.isArray(parsed) ? parsed : [parsed];
      for (const candidate of candidates) {
        const record = asRecord(candidate);
        if (record) {
          objects.push(record);
        }
      }
    } catch {
      // Ignore invalid JSON-LD blocks and continue with other sources.
    }
  }

  return objects;
}

function queryJsonLdJournals(root: Document) {
  const found: string[] = [];

  for (const record of queryJsonLdObjects(root)) {
    const mainEntity = asRecord(record.mainEntity);
    const journal = firstString(
      queryNestedPeriodicalName(record.isPartOf),
      queryNestedPeriodicalName(mainEntity?.isPartOf),
      queryNestedPeriodicalName(record.journal),
      queryNestedPeriodicalName(mainEntity?.journal),
      record.journal,
      mainEntity?.journal
    );
    if (journal && isUsableJournalCandidate(journal)) {
      found.push(journal);
    }
  }

  return uniqueValues(found);
}

export function extractAuthorCandidates(root: Document) {
  const metaAuthors = queryMetaList(root, [
    'meta[name="citation_author"]',
    'meta[name="citation_authors"]',
    'meta[name="dc.creator"]',
    'meta[name="DC.Creator"]',
    'meta[name="author"]',
    'meta[name="parsely-author"]',
    'meta[property="article:author"]'
  ]);

  const jsonLdAuthors = queryJsonLdObjects(root).flatMap((record) => [
    ...queryNestedPersonNames(record.author),
    ...queryNestedPersonNames(record.creator),
    ...queryNestedPersonNames(record.authors),
    ...queryNestedPersonNames(asRecord(record.mainEntity)?.author)
  ]);

  const structuredAuthors = splitAuthors([...metaAuthors, ...jsonLdAuthors].join("; "));
  if (structuredAuthors.length > 0) {
    return structuredAuthors;
  }

  return splitAuthors(queryDomAuthorCandidates(root).join("; "));
}

export function extractYearCandidate(root: Document) {
  const metaDate = queryMeta(root, [
    'meta[name="citation_date"]',
    'meta[name="citation_publication_date"]',
    'meta[name="citation_online_date"]',
    'meta[name="dc.date"]',
    'meta[name="DC.Date"]',
    'meta[name="prism.publicationDate"]',
    'meta[property="article:published_time"]',
    'meta[property="og:article:published_time"]'
  ]);

  const jsonLdDate = queryJsonLdObjects(root)
    .map((record) => queryNestedDate(record))
    .find(Boolean);

  return parseYear(metaDate || jsonLdDate || root.body.textContent || "");
}

export function extractAbstractCandidate(root: Document) {
  const metaAbstract = queryMeta(root, [
    'meta[name="citation_abstract"]',
    'meta[name="description"]',
    'meta[name="dc.description"]',
    'meta[name="DC.Description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]'
  ]);

  if (metaAbstract) {
    return metaAbstract.trim();
  }

  for (const record of queryJsonLdObjects(root)) {
    const abstractText = firstString(
      record.description,
      asRecord(record.mainEntity)?.description,
      asRecord(record.mainEntityOfPage)?.description,
      record.abstract
    );
    if (abstractText) {
      return abstractText.trim();
    }
  }

  return "";
}

export function extractPublisherCandidate(root: Document) {
  const metaPublisher = queryMeta(root, [
    'meta[name="citation_publisher"]',
    'meta[name="dc.publisher"]',
    'meta[name="DC.Publisher"]',
    'meta[name="prism.publisher"]'
  ]);

  if (metaPublisher) {
    return metaPublisher.trim();
  }

  for (const record of queryJsonLdObjects(root)) {
    const publisher = firstString(
      ...queryNestedPublisherName(record.publisher),
      ...queryNestedPublisherName(asRecord(record.mainEntity)?.publisher),
      ...queryNestedPublisherName(asRecord(record.isPartOf)?.publisher)
    );
    if (publisher) {
      return publisher.trim();
    }
  }

  return "";
}

export function extractVolumeCandidate(root: Document) {
  return (
    queryMeta(root, [
      'meta[name="citation_volume"]',
      'meta[name="prism.volume"]'
    ]) || ""
  ).trim();
}

export function extractIssueCandidate(root: Document) {
  return (
    queryMeta(root, [
      'meta[name="citation_issue"]',
      'meta[name="prism.number"]',
      'meta[name="prism.issueIdentifier"]'
    ]) || ""
  ).trim();
}

export function extractPagesCandidate(root: Document) {
  const explicitPages = queryMeta(root, [
    'meta[name="citation_pages"]',
    'meta[name="prism.startingPage"]'
  ]);
  if (explicitPages) {
    return explicitPages.trim();
  }

  const firstPage = queryMeta(root, ['meta[name="citation_firstpage"]']).trim();
  const lastPage = queryMeta(root, ['meta[name="citation_lastpage"]']).trim();
  if (firstPage && lastPage) {
    return `${firstPage}-${lastPage}`;
  }
  if (firstPage) {
    return firstPage;
  }

  for (const record of queryJsonLdObjects(root)) {
    const pageStart = firstString(record.pageStart, asRecord(record.mainEntity)?.pageStart);
    const pageEnd = firstString(record.pageEnd, asRecord(record.mainEntity)?.pageEnd);
    if (pageStart && pageEnd) {
      return `${pageStart}-${pageEnd}`;
    }
    if (pageStart) {
      return pageStart;
    }
  }

  return "";
}

export function extractItemTypeCandidate(root: Document) {
  const hasConferenceSignals = Boolean(
    queryMeta(root, [
      'meta[name="citation_conference_title"]',
      'meta[name="citation_inbook_title"]'
    ]) ||
      root.querySelector('a[href*="/conference/"], [class*="conference" i], [data-testid*="conference" i]')
  );

  if (hasConferenceSignals) {
    return "conferencePaper";
  }

  for (const record of queryJsonLdObjects(root)) {
    const typeValue = firstString(record["@type"], asRecord(record.mainEntity)?.["@type"]);
    if (/ScholarlyArticle|Article/i.test(typeValue ?? "")) {
      return "journalArticle";
    }
    if (/Chapter/i.test(typeValue ?? "")) {
      return "bookSection";
    }
  }

  return "journalArticle";
}

export function extractDoiCandidate(root: Document) {
  const metaDoi = queryMeta(root, [
    'meta[name="citation_doi"]',
    'meta[name="dc.identifier"]',
    'meta[name="DC.Identifier"]',
    'meta[name="prism.doi"]',
    'meta[name="dc.Identifier"]'
  ]);

  if (metaDoi) {
    return metaDoi;
  }

  for (const record of queryJsonLdObjects(root)) {
    const doi = firstString(record.identifier, asRecord(record.mainEntity)?.identifier);
    if (doi && /10\.\d{4,9}\//.test(doi)) {
      return doi;
    }
  }

  return "";
}

export function extractTitleCandidate(root: Document, fallbackTitle: string) {
  const metaTitle = queryMeta(root, [
    'meta[name="citation_title"]',
    'meta[name="dc.title"]',
    'meta[name="DC.Title"]',
    'meta[name="prism.title"]',
    'meta[property="og:title"]',
    'meta[name="twitter:title"]'
  ]);

  if (metaTitle) {
    return sanitizeTitle(metaTitle);
  }

  for (const record of queryJsonLdObjects(root)) {
    const title = firstString(record.headline, record.name, asRecord(record.mainEntity)?.headline, asRecord(record.mainEntity)?.name);
    if (title) {
      return sanitizeTitle(title);
    }
  }

  return sanitizeTitle(fallbackTitle);
}

function queryEmbeddedScriptJournals(root: Document) {
  const scripts = Array.from(root.querySelectorAll("script"));
  const patterns = [
    /["']contentName["']\s*:\s*["']([^"']{2,160})["']/i,
    /["']journalTitle["']\s*:\s*["']([^"']{2,160})["']/i,
    /["']publicationName["']\s*:\s*["']([^"']{2,160})["']/i,
    /["']container-title["']\s*:\s*["']([^"']{2,160})["']/i
  ];
  const found: string[] = [];

  for (const script of scripts) {
    const text = script.textContent ?? "";
    for (const pattern of patterns) {
      const value = text.match(pattern)?.[1]?.trim();
      if (value && looksLikeJournalTitle(value)) {
        found.push(value);
      }
    }
  }

  return uniqueValues(found);
}

function queryBreadcrumbJournals(root: ParentNode) {
  const selectors = [
    '[aria-label*="breadcrumb" i] a',
    '[class*="breadcrumb" i] a',
    'nav a[href*="/journal"]',
    'nav a[href*="/journals"]',
    'nav a[href*="/xpl/RecentIssue"]',
    'a[href*="/journal/"]',
    'a[href*="/journals/"]',
    'a[href*="/xpl/RecentIssue"]',
    '[data-test="journal-link"]',
    '[data-test="journal-title"]'
  ];

  const candidates = selectors.flatMap((selector) =>
    Array.from(root.querySelectorAll(selector)).map((node) => node.textContent?.trim() ?? "")
  );

  return uniqueValues(candidates.filter((candidate) => isUsableJournalCandidate(candidate)));
}

function queryElementJournals(root: ParentNode) {
  const selectors = [
    '[data-testid*="journal" i]',
    '[data-test*="journal" i]',
    '[class*="journal-title" i]',
    '[class*="journal__title" i]',
    '[class*="publication-title" i]',
    '[class*="publication__title" i]',
    '[class*="source-title" i]',
    'a[href*="/journal/"]',
    'a[href*="/journals/"]',
    'a[href*="/xpl/RecentIssue"]'
  ];
  const found: string[] = [];

  for (const selector of selectors) {
    const candidates = Array.from(root.querySelectorAll(selector));
    for (const candidate of candidates) {
      const text = candidate.textContent?.trim() ?? "";
      if (looksLikeJournalTitle(text)) {
        found.push(text);
      }
    }
  }

  return uniqueValues(found);
}

function queryPageTitleJournals(root: Document) {
  const pageTitle = root.title || "";
  const pieces = pageTitle
    .split(/\s+[-–—|]\s+|\s+on\s+/i)
    .map((piece) => piece.trim())
    .filter(Boolean);
  return uniqueValues(pieces.filter((piece) => looksLikeJournalTitle(piece)));
}

function queryLineBasedJournals(root: Document) {
  const container =
    root.querySelector("main, article, [role='main'], .article, .content, .main") ?? root.body ?? root.documentElement;
  const rawText = (container?.textContent || root.textContent || "").slice(0, 60000);
  const lines = rawText
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const volumeLinePattern = /\b(Vol\.?|Volume|Issue|No\.?|Article number|Pages?|pp\.?|\d+\s*\(\d+\))\b/i;
  const found: string[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1] ?? "";
    if (looksLikeJournalTitle(line) && volumeLinePattern.test(nextLine)) {
      found.push(line);
    }
  }

  for (const line of lines) {
    const cleaned = cleanJournalText(line);
    if (cleaned !== line && looksLikeJournalTitle(cleaned)) {
      found.push(cleaned);
    }
  }

  return uniqueValues(found);
}

function queryLabeledJournals(root: ParentNode) {
  const text = (root.textContent ?? "").slice(0, 60000).replace(/\s+/g, " ").trim();
  const patterns = [
    /Published in:\s*([^|]+?)(?:\s{2,}| DOI:| Date of|$)/i,
    /Journal:\s*([^|]+?)(?:\s{2,}| DOI:| Date of|$)/i,
    /Source:\s*([^|]+?)(?:\s{2,}| DOI:| Date of|$)/i,
    /["']contentName["']\s*:\s*["']([^"']{2,160})["']/i,
    /["']journalTitle["']\s*:\s*["']([^"']{2,160})["']/i,
    /["']publicationName["']\s*:\s*["']([^"']{2,160})["']/i,
    /([A-Z][A-Za-z,&\s-]{4,120}Journal)\s+Vol\./,
    /([A-Z][A-Za-z,&\s-]{4,120}Review)\s+Vol\./,
    /([A-Z][A-Za-z,&\s-]{4,120}Research)\s+Vol\./,
    /([A-Z][A-Za-z,&\s-]{4,120}Journal)\s*\((19|20)\d{2}\)/,
    /([A-Z][A-Za-z,&\s-]{4,120}Review)\s*\((19|20)\d{2}\)/,
    /([A-Z][A-Za-z,&\s-]{4,120}Research)\s*\((19|20)\d{2}\)/
  ];
  const found: string[] = [];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value && looksLikeJournalTitle(value)) {
      found.push(value);
    }
  }

  return uniqueValues(found);
}

export function extractJournalCandidates(root: Document, extraSelectors: string[] = []) {
  const metaValue = queryMeta(root, [
    ...extraSelectors,
    'meta[name="citation_journal_title"]',
    'meta[name="prism.publicationName"]',
    'meta[name="citation_publication_title"]',
    'meta[name="dc.source"]',
    'meta[name="DC.Source"]',
    'meta[name="dc.relation.ispartof"]',
    'meta[name="journal_title"]'
  ]);

  const lightCandidates = uniqueValues([
    metaValue && isUsableJournalCandidate(metaValue) ? metaValue : undefined,
    ...queryJsonLdJournals(root),
    ...queryEmbeddedScriptJournals(root),
    ...queryBreadcrumbJournals(root),
    ...queryElementJournals(root),
    ...queryPageTitleJournals(root)
  ]);

  if (lightCandidates.length > 0) {
    return lightCandidates;
  }

  return uniqueValues([
    ...queryLineBasedJournals(root),
    ...queryLabeledJournals(root)
  ]);
}

export function extractJournalTitle(root: Document, extraSelectors: string[] = []) {
  return extractJournalCandidates(root, extraSelectors)[0];
}

export function pickTitleNode(root: ParentNode, selectors: string[], expectedTitle?: string) {
  if (expectedTitle) {
    const expectedNode = findTitleNodeByExpectedText(root, expectedTitle);
    if (expectedNode) {
      return expectedNode;
    }
  }

  for (const selector of selectors) {
    const node = root.querySelector(selector);
    if (node && isVisibleElement(node)) {
      return node;
    }
  }
  return null;
}

export function parseYear(text: string) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : undefined;
}

export function splitAuthors(raw: string) {
  const ignoredAuthorPattern =
    /^(all authors?|author information|authors? info|view author|view all authors?|view all publications.*|corresponding author|cite this article|similar articles?)$/i;
  const normalized = raw
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s*&\s*/g, ";")
    .replace(/\b(and|AND)\b/g, ";")
    .replace(/；/g, ";")
    .replace(/，/g, ",")
    .trim();

  const organizationPattern =
    /(university|college|school|academy|institute|department|hospital|laboratory|centre|center|faculty|商学院|学院|大学|研究院|研究所|医院|实验室|中心)/i;
  const simpleNamePattern =
    /^(?:[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,4}|[\u4e00-\u9fa5·]{2,8})$/;
  const compactChinesePattern = /^(?:[\u4e00-\u9fa5·]{2,8}\d*\s*){2,}$/;
  const normalizeOneAuthor = (item: string) => {
    const cleaned = item
        .replace(/^\d+\s*[.)、-]?\s*/g, "")
        .replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "")
        .replace(/\d+$/g, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const lastFirstMatch = cleaned.match(/^([A-Za-zÀ-ÿ'’.-]+),\s*([A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,3})$/);
    return lastFirstMatch ? `${lastFirstMatch[2]} ${lastFirstMatch[1]}` : cleaned;
  };

  const expandedSegments = normalized
    .split(/[;\n]+/)
    .flatMap((segment) => {
      const cleanedSegment = segment.trim();
      if (!cleanedSegment) {
        return [];
      }
      if (compactChinesePattern.test(cleanedSegment)) {
        return cleanedSegment.replace(/(\d+)\s*/g, ";").replace(/\s+/g, ";").split(";");
      }

      const commaSegments = cleanedSegment
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      const isSingleLastFirst =
        commaSegments.length === 2 &&
        /^[A-Za-zÀ-ÿ'’.-]+$/.test(commaSegments[0]) &&
        /^[A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Za-zÀ-ÿ'’.-]+){0,3}$/.test(commaSegments[1]);
      if (!isSingleLastFirst && commaSegments.length > 1 && commaSegments.every((item) => simpleNamePattern.test(item))) {
        return commaSegments;
      }
      return [cleanedSegment];
    });

  const authors = expandedSegments
    .map(normalizeOneAuthor)
    .filter(
      (item) =>
        item &&
        !ignoredAuthorPattern.test(item) &&
        !organizationPattern.test(item) &&
        !item.includes("@") &&
        item.length <= 60
    )
    .filter((item, index, source) => source.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 12);

  return authors;
}

function queryDomAuthorCandidates(root: ParentNode) {
  const preferredRoot =
    root.querySelector(
      [
        "article header",
        "article",
        "main header",
        '[role="main"]',
        ".article-header",
        ".article__header",
        ".publicationContentTitle",
        ".core-container",
        ".c-article-header",
        ".ArticleHeader",
        ".NLM_contrib-group"
      ].join(",")
    ) ?? root;
  const selectors = [
    '[data-testid*="author" i] a',
    '[data-testid*="authors" i] a',
    '[data-test*="author" i] a',
    '[data-test*="authors" i] a',
    '[class*="author" i] a',
    '[class*="authors" i] a',
    '[itemprop="author"] a',
    '[itemprop="author"] [itemprop="name"]',
    'a[rel="author"]',
    'a[href*="/author/"]',
    'a[href*="/authors/"]',
    '.c-article-author-list a',
    '.authors a',
    '.author-list a',
    '.authors-list a',
    '.loa__author-name',
    '.author-name'
  ];

  const ignoredAuthorPattern =
    /^(all authors?|author information|authors? info|view author|view all authors?|view all publications.*|corresponding author|cite this article|similar articles?)$/i;
  const found: string[] = [];

  for (const selector of selectors) {
    for (const candidate of Array.from(preferredRoot.querySelectorAll(selector))) {
      const text = candidate.textContent?.replace(/\s+/g, " ").trim() ?? "";
      if (!text || ignoredAuthorPattern.test(text) || text.length > 80) {
        continue;
      }
      found.push(text);
    }
  }

  return uniqueTextValues(found);
}

export function sanitizeTitle(text: string) {
  return text
    .replace(/\s+-\s+(?:[A-Z][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’.-]+)*,\s*){1,8}(?:and\s+)?[A-Z][A-Za-zÀ-ÿ'’.-]+(?:\s+[A-Z][A-Za-zÀ-ÿ'’.-]+)*,?\s+(19|20)\d{2}$/i, "")
    .replace(/\s+-\s+[^-]{2,180},\s*(19|20)\d{2}$/i, "")
    .replace(/\[[^\]]+\]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitleForCompare(text: string) {
  return sanitizeTitle(text)
    .replace(/\s+(?:on\s+JSTOR)$/i, "")
    .replace(/\s+[-–—|]\s+(?:Science|Nature|SpringerLink|Wiley Online Library|IEEE Xplore|ACM Digital Library|JSTOR|PNAS|SAGE Journals|ScienceDirect).*$/i, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function getOwnerDocument(root: ParentNode) {
  if (root instanceof Document) {
    return root;
  }
  return root.ownerDocument ?? document;
}

function isVisibleElement(node: Element): node is HTMLElement {
  return node instanceof HTMLElement && node.tagName !== "TITLE" && node.getClientRects().length > 0;
}

function scoreTitleCandidate(node: HTMLElement, expectedTitle: string) {
  const text = node.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (!text || text.length < 8 || text.length > 320) {
    return 0;
  }

  const normalizedText = normalizeTitleForCompare(text);
  const normalizedExpected = normalizeTitleForCompare(expectedTitle);
  if (!normalizedText || !normalizedExpected) {
    return 0;
  }

  let score = 0;
  if (normalizedText === normalizedExpected) {
    score += 100;
  } else if (normalizedText.includes(normalizedExpected)) {
    score += 70;
  } else if (normalizedExpected.includes(normalizedText) && normalizedText.length >= Math.min(30, normalizedExpected.length)) {
    score += 45;
  } else {
    const expectedWords = normalizedExpected.split(" ").filter((word) => word.length > 2);
    const matchedWords = expectedWords.filter((word) => normalizedText.includes(word));
    if (expectedWords.length > 0 && matchedWords.length / expectedWords.length >= 0.72) {
      score += 35;
    }
  }

  if (score === 0) {
    return 0;
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === "h1") {
    score += 20;
  } else if (tagName === "h2") {
    score += 12;
  }
  if (node.matches('[role="heading"], [class*="title" i], [data-testid*="title" i], [data-test*="title" i], [itemprop="headline"], [itemprop="name"]')) {
    score += 10;
  }
  if (node.children.length > 8) {
    score -= 15;
  }

  return score;
}

function findTitleNodeByExpectedText(root: ParentNode, expectedTitle: string) {
  const documentRoot = getOwnerDocument(root);
  const searchRoot =
    root instanceof Document
      ? root.querySelector("main, article, [role='main'], #content, .content, .main, body") ?? root.body ?? root.documentElement
      : root;
  const candidates = Array.from(
    searchRoot.querySelectorAll(
      [
        "h1",
        "h2",
        '[role="heading"]',
        '[itemprop="headline"]',
        '[itemprop="name"]',
        '[class*="article-title" i]',
        '[class*="document-title" i]',
        '[class*="citation-title" i]',
        '[class*="content-title" i]',
        '[class*="heading" i]',
        '[class*="title" i]',
        '[data-testid*="title" i]',
        '[data-test*="title" i]',
        "mfe-turnaway-pharos-heading",
        ".content-meta-data-heading span"
      ].join(",")
    )
  )
    .filter(isVisibleElement)
    .slice(0, 700);

  const scored = candidates
    .map((node) => ({
      node,
      score: scoreTitleCandidate(node, expectedTitle)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  if (scored[0]?.node) {
    return scored[0].node;
  }

  const fallbackTitle = normalizeTitleForCompare(documentRoot.title || "");
  if (!fallbackTitle || fallbackTitle === normalizeTitleForCompare(expectedTitle)) {
    return null;
  }

  return (
    candidates
      .map((node) => ({
        node,
        score: scoreTitleCandidate(node, documentRoot.title)
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)[0]?.node ?? null
  );
}

export function createEntry(params: {
  siteId: SupportedSiteId;
  anchor: HTMLElement;
  titleNode: HTMLElement;
  mountTarget?: HTMLElement;
  renderMode?: "inline" | "stacked";
  alignment?: "left" | "center";
  showPlaceholderBadge?: boolean;
  actionVariant?: "links" | "boxed";
  rankingMode?: "default" | "strict-source";
  rankingCandidates?: string[];
  title: string;
  itemType?: string | null;
  journal?: string | null;
  publisher?: string | null;
  volume?: string | null;
  issue?: string | null;
  pages?: string | null;
  doi?: string | null;
  url?: string | null;
  abstractNote?: string | null;
  authors?: string[];
  year?: number | null;
}): SiteDocumentEntry {
  const title = sanitizeTitle(params.title);
  const url = params.url ?? (params.anchor instanceof HTMLAnchorElement ? params.anchor.href : location.href);

  return {
    entryId: `${params.siteId}:${params.doi ?? title ?? url}`,
    siteId: params.siteId,
    anchor: params.anchor,
    titleNode: params.titleNode,
    mountTarget: params.mountTarget ?? params.anchor.parentElement ?? params.titleNode,
    renderMode: params.renderMode ?? "inline",
    alignment: params.alignment ?? "left",
    showPlaceholderBadge: params.showPlaceholderBadge ?? false,
    actionVariant: params.actionVariant ?? "links",
    rankingMode: params.rankingMode ?? "default",
    rankingCandidates: uniqueValues([
      ...(params.rankingCandidates ?? []),
      params.journal,
      ...(params.rankingMode === "strict-source" ? [] : [params.title])
    ]),
    document: createDocumentRecord({
      id: `${params.siteId}:${params.doi ?? title ?? url}`,
      title,
      itemType: params.itemType ?? undefined,
      journal: params.journal ?? undefined,
      publisher: params.publisher ?? undefined,
      volume: params.volume ?? undefined,
      issue: params.issue ?? undefined,
      pages: params.pages ?? undefined,
      doi: params.doi ?? undefined,
      url,
      abstractNote: params.abstractNote ?? undefined,
      authors: params.authors ?? [],
      year: params.year ?? undefined
    })
  };
}
