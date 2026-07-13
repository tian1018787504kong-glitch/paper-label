# Ranking Dataset Format

Ranking datasets are JSON files supplied by the user. The extension does not bundle private or official paid ranking data.

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

The ranking engine can match journal name, aliases, ISSN, and DOI- or page-derived journal metadata.

## Display settings

When a paper matches multiple enabled datasets, multiple badges can be shown. Users can configure enabled datasets, visible datasets, badge order, badge color, and badge size.

Only import data that you are authorized to use. Chinese version: [评级数据格式](DATASET_FORMAT.md).

