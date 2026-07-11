import type { DocumentRecord } from "@scholartag/contracts";

export type LibraryExportField =
  | "title"
  | "itemType"
  | "authors"
  | "year"
  | "journal"
  | "publisher"
  | "volume"
  | "issue"
  | "pages"
  | "doi"
  | "url"
  | "abstractNote"
  | "tags"
  | "folders"
  | "rankingBadges"
  | "notes";

export const libraryExportFields: Array<{ id: LibraryExportField; label: string }> = [
  { id: "title", label: "标题" },
  { id: "itemType", label: "文献类型" },
  { id: "authors", label: "作者" },
  { id: "year", label: "年份" },
  { id: "journal", label: "期刊" },
  { id: "publisher", label: "出版社" },
  { id: "volume", label: "卷" },
  { id: "issue", label: "期" },
  { id: "pages", label: "页码" },
  { id: "doi", label: "DOI" },
  { id: "url", label: "URL" },
  { id: "abstractNote", label: "摘要" },
  { id: "tags", label: "标签" },
  { id: "folders", label: "文件夹" },
  { id: "rankingBadges", label: "期刊标签" },
  { id: "notes", label: "备注" }
];

const defaultExportFields = libraryExportFields.map((field) => field.id);

function escapeCsv(value: string) {
  const normalized = value.replaceAll('"', '""');
  return `"${normalized}"`;
}

function normalizeFields(fields?: LibraryExportField[]) {
  return fields?.length ? fields : defaultExportFields;
}

function fieldValue(document: DocumentRecord, field: LibraryExportField) {
  switch (field) {
    case "title":
      return document.title;
    case "itemType":
      return document.itemType ?? "";
    case "authors":
      return document.authors.join("; ");
    case "year":
      return document.year?.toString() ?? "";
    case "journal":
      return document.journal ?? "";
    case "publisher":
      return document.publisher ?? "";
    case "volume":
      return document.volume ?? "";
    case "issue":
      return document.issue ?? "";
    case "pages":
      return document.pages ?? "";
    case "doi":
      return document.doi ?? "";
    case "url":
      return document.url ?? "";
    case "abstractNote":
      return document.abstractNote ?? "";
    case "tags":
      return document.tags.join("; ");
    case "folders":
      return document.folderIds.join("; ");
    case "rankingBadges":
      return document.rankingBadges.map((badge) => `${badge.datasetName}:${badge.rankingLabel}`).join("; ");
    case "notes":
      return document.notes.join("; ");
  }
}

function documentToExportObject(document: DocumentRecord, fields: LibraryExportField[]) {
  return Object.fromEntries(fields.map((field) => [field, fieldValue(document, field)]));
}

function hasField(fields: LibraryExportField[], field: LibraryExportField) {
  return fields.includes(field);
}

export function exportDocumentsAsJson(documents: DocumentRecord[], fields?: LibraryExportField[]) {
  const selectedFields = normalizeFields(fields);
  return JSON.stringify(documents.map((document) => documentToExportObject(document, selectedFields)), null, 2);
}

export function exportDocumentsAsCsv(documents: DocumentRecord[], fields?: LibraryExportField[]) {
  const selectedFields = normalizeFields(fields);
  const header = selectedFields;
  const rows = documents.map((document) =>
    selectedFields
      .map((field) => fieldValue(document, field))
      .map((value) => escapeCsv(value))
      .join(",")
  );

  return [header.join(","), ...rows].join("\n");
}

export function exportDocumentsAsBibTeX(documents: DocumentRecord[], fields?: LibraryExportField[]) {
  const selectedFields = normalizeFields(fields);
  return documents
    .map((document, index) => {
      const citationKey =
        document.doi?.replaceAll("/", "_") ||
        `${document.authors[0] ?? "paperlabel"}_${document.year ?? "nd"}_${index + 1}`;
      const entryType = document.itemType === "conferencePaper" ? "inproceedings" : "article";

      return [
        `@${entryType}{${citationKey},`,
        hasField(selectedFields, "title") ? `  title = {${document.title}},` : "",
        hasField(selectedFields, "authors") ? `  author = {${document.authors.join(" and ")}},` : "",
        hasField(selectedFields, "journal") ? `  journal = {${document.journal ?? ""}},` : "",
        hasField(selectedFields, "publisher") ? `  publisher = {${document.publisher ?? ""}},` : "",
        hasField(selectedFields, "volume") ? `  volume = {${document.volume ?? ""}},` : "",
        hasField(selectedFields, "issue") ? `  number = {${document.issue ?? ""}},` : "",
        hasField(selectedFields, "pages") ? `  pages = {${document.pages ?? ""}},` : "",
        hasField(selectedFields, "year") ? `  year = {${document.year ?? ""}},` : "",
        hasField(selectedFields, "doi") ? `  doi = {${document.doi ?? ""}},` : "",
        hasField(selectedFields, "url") ? `  url = {${document.url ?? ""}},` : "",
        hasField(selectedFields, "abstractNote") ? `  abstract = {${document.abstractNote ?? ""}}` : "",
        "}"
      ].filter(Boolean).join("\n");
    })
    .join("\n\n");
}

export function exportDocumentsAsRis(documents: DocumentRecord[], fields?: LibraryExportField[]) {
  const selectedFields = normalizeFields(fields);
  return documents
    .map((document) => {
      const risType = document.itemType === "conferencePaper" ? "CPAPER" : "JOUR";
      const lines = [
        `TY  - ${risType}`,
        hasField(selectedFields, "title") ? `TI  - ${document.title}` : "",
        ...(hasField(selectedFields, "authors") ? document.authors.map((author) => `AU  - ${author}`) : []),
        hasField(selectedFields, "year") && document.year ? `PY  - ${document.year}` : "",
        hasField(selectedFields, "journal") && document.journal ? `JO  - ${document.journal}` : "",
        hasField(selectedFields, "publisher") && document.publisher ? `PB  - ${document.publisher}` : "",
        hasField(selectedFields, "volume") && document.volume ? `VL  - ${document.volume}` : "",
        hasField(selectedFields, "issue") && document.issue ? `IS  - ${document.issue}` : "",
        hasField(selectedFields, "pages") && document.pages ? `SP  - ${document.pages}` : "",
        hasField(selectedFields, "doi") && document.doi ? `DO  - ${document.doi}` : "",
        hasField(selectedFields, "url") && document.url ? `UR  - ${document.url}` : "",
        hasField(selectedFields, "abstractNote") && document.abstractNote ? `AB  - ${document.abstractNote}` : "",
        ...(hasField(selectedFields, "tags") ? document.tags.map((tag) => `KW  - ${tag}`) : []),
        ...(hasField(selectedFields, "notes") ? document.notes.map((note) => `N1  - ${note}`) : []),
        "ER  -"
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n\n");
}
