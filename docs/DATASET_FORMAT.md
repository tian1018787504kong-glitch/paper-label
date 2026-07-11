# Ranking Dataset Format

Ranking datasets are user-provided JSON files. The extension does not bundle private or official paid ranking data.

## Minimal example

```json
{
  "id": "my-local-dataset",
  "name": "My Local Journal Labels",
  "version": "2026.01",
  "source": "local",
  "records": [
    {
      "journal": "Nature",
      "aliases": ["Nature (London)"],
      "issn": ["0028-0836"],
      "labels": ["Top Journal", "A+"]
    }
  ]
}
```

## Matching fields

The ranking engine can match by:

- Journal name.
- Journal aliases.
- ISSN.
- DOI-derived or page-derived journal metadata when available.

## Display

If a paper matches multiple enabled datasets, multiple badges can be shown. Users can configure:

- Enabled datasets.
- Displayed datasets.
- Badge order.
- Badge color.
- Badge size.

