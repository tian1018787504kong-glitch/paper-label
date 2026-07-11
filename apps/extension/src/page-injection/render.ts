import type { RankingBadgeSnapshot } from "@scholartag/contracts";
import browser from "webextension-polyfill";
import { getBadgePaletteForBadge } from "../ranking-badges/palette";
import type { BadgeStyleOverrides } from "../ranking-badges/style";
import type { SiteDocumentEntry } from "../site-adapters/types";
import type { Settings } from "../storage/local-store";

const ROOT_CLASS = "scholartag-inline-root";
const BADGE_ROW_CLASS = "scholartag-badge-row";
const FLOATING_ACTION_ROOT_ID = "scholartag-floating-actions";
const FLOATING_ACTION_POSITION_KEY = "scholartag:floating-action-position";

type FloatingActionPosition = {
  left: number;
  top: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readTitleFontSize(entry: SiteDocumentEntry) {
  const parsed = Number.parseFloat(window.getComputedStyle(entry.titleNode).fontSize);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
}

function getBadgeSizing(entry: SiteDocumentEntry, settings?: Pick<Settings, "badgeSizeScale">) {
  const scale = clamp(settings?.badgeSizeScale ?? 1, 0.75, 1.6);
  const titleFontSize = readTitleFontSize(entry);
  const maxFontSize = entry.renderMode === "inline" ? 12 : 14;
  const baseFontSize = clamp(titleFontSize * 0.34, 10, maxFontSize);
  const basePaddingY = clamp(baseFontSize * 0.18, 2, 4);
  const basePaddingX = clamp(baseFontSize * 0.72, 7, 11);

  return {
    fontSize: `${Math.round(baseFontSize * scale * 10) / 10}px`,
    padding: `${Math.round(basePaddingY * scale)}px ${Math.round(basePaddingX * scale)}px`
  };
}

function createRoot(entry: SiteDocumentEntry) {
  const root = document.createElement(entry.renderMode === "stacked" ? "div" : "span");
  root.className = ROOT_CLASS;
  root.dataset.siteId = entry.siteId;
  root.dataset.entryId = entry.entryId;

  if (entry.renderMode === "stacked") {
    root.style.display = "grid";
    root.style.gap = "3px";
    root.style.marginTop = entry.siteId === "google-scholar" ? "1px" : "5px";
    root.style.marginLeft = "0";
    root.style.justifyItems = entry.alignment === "center" ? "center" : "start";
  } else {
    root.style.display = "inline-flex";
    root.style.flexWrap = "wrap";
    root.style.alignItems = "center";
    root.style.gap = "6px";
    root.style.marginLeft = "8px";
    root.style.verticalAlign = "middle";
  }
  return root;
}

function createPill(text: string, sizing: { fontSize: string; padding: string }) {
  const pill = document.createElement("span");
  pill.textContent = text;
  pill.style.border = "0";
  pill.style.borderRadius = "999px";
  pill.style.padding = sizing.padding;
  pill.style.fontSize = sizing.fontSize;
  pill.style.fontWeight = "600";
  pill.style.lineHeight = "1.45";
  pill.style.fontFamily = "inherit";
  pill.style.whiteSpace = "nowrap";
  return pill;
}

function createBadgePill(
  entry: SiteDocumentEntry,
  badge: RankingBadgeSnapshot,
  settings: Pick<Settings, "badgeSizeScale"> | undefined,
  badgeStyleOverrides?: BadgeStyleOverrides,
  onBadgeContextMenu?: (badge: RankingBadgeSnapshot, event: MouseEvent) => Promise<void>
) {
  const pill = createPill(badge.rankingLabel, getBadgeSizing(entry, settings));
  const palette = getBadgePaletteForBadge(badge, badgeStyleOverrides);
  pill.style.background = palette.background;
  pill.style.color = palette.color;
  pill.style.cursor = onBadgeContextMenu ? "context-menu" : "default";
  pill.title = onBadgeContextMenu
    ? `${badge.datasetName} · ${badge.datasetVersion}（右键可改颜色）`
    : `${badge.datasetName} · ${badge.datasetVersion}`;

  if (onBadgeContextMenu) {
    pill.addEventListener("contextmenu", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await onBadgeContextMenu(badge, event);
    });
  }

  return pill;
}

function createFloatingButton(text: string, title: string, variant: "primary" | "secondary") {
  const button = document.createElement("button");
  button.textContent = text;
  button.type = "button";
  button.title = title;
  button.style.minWidth = "78px";
  button.style.height = "38px";
  button.style.padding = "0 13px";
  button.style.border = "1px solid rgba(126, 85, 50, 0.14)";
  button.style.borderRadius = "999px";
  button.style.background = variant === "primary" ? "#bf4f24" : "#fffaf5";
  button.style.color = variant === "primary" ? "#fffaf1" : "#5a5f9a";
  button.style.cursor = "pointer";
  button.style.fontSize = "13px";
  button.style.fontWeight = variant === "primary" ? "700" : "500";
  button.style.lineHeight = "1";
  button.style.fontFamily =
    '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",Arial,sans-serif';
  button.style.boxShadow = "0 8px 24px rgba(40, 31, 20, 0.12)";
  return button;
}

function markFloatingButtonPressed(button: HTMLButtonElement, text: string, title: string) {
  button.textContent = text;
  button.title = title;
  button.style.background = "#edf7ee";
  button.style.color = "#1f6b3a";
  button.style.border = "1px solid rgba(31, 107, 58, 0.22)";
  button.style.boxShadow = "0 8px 24px rgba(31, 107, 58, 0.16)";
}

function resetFloatingButton(button: HTMLButtonElement, text: string, title: string, variant: "primary" | "secondary") {
  button.textContent = text;
  button.title = title;
  button.style.background = variant === "primary" ? "#bf4f24" : "#fffaf5";
  button.style.color = variant === "primary" ? "#fffaf1" : "#5a5f9a";
  button.style.border = "1px solid rgba(126, 85, 50, 0.14)";
  button.style.boxShadow = "0 8px 24px rgba(40, 31, 20, 0.12)";
}

function clampFloatingPosition(root: HTMLElement, position: FloatingActionPosition) {
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - root.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - root.offsetHeight - margin);
  return {
    left: clamp(position.left, margin, maxLeft),
    top: clamp(position.top, margin, maxTop)
  };
}

function applyFloatingPosition(root: HTMLElement, position: FloatingActionPosition) {
  const bounded = clampFloatingPosition(root, position);
  root.style.left = `${bounded.left}px`;
  root.style.top = `${bounded.top}px`;
  root.style.right = "auto";
  root.style.transform = "none";
  return bounded;
}

async function restoreFloatingPosition(root: HTMLElement) {
  const stored = await browser.storage.local.get(FLOATING_ACTION_POSITION_KEY);
  const position = stored[FLOATING_ACTION_POSITION_KEY] as FloatingActionPosition | undefined;
  if (
    position &&
    Number.isFinite(position.left) &&
    Number.isFinite(position.top) &&
    root.isConnected
  ) {
    applyFloatingPosition(root, position);
  }
}

function makeFloatingActionsDraggable(root: HTMLElement, handle: HTMLElement) {
  let activePointerId: number | undefined;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    const rect = root.getBoundingClientRect();
    activePointerId = event.pointerId;
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    handle.setPointerCapture(event.pointerId);
    handle.style.cursor = "grabbing";
    event.preventDefault();
  });

  handle.addEventListener("pointermove", (event) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    applyFloatingPosition(root, {
      left: event.clientX - offsetX,
      top: event.clientY - offsetY
    });
  });

  const finishDrag = async (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      return;
    }
    activePointerId = undefined;
    handle.style.cursor = "grab";
    const rect = root.getBoundingClientRect();
    const position = applyFloatingPosition(root, { left: rect.left, top: rect.top });
    await browser.storage.local.set({ [FLOATING_ACTION_POSITION_KEY]: position });
  };

  handle.addEventListener("pointerup", finishDrag);
  handle.addEventListener("pointercancel", finishDrag);

  window.addEventListener("resize", () => {
    if (!root.isConnected) {
      return;
    }
    const rect = root.getBoundingClientRect();
    applyFloatingPosition(root, { left: rect.left, top: rect.top });
  });
}

function createBadgeRow(entry: SiteDocumentEntry) {
  const row = document.createElement("div");
  row.className = BADGE_ROW_CLASS;
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.flexWrap = "wrap";
  row.style.gap = entry.siteId === "cnki" ? "6px" : "5px";
  if (entry.siteId === "google-scholar") {
    row.style.gap = "4px";
  }
  return row;
}

function styleRootBySite(entry: SiteDocumentEntry, root: HTMLElement) {
  if (entry.siteId === "cnki") {
    root.style.fontFamily =
      '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",sans-serif';
  }

  if (entry.siteId === "google-scholar") {
    root.style.fontFamily = 'Arial,"Helvetica Neue",Helvetica,sans-serif';
    root.style.maxWidth = "100%";
    root.style.lineHeight = "1.2";
  }

  if (entry.siteId === "cnki" && entry.alignment === "center") {
    root.style.width = "100%";
  }
}

type InjectControlsOptions = {
  badges: RankingBadgeSnapshot[];
  badgeStyleOverrides?: BadgeStyleOverrides;
  settings?: Pick<Settings, "badgeSizeScale" | "diagnosticsEnabled">;
  showFloatingActions?: boolean;
  initiallySaved?: boolean;
  diagnostics?: {
    title: string;
    journal?: string | null;
    doi?: string | null;
    url?: string | null;
    year?: string | number | null;
    siteId: string;
    entryId: string;
    rankingMode?: "default" | "strict-source";
    rankingCandidates?: string[];
    badges: RankingBadgeSnapshot[];
  };
  onSave(): Promise<{ saved: boolean }>;
  onFullText(): Promise<void>;
  onDownloadFullText(): Promise<void>;
  onBadgeContextMenu?(badge: RankingBadgeSnapshot, event: MouseEvent): Promise<void>;
};

function createDiagnosticsPanel(diagnostics: NonNullable<InjectControlsOptions["diagnostics"]>) {
  document.getElementById("scholartag-diagnostics-panel")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "scholartag-diagnostics-panel";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "2147483647";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.padding = "24px";
  overlay.style.background = "rgba(20, 16, 12, 0.36)";
  overlay.style.backdropFilter = "blur(2px)";

  const panel = document.createElement("div");
  panel.style.width = "min(760px, 92vw)";
  panel.style.maxHeight = "82vh";
  panel.style.overflow = "auto";
  panel.style.borderRadius = "20px";
  panel.style.background = "#fffaf3";
  panel.style.border = "1px solid rgba(126, 85, 50, 0.16)";
  panel.style.boxShadow = "0 24px 70px rgba(20, 16, 12, 0.28)";
  panel.style.padding = "22px";
  panel.style.fontFamily =
    '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",Arial,sans-serif';
  panel.style.color = "#241f19";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "16px";
  header.style.marginBottom = "14px";

  const title = document.createElement("h2");
  title.textContent = "paper-label 页面诊断";
  title.style.margin = "0";
  title.style.fontSize = "20px";

  const closeButton = createFloatingButton("关闭", "关闭诊断面板", "secondary");
  closeButton.addEventListener("click", () => overlay.remove());
  header.append(title, closeButton);

  const hint = document.createElement("p");
  hint.textContent = "这个面板只在隐藏测试模式开启时出现，用来判断原站页面是元数据没抽到，还是期刊标签数据没有命中。";
  hint.style.margin = "0 0 16px";
  hint.style.color = "#6d7465";
  hint.style.fontSize = "13px";
  hint.style.lineHeight = "1.7";

  const fields: Array<[string, string]> = [
    ["站点", diagnostics.siteId],
    ["匹配模式", diagnostics.rankingMode === "strict-source" ? "搜索页严格来源匹配" : "详情页完整匹配"],
    ["入口 ID", diagnostics.entryId],
    ["标题", diagnostics.title || "未识别"],
    ["期刊/来源", diagnostics.journal || "未识别"],
    ["DOI", diagnostics.doi || "未识别"],
    ["年份", diagnostics.year ? String(diagnostics.year) : "未识别"],
    ["URL", diagnostics.url || window.location.href],
    ["候选期刊名", diagnostics.rankingCandidates?.length ? diagnostics.rankingCandidates.join("；") : "无"],
    [
      "命中标签",
      diagnostics.badges.length
        ? diagnostics.badges.map((badge) => `${badge.datasetName}: ${badge.rankingLabel}`).join("；")
        : "未命中"
    ]
  ];

  const table = document.createElement("div");
  table.style.display = "grid";
  table.style.gap = "8px";

  for (const [label, value] of fields) {
    const row = document.createElement("div");
    row.style.display = "grid";
    row.style.gridTemplateColumns = "108px minmax(0, 1fr)";
    row.style.gap = "12px";
    row.style.alignItems = "start";
    row.style.padding = "10px 12px";
    row.style.borderRadius = "12px";
    row.style.background = "rgba(238, 232, 219, 0.62)";

    const key = document.createElement("strong");
    key.textContent = label;
    key.style.color = "#7e5532";
    key.style.fontSize = "13px";

    const text = document.createElement("span");
    text.textContent = value;
    text.style.fontSize = "13px";
    text.style.lineHeight = "1.6";
    text.style.wordBreak = "break-word";

    row.append(key, text);
    table.appendChild(row);
  }

  panel.append(header, hint, table);
  overlay.appendChild(panel);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.remove();
    }
  });
  document.body.appendChild(overlay);
}

function injectFloatingActions(entry: SiteDocumentEntry, options: InjectControlsOptions) {
  if (!options.showFloatingActions) {
    return;
  }

  document.getElementById(FLOATING_ACTION_ROOT_ID)?.remove();

  const root = document.createElement("div");
  root.id = FLOATING_ACTION_ROOT_ID;
  root.dataset.entryId = entry.entryId;
  root.style.position = "fixed";
  root.style.right = "22px";
  root.style.top = "48%";
  root.style.transform = "translateY(-50%)";
  root.style.zIndex = "2147483646";
  root.style.display = "grid";
  root.style.gap = "8px";
  root.style.padding = "8px";
  root.style.borderRadius = "999px";
  root.style.background = "rgba(255, 253, 249, 0.92)";
  root.style.border = "1px solid rgba(126, 85, 50, 0.12)";
  root.style.boxShadow = "0 12px 34px rgba(42, 31, 20, 0.16)";
  root.style.backdropFilter = "blur(8px)";

  const dragHandle = document.createElement("div");
  dragHandle.textContent = "拖动";
  dragHandle.title = "按住拖动悬浮框";
  dragHandle.style.height = "20px";
  dragHandle.style.display = "flex";
  dragHandle.style.alignItems = "center";
  dragHandle.style.justifyContent = "center";
  dragHandle.style.color = "#8c7b6b";
  dragHandle.style.fontSize = "11px";
  dragHandle.style.fontWeight = "600";
  dragHandle.style.fontFamily =
    '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",Arial,sans-serif';
  dragHandle.style.cursor = "grab";
  dragHandle.style.userSelect = "none";
  dragHandle.style.touchAction = "none";

  const saveButton = createFloatingButton("收藏文献", "收藏到 paper-label 文献库", "primary");
  if (options.initiallySaved) {
    markFloatingButtonPressed(saveButton, "取消收藏", "已收藏，点击可取消");
  }
  saveButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const result = await options.onSave();
    if (result.saved) {
      markFloatingButtonPressed(saveButton, "取消收藏", "已收藏，点击可取消");
      return;
    }
    resetFloatingButton(saveButton, "收藏文献", "收藏到 paper-label 文献库", "primary");
  });

  const fullTextButton = createFloatingButton("查找全文", "查找全文", "secondary");
  fullTextButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await options.onFullText();
    markFloatingButtonPressed(fullTextButton, "已打开", "已打开全文查找入口");
  });

  const downloadButton = createFloatingButton("下载全文", "下载全文", "secondary");
  downloadButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await options.onDownloadFullText();
    markFloatingButtonPressed(downloadButton, "已打开", "已打开全文下载入口");
  });

  root.append(dragHandle, saveButton, fullTextButton, downloadButton);
  if (options.settings?.diagnosticsEnabled && options.diagnostics) {
    const diagnosticsButton = createFloatingButton("诊断", "查看本页识别与期刊标签命中信息", "secondary");
    diagnosticsButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      createDiagnosticsPanel(options.diagnostics!);
    });
    root.appendChild(diagnosticsButton);
  }
  document.body.appendChild(root);
  makeFloatingActionsDraggable(root, dragHandle);
  void restoreFloatingPosition(root);
}

export function injectEntryControls(entry: SiteDocumentEntry, options: InjectControlsOptions) {
  const hostElement = entry.mountTarget;
  if (!hostElement) {
    return;
  }

  document
    .querySelector<HTMLElement>(`.${ROOT_CLASS}[data-entry-id="${CSS.escape(entry.entryId)}"]`)
    ?.remove();
  const root = createRoot(entry);
  styleRootBySite(entry, root);
  const badgeRow = createBadgeRow(entry);

  const visibleBadges = dedupeBadgesForDisplay(options.badges);

  for (const badge of visibleBadges) {
    badgeRow.appendChild(
      createBadgePill(entry, badge, options.settings, options.badgeStyleOverrides, options.onBadgeContextMenu)
    );
  }

  if (visibleBadges.length > 0) {
    root.appendChild(badgeRow);
  }

  injectFloatingActions(entry, options);

  if (root.childNodes.length === 0) {
    return;
  }

  if (entry.renderMode === "stacked") {
    entry.titleNode.insertAdjacentElement("afterend", root);
    return;
  }

  hostElement.appendChild(root);
}

function dedupeBadgesForDisplay(badges: RankingBadgeSnapshot[]) {
  const seen = new Set<string>();
  return badges.filter((badge) => {
    const key = badge.rankingLabel.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
