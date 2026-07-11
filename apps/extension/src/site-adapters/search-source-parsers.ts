function compact(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function stripOuterPunctuation(value: string) {
  return value
    .replace(/^[《“"'‘【\[]+/, "")
    .replace(/[》”"'’】\]]+$/, "")
    .trim();
}

function isYearOnly(value: string) {
  return /^(?:19|20)\d{2}(?:\s*[-–—]\s*(?:19|20)\d{2})?$/.test(value);
}

function isDomainLike(value: string) {
  return /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/.*)?$/i.test(value);
}

function isUnreliableSource(value: string) {
  const normalized = compact(value).toLowerCase();
  if (!normalized || normalized.length < 2) {
    return true;
  }
  if (normalized.includes("...") || normalized.includes("…")) {
    return true;
  }
  if (isYearOnly(normalized) || isDomainLike(normalized)) {
    return true;
  }
  return [
    "book",
    "books",
    "patent",
    "citation",
    "repository",
    "preprint",
    "thesis",
    "dissertation",
    "conference paper",
    "学位论文",
    "会议论文",
    "专利",
    "图书",
    "报纸",
    "网页"
  ].some((token) => normalized === token || normalized.startsWith(`${token} `));
}

function finalizeSource(value: string | null | undefined) {
  const cleaned = stripOuterPunctuation(
    compact(value)
      .replace(/^(?:来源|刊名|期刊|source|journal)\s*[:：]\s*/i, "")
      .replace(/\s*[|｜]\s*.*$/, "")
      .trim()
  );
  return isUnreliableSource(cleaned) ? undefined : cleaned;
}

export function parseGoogleScholarJournal(metaText: string, titleText = "") {
  if (/^\s*\[(?:book|citation|patent)\]/i.test(titleText)) {
    return undefined;
  }

  const segments = compact(metaText)
    .split(/\s+-\s+/)
    .map(compact)
    .filter(Boolean);
  if (segments.length < 2) {
    return undefined;
  }

  const publicationSegment = segments[1]
    ?.replace(/,\s*(?:19|20)\d{2}\b.*$/, "")
    .replace(/\b(?:19|20)\d{2}\b.*$/, "")
    .trim();

  return finalizeSource(publicationSegment);
}

export function parseBaiduScholarJournal(sourceText: string, metaText = "") {
  const directSource = finalizeSource(sourceText);
  if (directSource) {
    return directSource;
  }

  const segments = compact(metaText)
    .split(/\s+-\s+/)
    .map(compact)
    .filter(Boolean);
  if (segments.length < 3) {
    return undefined;
  }

  const middleSegments = segments.slice(1, -1);
  return middleSegments.map(finalizeSource).find(Boolean);
}

export function parseCnkiSearchJournal(sourceText: string) {
  return finalizeSource(
    compact(sourceText)
      .replace(/\s+(?:19|20)\d{2}(?:-\d{1,2})?.*$/, "")
      .replace(/\s+(?:第?\d+[卷期]).*$/, "")
  );
}

export function parsePubMedSearchJournal(citationText: string) {
  const citation = compact(citationText);
  if (!citation) {
    return undefined;
  }

  const beforeDate = citation
    .split(/\.\s+(?=(?:19|20)\d{2}\b)/)[0]
    ?.replace(/\s+(?:19|20)\d{2}\b.*$/, "")
    .replace(/[.;,\s]+$/, "")
    .trim();

  return finalizeSource(beforeDate);
}
