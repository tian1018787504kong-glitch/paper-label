import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import { getAvailableDatasets } from "../../src/dataset-sources";
import { getDatasetPreferences, getDocuments, getSettings, updateSettings } from "../../src/storage/local-store";
import type { SearchProvider } from "@paper-label/contracts";
import { AUTO_FULLTEXT_PROVIDER_ID } from "../../src/fulltext-providers/resolve";

type PopupState = {
  documentCount: number;
  enabledDatasetCount: number;
  visibleDatasetCount: number;
};

export function PopupApp() {
  const [state, setState] = useState<PopupState | null>(null);
  const [providers, setProviders] = useState<SearchProvider[]>([]);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof getSettings>> | null>(null);

  useEffect(() => {
    void (async () => {
      const [documents, datasets, preference, currentSettings, providerResponse] = await Promise.all([
        getDocuments(),
        getAvailableDatasets(),
        getDatasetPreferences(),
        getSettings(),
        browser.runtime.sendMessage({
          type: "scholartag:get-providers"
        }) as Promise<{ providers: SearchProvider[] }>
      ]);

      const enabledDatasetCount = preference.configs.filter((item) => item.enabled).length;
      const visibleDatasetCount = preference.configs.filter((item) => item.visible).length;

      setState({
        documentCount: documents.length,
        enabledDatasetCount: Math.max(enabledDatasetCount, datasets.length ? enabledDatasetCount : 0),
        visibleDatasetCount
      });
      setProviders(providerResponse.providers);
      setSettings(currentSettings);
    })();
  }, []);

  async function openOptions(hash: "library" | "datasets") {
    await browser.tabs.create({
      url: browser.runtime.getURL(`/options.html#${hash}`)
    });
  }

  if (!state || !settings) {
    return <div className="popup-shell">加载中...</div>;
  }

  return (
    <div className="popup-shell">
      <div className="popup-card">
        <div className="eyebrow">paper-label</div>
        <h1>纯开源基础版</h1>
        <p className="muted">当前只包含本地文献库、期刊标签展示、期刊标签数据管理和合法全文跳转。</p>
      </div>

      <div className="popup-card list">
        <div className="item">
          <strong>{state.documentCount}</strong>
          <span className="muted">本地文献</span>
        </div>
        <div className="item">
          <strong>{state.enabledDatasetCount}</strong>
          <span className="muted">启用中的期刊标签数据集</span>
        </div>
        <div className="item">
          <strong>{state.visibleDatasetCount}</strong>
          <span className="muted">页面显示中的体系</span>
        </div>
      </div>

      <div className="popup-card">
        <label className="label" htmlFor="provider">
          默认全文搜索站点
        </label>
        <select
          id="provider"
          value={settings.defaultSearchProvider}
          onChange={async (event) => {
            const next = await updateSettings({
              defaultSearchProvider: event.target.value
            });
            setSettings(next);
          }}
        >
          <option value={AUTO_FULLTEXT_PROVIDER_ID}>自动：中文知网 / 英文 Google</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>

        <label className="label" htmlFor="badge-size-quick">
          标签大小
        </label>
        <input
          id="badge-size-quick"
          type="range"
          min="0.8"
          max="1.4"
          step="0.05"
          value={settings.badgeSizeScale}
          onChange={async (event) => {
            const next = await updateSettings({
              badgeSizeScale: Number(event.target.value)
            });
            setSettings(next);
          }}
        />
        <div className="badge-size-preview-row">
          <span className="muted">当前</span>
          <strong>{Math.round(settings.badgeSizeScale * 100)}%</strong>
        </div>
      </div>

      <div className="popup-card button-stack">
        <button className="refresh-button" onClick={() => void openOptions("library")}>
          打开本地文献库
        </button>
        <button className="refresh-button secondary-button" onClick={() => void openOptions("datasets")}>
          打开期刊标签数据管理
        </button>
      </div>
    </div>
  );
}
