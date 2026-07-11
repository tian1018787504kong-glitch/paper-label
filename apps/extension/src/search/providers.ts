import type { SearchProvider } from "@paper-label/contracts";

const providers: SearchProvider[] = [
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
    id: "pubmed",
    name: "PubMed",
    baseUrl: "https://pubmed.ncbi.nlm.nih.gov/",
    queryTemplate: "?term={query}",
    allowedDomains: ["pubmed.ncbi.nlm.nih.gov"],
    requiresAuth: false,
    supportsProgrammaticDownload: false,
    status: "active"
  }
];

export function getDefaultProviders() {
  return providers;
}
