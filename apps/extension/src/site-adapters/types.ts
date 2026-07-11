import type { DocumentRecord } from "@scholartag/contracts";

export type SupportedSiteId =
  | "google-scholar"
  | "baidu-scholar"
  | "pubmed"
  | "cnki"
  | "sciencedirect"
  | "publisher-detail"
  | "generic";

export type SiteDocumentEntry = {
  entryId: string;
  siteId: SupportedSiteId;
  anchor: HTMLElement;
  titleNode: HTMLElement;
  mountTarget: HTMLElement;
  renderMode: "inline" | "stacked";
  alignment?: "left" | "center";
  showPlaceholderBadge?: boolean;
  actionVariant?: "links" | "boxed";
  rankingMode?: "default" | "strict-source";
  rankingCandidates?: string[];
  document: DocumentRecord;
};

export interface SiteAdapter {
  id: SupportedSiteId;
  matches(hostname: string): boolean;
  collectEntries(
    root: Document,
    context?: {
      hostname?: string;
      url?: string;
      pageTitle?: string;
    }
  ): SiteDocumentEntry[];
}
