import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  parseBaiduScholarJournal,
  parseCnkiSearchJournal,
  parseGoogleScholarJournal,
  parsePubMedSearchJournal
} from "../src/site-adapters/search-source-parsers";

const cases: Array<{
  name: string;
  actual: string | undefined;
  expected: string | undefined;
}> = [
  {
    name: "Google Scholar: standard journal result",
    actual: parseGoogleScholarJournal(
      "M Granlund, J Taipaleenmäki - Management Accounting Research, 2005 - Elsevier",
      "Management control and controllership in new economy firms"
    ),
    expected: "Management Accounting Research"
  },
  {
    name: "Google Scholar: book result must not be ranked",
    actual: parseGoogleScholarJournal(
      "T Reichmann - Controlling: concepts of management control, 2012 - books.google.com",
      "[BOOK] Controlling: concepts of management control"
    ),
    expected: undefined
  },
  {
    name: "Google Scholar: missing publication must not fall back to title",
    actual: parseGoogleScholarJournal("A Author - 2020 - example.edu", "Nature"),
    expected: undefined
  },
  {
    name: "Google Scholar: truncated publication is unreliable",
    actual: parseGoogleScholarJournal("A Author - Proceedings of the ..., 1999 - pnas.org", "Biochemical characterization"),
    expected: undefined
  },
  {
    name: "Baidu Scholar: explicit source",
    actual: parseBaiduScholarJournal("会计研究", "张三 - 会计研究 - 2024"),
    expected: "会计研究"
  },
  {
    name: "Baidu Scholar: source label cleanup",
    actual: parseBaiduScholarJournal("来源：管理世界", ""),
    expected: "管理世界"
  },
  {
    name: "Baidu Scholar: whole metadata without structure is rejected",
    actual: parseBaiduScholarJournal("", "作者 摘要 出版社 2024"),
    expected: undefined
  },
  {
    name: "CNKI: journal source cell",
    actual: parseCnkiSearchJournal("《会计研究》 2025年第3期"),
    expected: "会计研究"
  },
  {
    name: "CNKI: degree thesis source is rejected",
    actual: parseCnkiSearchJournal("学位论文"),
    expected: undefined
  },
  {
    name: "PubMed: abbreviated journal citation",
    actual: parsePubMedSearchJournal("Proc Natl Acad Sci U S A. 2020 Apr 7;117(14):7783-7792."),
    expected: "Proc Natl Acad Sci U S A"
  },
  {
    name: "PubMed: full journal title citation",
    actual: parsePubMedSearchJournal("Nature Communications. 2024 Jan 2;15(1):12."),
    expected: "Nature Communications"
  },
  {
    name: "PubMed: empty citation",
    actual: parsePubMedSearchJournal(""),
    expected: undefined
  }
];

for (const testCase of cases) {
  assert.equal(testCase.actual, testCase.expected, testCase.name);
}

const contentScriptSource = readFileSync(resolve(import.meta.dirname, "../entrypoints/content.ts"), "utf8");
assert.equal(
  contentScriptSource.includes('"https://*/*"') || contentScriptSource.includes('"http://*/*"'),
  false,
  "content script must not run on every website"
);

console.log(`Search source parser checks passed: ${cases.length}; content scope check passed`);
