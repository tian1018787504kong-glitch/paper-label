import { defineConfig } from "wxt";

export default defineConfig({
  suppressWarnings: {
    firefoxDataCollection: true
  },
  manifest: {
    name: "paper-label",
    short_name: "paper-label",
    description: "Open-source journal labels, local paper library, and lawful full-text discovery.",
    icons: {
      16: "icons/paper-label-16.png",
      32: "icons/paper-label-32.png",
      48: "icons/paper-label-48.png",
      96: "icons/paper-label-96.png",
      128: "icons/paper-label-128.png",
      256: "icons/paper-label-256.png",
      512: "icons/paper-label-512.png"
    },
    action: {
      default_icon: {
        16: "icons/paper-label-16.png",
        32: "icons/paper-label-32.png",
        48: "icons/paper-label-48.png",
        96: "icons/paper-label-96.png",
        128: "icons/paper-label-128.png"
      },
      default_title: "paper-label"
    },
    browser_specific_settings: {
      gecko: {
        id: "paper-label@paper-label.local"
      }
    },
    permissions: ["storage", "activeTab", "scripting", "tabs", "contextMenus"],
    data_collection_permissions: {
      required: ["none"]
    },
    host_permissions: [
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
    ]
  }
});
