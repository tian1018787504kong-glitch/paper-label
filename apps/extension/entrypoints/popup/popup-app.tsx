import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import { getAvailableDatasets } from "../../src/dataset-sources";
import { getDatasetPreferences, getDocuments, getSettings, updateSettings } from "../../src/storage/local-store";
import type { SearchProvider } from "@paper-label/contracts";
import { AUTO_FULLTEXT_PROVIDER_ID } from "../../src/fulltext-providers/resolve";
import { createTranslator, getLanguageDiagnostics, languageOptions, type AppLanguage } from "../../src/i18n/messages";

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
    return <div className="popup-shell">Loading...</div>;
  }

  const { t } = createTranslator(settings.language);
  const languageDiagnostics = getLanguageDiagnostics(settings.language);

  return (
    <div className="popup-shell">
      <div className="popup-card">
        <div className="eyebrow">paper-label</div>
        <h1>{t("openCoreShortTitle")}</h1>
        <p className="muted">{t("openCoreSummary")}</p>
      </div>

      <div className="popup-card list">
        <div className="item">
          <strong>{state.documentCount}</strong>
          <span className="muted">{t("localDocuments")}</span>
        </div>
        <div className="item">
          <strong>{state.enabledDatasetCount}</strong>
          <span className="muted">{t("enabledDatasets")}</span>
        </div>
        <div className="item">
          <strong>{state.visibleDatasetCount}</strong>
          <span className="muted">{t("visibleSystems")}</span>
        </div>
      </div>

      <div className="popup-card">
        <label className="label" htmlFor="language">
          {t("language")}
        </label>
        <select
          id="language"
          value={settings.language}
          onChange={async (event) => {
            const next = await updateSettings({
              language: event.target.value as AppLanguage
            });
            setSettings(next);
          }}
        >
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {settings.language === "auto" ? (
          <p className="muted language-diagnostics">
            {`Auto: Chrome ${languageDiagnostics.chromeUiLanguage} · using ${languageDiagnostics.resolvedLanguage}`}
          </p>
        ) : null}

        <label className="label" htmlFor="provider">
          {t("defaultFullTextSearch")}
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
          <option value={AUTO_FULLTEXT_PROVIDER_ID}>{t("autoChineseEnglishSearch")}</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>

        <label className="label" htmlFor="badge-size-quick">
          {t("badgeSize")}
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
          <span className="muted">{t("current")}</span>
          <strong>{Math.round(settings.badgeSizeScale * 100)}%</strong>
        </div>
      </div>

      <div className="popup-card button-stack">
        <button className="refresh-button" onClick={() => void openOptions("library")}>
          {t("openLocalLibrary")}
        </button>
        <button className="refresh-button secondary-button" onClick={() => void openOptions("datasets")}>
          {t("openDatasetManagement")}
        </button>
      </div>
    </div>
  );
}
