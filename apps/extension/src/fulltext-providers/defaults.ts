import type { SearchProvider } from "@scholartag/contracts";

const providers: SearchProvider[] = [
  {
    id: "cnki",
    name: "知网",
    baseUrl: "https://kns.cnki.net/kns8s/defaultresult/index",
    queryTemplate: "?kw={query}",
    allowedDomains: ["kns.cnki.net", "www.cnki.net"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  },
  {
    id: "google-scholar",
    name: "Google Scholar",
    baseUrl: "https://scholar.google.com/scholar",
    queryTemplate: "?q={query}",
    allowedDomains: ["scholar.google.com"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  },
  {
    id: "baidu-scholar",
    name: "Baidu Scholar",
    baseUrl: "https://xueshu.baidu.com/s",
    queryTemplate: "?wd={query}",
    allowedDomains: ["xueshu.baidu.com"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  },
  {
    id: "pubmed",
    name: "PubMed",
    baseUrl: "https://pubmed.ncbi.nlm.nih.gov/",
    queryTemplate: "?term={query}",
    allowedDomains: ["pubmed.ncbi.nlm.nih.gov"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  },
  {
    id: "crossref",
    name: "Crossref",
    baseUrl: "https://search.crossref.org/",
    queryTemplate: "?q={query}",
    allowedDomains: ["search.crossref.org"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  },
  {
    id: "doi-resolver",
    name: "DOI Resolver",
    baseUrl: "https://doi.org/",
    queryTemplate: "{query}",
    allowedDomains: ["doi.org"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  }
];

export function getDefaultFullTextProviders() {
  return providers;
}
