import type { SearchProvider } from "@paper-label/contracts";
import browser from "webextension-polyfill";
import { defineContentScript } from "wxt/utils/define-content-script";
import { getAvailableDatasets } from "../src/dataset-sources";
import { buildFullTextProviderUrl } from "../src/fulltext-url-builder/build";
import { resolveFullTextProvider } from "../src/fulltext-providers/resolve";
import { injectEntryControls } from "../src/page-injection/render";
import { getBadgePaletteForBadge } from "../src/ranking-badges/palette";
import { createBadgeStyleOverrideKey } from "../src/ranking-badges/style";
import { resolveRankingBadges } from "../src/ranking-engine/resolve-badges";
import { collectSiteEntries, shouldAttemptSiteCollection } from "../src/site-registry";
import {
  deleteBadgeStyleOverride,
  getBadgeStyleOverrides,
  getDatasetPreferences,
  getSettings,
  updateBadgeStyleOverride
} from "../src/storage/local-store";

type RuntimeMessage =
  | {
      type: "scholartag:save-document";
      payload: unknown;
    }
  | {
      type: "scholartag:toggle-document";
      payload: unknown;
    }
  | {
      type: "scholartag:get-document-state";
      payload: { documentId: string };
    };

type ProvidersResponse = { providers: SearchProvider[]; downloadProviders: SearchProvider[] };

type RenderConfig = {
  datasets: Awaited<ReturnType<typeof getAvailableDatasets>>;
  settings: Awaited<ReturnType<typeof getSettings>>;
  preference: Awaited<ReturnType<typeof getDatasetPreferences>>;
  badgeStyleOverrides: Awaited<ReturnType<typeof getBadgeStyleOverrides>>;
  providersResponse: ProvidersResponse;
};

const SCHOLARTAG_ROOT_SELECTOR = ".scholartag-inline-root";
const BADGE_STYLE_EDITOR_ID = "scholartag-badge-style-editor";
const RENDER_DEBOUNCE_MS = 150;
const MIN_RENDER_INTERVAL_MS = 900;
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

function isPaperLabelManagedNode(node: Node) {
  if (!isElementNode(node)) {
    return node.parentElement?.closest(SCHOLARTAG_ROOT_SELECTOR) != null;
  }

  return node.matches(SCHOLARTAG_ROOT_SELECTOR) || node.closest(SCHOLARTAG_ROOT_SELECTOR) != null;
}

function shouldIgnoreMutations(mutations: MutationRecord[]) {
  return mutations.every((mutation) => {
    const changedNodes = [...mutation.addedNodes, ...mutation.removedNodes];
    return changedNodes.length > 0 && changedNodes.every((node) => isPaperLabelManagedNode(node));
  });
}

function normalizeHexColor(input: string | null) {
  const value = input?.trim();
  if (!value) {
    return null;
  }

  return HEX_COLOR_PATTERN.test(value) ? value : null;
}

function uniqueBadgeKey(badge: { datasetId: string; recordId: string; rankingLabel: string }) {
  return `${badge.datasetId}:${badge.recordId}:${badge.rankingLabel}`;
}

function removeBadgeStyleEditor() {
  document.getElementById(BADGE_STYLE_EDITOR_ID)?.remove();
}

export default defineContentScript({
  matches: [
    "https://scholar.google.com/*",
    "https://xueshu.baidu.com/*",
    "https://pubmed.ncbi.nlm.nih.gov/*",
    "https://kns.cnki.net/*",
    "https://*.sciencedirect.com/*",
    "https://link.springer.com/*",
    "https://*.springer.com/*",
    "https://onlinelibrary.wiley.com/*",
    "https://ieeexplore.ieee.org/*",
    "https://dl.acm.org/*",
    "https://www.webofscience.com/*",
    "https://www.scopus.com/*",
    "https://www.tandfonline.com/*",
    "https://www.nature.com/*",
    "https://nature.com/*",
    "https://*.nature.com/*",
    "https://www.cell.com/*",
    "https://arxiv.org/*",
    "https://www.science.org/*",
    "https://pubs.acs.org/*",
    "https://pubs.aip.org/*",
    "https://iopscience.iop.org/*",
    "https://royalsocietypublishing.org/*",
    "https://www.mdpi.com/*",
    "https://www.frontiersin.org/*",
    "https://journals.plos.org/*",
    "https://academic.oup.com/*",
    "https://www.cambridge.org/*",
    "https://journals.sagepub.com/*",
    "https://www.emerald.com/*",
    "https://www.jstor.org/*",
    "https://www.biorxiv.org/*",
    "https://www.medrxiv.org/*",
    "https://www.pnas.org/*",
    "https://journals.asm.org/*"
  ],
  main() {
    if (!shouldAttemptSiteCollection(location.hostname, document)) {
      return;
    }

    const renderedEntryIds = new Set<string>();
    let cachedConfig: RenderConfig | null = null;
    let renderTimer: number | null = null;
    let isRendering = false;
    let rerenderRequested = false;
    let lastRenderStartedAt = 0;

    const openBadgeStyleEditor = (
      badge: { datasetId: string; rankingLabel: string; datasetName: string },
      palette: { background: string; color: string },
      event: MouseEvent
    ) => {
      removeBadgeStyleEditor();

      const panel = document.createElement("div");
      panel.id = BADGE_STYLE_EDITOR_ID;
      panel.style.position = "fixed";
      panel.style.zIndex = "2147483647";
      panel.style.minWidth = "220px";
      panel.style.padding = "12px";
      panel.style.borderRadius = "14px";
      panel.style.background = "#fffdf9";
      panel.style.border = "1px solid rgba(90,74,57,0.14)";
      panel.style.boxShadow = "0 16px 40px rgba(42,31,20,0.18)";
      panel.style.fontFamily =
        '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",Arial,sans-serif';
      panel.style.fontSize = "12px";
      panel.style.color = "#433628";
      panel.style.top = `${Math.min(event.clientY + 8, window.innerHeight - 180)}px`;
      panel.style.left = `${Math.min(event.clientX + 8, window.innerWidth - 240)}px`;

      const title = document.createElement("div");
      title.textContent = `标签颜色：${badge.rankingLabel}`;
      title.style.fontWeight = "700";
      title.style.marginBottom = "10px";

      const source = document.createElement("div");
      source.textContent = badge.datasetName;
      source.style.fontSize = "11px";
      source.style.color = "#8a7765";
      source.style.marginBottom = "10px";

      const preview = document.createElement("span");
      preview.textContent = badge.rankingLabel;
      preview.style.display = "inline-flex";
      preview.style.alignItems = "center";
      preview.style.justifyContent = "center";
      preview.style.borderRadius = "999px";
      preview.style.padding = "2px 8px";
      preview.style.fontSize = "11px";
      preview.style.fontWeight = "700";
      preview.style.marginBottom = "10px";

      const backgroundRow = document.createElement("label");
      backgroundRow.style.display = "flex";
      backgroundRow.style.alignItems = "center";
      backgroundRow.style.justifyContent = "space-between";
      backgroundRow.style.gap = "12px";
      backgroundRow.style.marginBottom = "8px";
      backgroundRow.textContent = "背景色";

      const backgroundInput = document.createElement("input");
      backgroundInput.type = "color";
      backgroundInput.value = normalizeHexColor(palette.background) ?? "#ffd9df";
      backgroundInput.style.width = "42px";
      backgroundInput.style.height = "28px";
      backgroundInput.style.padding = "0";
      backgroundInput.style.border = "0";
      backgroundInput.style.background = "transparent";
      backgroundInput.style.cursor = "pointer";
      backgroundRow.appendChild(backgroundInput);

      const colorRow = document.createElement("label");
      colorRow.style.display = "flex";
      colorRow.style.alignItems = "center";
      colorRow.style.justifyContent = "space-between";
      colorRow.style.gap = "12px";
      colorRow.style.marginBottom = "12px";
      colorRow.textContent = "文字色";

      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = normalizeHexColor(palette.color) ?? "#7e1730";
      colorInput.style.width = "42px";
      colorInput.style.height = "28px";
      colorInput.style.padding = "0";
      colorInput.style.border = "0";
      colorInput.style.background = "transparent";
      colorInput.style.cursor = "pointer";
      colorRow.appendChild(colorInput);

      const actionRow = document.createElement("div");
      actionRow.style.display = "flex";
      actionRow.style.justifyContent = "space-between";
      actionRow.style.gap = "8px";

      const resetButton = document.createElement("button");
      resetButton.type = "button";
      resetButton.textContent = "恢复默认";
      resetButton.style.border = "0";
      resetButton.style.background = "transparent";
      resetButton.style.color = "#8b6c54";
      resetButton.style.cursor = "pointer";
      resetButton.style.padding = "0";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "保存";
      saveButton.style.border = "0";
      saveButton.style.borderRadius = "999px";
      saveButton.style.background = "#bf4f24";
      saveButton.style.color = "#fffaf1";
      saveButton.style.cursor = "pointer";
      saveButton.style.padding = "6px 12px";
      saveButton.style.fontWeight = "700";

      const updatePreview = () => {
        preview.style.background = backgroundInput.value;
        preview.style.color = colorInput.value;
      };

      updatePreview();
      backgroundInput.addEventListener("input", updatePreview);
      colorInput.addEventListener("input", updatePreview);

      resetButton.addEventListener("click", async () => {
        const overrideKey = createBadgeStyleOverrideKey(badge);
        await deleteBadgeStyleOverride(overrideKey);
        removeBadgeStyleEditor();
        cachedConfig = null;
        void scheduleRender(true);
      });

      saveButton.addEventListener("click", async () => {
        const overrideKey = createBadgeStyleOverrideKey(badge);
        await updateBadgeStyleOverride(overrideKey, {
          background: backgroundInput.value,
          color: colorInput.value
        });
        removeBadgeStyleEditor();
        cachedConfig = null;
        void scheduleRender(true);
      });

      actionRow.append(resetButton, saveButton);
      panel.append(title, source, preview, backgroundRow, colorRow, actionRow);
      panel.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
      });
      panel.addEventListener("contextmenu", (contextEvent) => {
        contextEvent.preventDefault();
        contextEvent.stopPropagation();
      });
      document.body.appendChild(panel);

      window.setTimeout(() => {
        const closeEditor = (nextEvent: Event) => {
          const target = nextEvent.target as Node | null;
          if (target && panel.contains(target)) {
            return;
          }
          removeBadgeStyleEditor();
          document.removeEventListener("click", closeEditor, true);
          document.removeEventListener("scroll", closeEditor, true);
        };

        document.addEventListener("click", closeEditor, true);
        document.addEventListener("scroll", closeEditor, true);
      }, 0);
    };

    const loadConfig = async (forceRefresh = false) => {
      if (cachedConfig && !forceRefresh) {
        return cachedConfig;
      }

      const [datasets, settings, preference, badgeStyleOverrides, providersResponse] = await Promise.all([
        getAvailableDatasets(),
        getSettings(),
        getDatasetPreferences(),
        getBadgeStyleOverrides(),
        browser.runtime.sendMessage({
          type: "scholartag:get-providers"
        }) as Promise<ProvidersResponse>
      ]);

      cachedConfig = {
        datasets,
        settings,
        preference,
        badgeStyleOverrides,
        providersResponse
      };

      return cachedConfig;
    };

    const render = async () => {
      if (isRendering) {
        rerenderRequested = true;
        return;
      }

      isRendering = true;
      lastRenderStartedAt = Date.now();

      try {
        const { datasets, settings, preference, badgeStyleOverrides, providersResponse } = await loadConfig();

        const activeDatasets = [...datasets].sort((left, right) => {
          const leftOrder = preference.configs.find((item) => item.datasetId === left.id)?.order ?? 0;
          const rightOrder = preference.configs.find((item) => item.datasetId === right.id)?.order ?? 0;
          return leftOrder - rightOrder;
        });

        const entries = collectSiteEntries(document);

        for (const [entryIndex, entry] of entries.entries()) {
          const badgeMap = new Map(
            resolveRankingBadges(entry.document, activeDatasets, {
              activeConfigs: preference.configs,
              includeTitleCandidate: entry.rankingMode !== "strict-source"
            }).map((badge) => [uniqueBadgeKey(badge), badge])
          );

          for (const candidate of entry.rankingCandidates ?? []) {
            resolveRankingBadges(entry.document, activeDatasets, {
              activeConfigs: preference.configs,
              manualQuery: candidate,
              includeTitleCandidate: entry.rankingMode !== "strict-source"
            }).forEach((badge) => {
              badgeMap.set(uniqueBadgeKey(badge), badge);
            });
          }

          const badges = [...badgeMap.values()].filter(
            (badge) => preference.configs.find((item) => item.datasetId === badge.datasetId)?.visible ?? true
          );

          const existingRoot = document.querySelector(
            `${SCHOLARTAG_ROOT_SELECTOR}[data-entry-id="${CSS.escape(entry.entryId)}"]`
          );

          if (renderedEntryIds.has(entry.entryId) && existingRoot) {
            continue;
          }

          const currentDocument = {
            ...entry.document,
            rankingBadges: badges
          };

          const savedState = (await browser.runtime.sendMessage({
            type: "scholartag:get-document-state",
            payload: { documentId: currentDocument.id }
          } satisfies RuntimeMessage)) as { saved?: boolean } | undefined;

          const mountControls = (documentState: typeof currentDocument) => {
            injectEntryControls(entry, {
              badges: documentState.rankingBadges,
              badgeStyleOverrides,
              settings,
              showFloatingActions: entryIndex === 0,
              initiallySaved: savedState?.saved ?? false,
              diagnostics: {
                title: documentState.title,
                journal: documentState.journal ?? null,
                doi: documentState.doi ?? null,
                url: documentState.url ?? null,
                year: documentState.year ?? null,
                siteId: entry.siteId,
                entryId: entry.entryId,
                rankingMode: entry.rankingMode,
                rankingCandidates: entry.rankingCandidates ?? [],
                badges: documentState.rankingBadges
              },
              onSave: async () => {
                const message: RuntimeMessage = {
                  type: "scholartag:toggle-document",
                  payload: documentState
                };
                const response = (await browser.runtime.sendMessage(message)) as { saved: boolean };
                return response;
              },
              onFullText: async () => {
                const provider = resolveFullTextProvider(providersResponse.providers, settings.defaultSearchProvider, {
                  title: documentState.title,
                  doi: documentState.doi ?? undefined,
                  url: documentState.url ?? undefined
                });
                if (!provider) {
                  return;
                }
                const url = buildFullTextProviderUrl(provider, {
                  title: documentState.title,
                  doi: documentState.doi ?? undefined,
                  url: documentState.url ?? undefined
                });
                window.open(url, "_blank", "noopener,noreferrer");
              },
              onDownloadFullText: async () => {
                const provider =
                  providersResponse.downloadProviders.find((item) => item.id === settings.defaultDownloadProvider) ??
                  providersResponse.downloadProviders[0];
                if (!provider) {
                  return;
                }
                const url = buildFullTextProviderUrl(provider, {
                  title: documentState.title,
                  doi: documentState.doi ?? undefined,
                  url: documentState.url ?? undefined
                });
                window.open(url, "_blank", "noopener,noreferrer");
              },
              onBadgeContextMenu: async (badge, event) => {
                const currentPalette = getBadgePaletteForBadge(badge, badgeStyleOverrides);
                openBadgeStyleEditor(badge, currentPalette, event);
              }
            });
          };

          mountControls(currentDocument);
          renderedEntryIds.add(entry.entryId);
        }
      } finally {
        isRendering = false;
      }

      if (rerenderRequested) {
        rerenderRequested = false;
        void scheduleRender(true);
      }
    };

    const scheduleRender = async (forceRefreshConfig = false) => {
      if (forceRefreshConfig) {
        cachedConfig = null;
        renderedEntryIds.clear();
        document.querySelectorAll(SCHOLARTAG_ROOT_SELECTOR).forEach((node) => node.remove());
      }

      if (renderTimer !== null) {
        window.clearTimeout(renderTimer);
      }

      const elapsedSinceLastRender = Date.now() - lastRenderStartedAt;
      const delay = forceRefreshConfig
        ? RENDER_DEBOUNCE_MS
        : Math.max(RENDER_DEBOUNCE_MS, MIN_RENDER_INTERVAL_MS - elapsedSinceLastRender);

      renderTimer = window.setTimeout(() => {
        renderTimer = null;
        void render();
      }, delay);
    };

    void loadConfig().then(() => render());

    const observer = new MutationObserver((mutations) => {
      if (isRendering || shouldIgnoreMutations(mutations)) {
        return;
      }

      void scheduleRender();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local") {
        return;
      }

      if (
        "settings" in changes ||
        "localDatasets" in changes ||
        "datasetPreferences" in changes ||
        "badgeStyleOverrides" in changes
      ) {
        void scheduleRender(true);
      }
    });
  }
});
