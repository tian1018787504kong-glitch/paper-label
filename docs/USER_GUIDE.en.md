# paper-label User Guide

## 1. Choose the interface language

Open extension settings and choose one of:

- **Follow system**: use the browser UI language;
- **Chinese**;
- **English**.

Reload the settings page after changing the language. In Follow system mode, the browser UI language takes priority over the webpage language.

## 2. Import ranking data

1. Open **Journal Badge Dataset Management**.
2. Choose a JSON file.
3. Review the pending file, dataset name, version, and record count.
4. Click **Confirm import**.
5. Enable the datasets and the page-display options you want.
6. Use **Batch recompute journal labels** when existing library items need to be updated.

Datasets are not uploaded. See [DATASET_FORMAT.en.md](DATASET_FORMAT.en.md) for the JSON format.

## 3. Use paper-label on scholarly pages

On a supported search result page or article page:

- badges appear near the article title;
- the floating control provides **Save paper** and **Find full text**;
- drag the floating control if it covers page content;
- multiple matching ranking systems produce multiple badges;
- no empty badge container is shown when there is no match.

If a page is not recognized, check that the extension is enabled, site access is allowed, the dataset is enabled, and the journal name or ISSN exists in the imported data. When reporting a problem, include the public URL, browser version, and reproducible steps. Never include cookies, account credentials, or restricted full text.

## 4. Manage the local library

Open **Local paper library** from the extension:

- search, filter, and select items from the list;
- edit title, authors, year, journal, DOI, URL, folders, tags, and notes in the detail panel;
- assign one paper to multiple folders;
- press Space or Enter after typing to create a tag;
- use **Remove from library** to cancel a saved item;
- **Open original page** only opens the source URL and does not download a PDF.

## 5. Export and back up

Export JSON, CSV, BibTeX, or RIS from the library page. JSON is the recommended full backup; the other formats are convenient for other reference managers.

## 6. Find lawful full text

**Find full text** opens lawful access points such as a DOI publisher page, open-access search, PubMed Central, or a library gateway. If an institution login is required, sign in on the publisher or library website yourself.

