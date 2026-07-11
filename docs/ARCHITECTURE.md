# Architecture

paper-label is organized around clear extension modules.

## Main layers

- Site adapters: detect scholarly pages and extract standard document metadata.
- Ranking engine: match imported journal datasets to document metadata.
- Badge renderer: display one or more labels near search results or article titles.
- Local library: store saved document metadata, folders, tags, notes, and ranking snapshots.
- Full-text actions: open lawful search and DOI resolver links.
- Options UI: manage local library, datasets, badge display, and settings.

## Data flow

```text
Page metadata
  -> site adapter
  -> normalized document
  -> ranking engine
  -> badge snapshots
  -> page injection / local library
```

## Design principle

When adding a feature, try to touch only one layer. For example:

- New publisher page: add a site adapter.
- New dataset format: update dataset parsing and schema docs.
- New library export: update library-export only.
- New full-text resolver: update fulltext provider configuration.

