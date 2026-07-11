export function normalizeText(input: string | null | undefined) {
  return (input ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[：:]\s*/g, ": ")
    .replace(/[|｜]/g, " ")
    .replace(/[·•]/g, " ")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ");
}

export function normalizeJournalText(input: string | null | undefined) {
  return normalizeText(input)
    .replace(/^publisher:\s*/i, "")
    .replace(/^published in:\s*/i, "")
    .replace(/^source:\s*/i, "")
    .replace(/\bvolume\s*[:\d].*$/i, "")
    .replace(/\bvol\.\s*\d.*$/i, "")
    .replace(/\bissue\s*[:\d].*$/i, "")
    .replace(/\b\d{4}\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeIssn(input: string | null | undefined) {
  return (input ?? "").replace(/[^0-9xX]/g, "").toUpperCase();
}

export function normalizeDoi(input: string | null | undefined) {
  return normalizeText(input).replace(/^doi:\s*/i, "");
}
