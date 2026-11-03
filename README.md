# Bible Connections

An interactive map of the cross references in the Bible. Every arc joins two passages that point to each other, from Genesis on the left to Revelation on the right.

## Features

- Around 200,000 cross references, with a strength slider (default shows about 61,000, similar to the classic chart)
- Zoom (scroll, pinch or buttons) and pan (drag or arrow keys)
- Click or tap any arc to read both verses side by side
- Click a chapter bar to see every connection in that chapter
- Search any verse, chapter or book (e.g. `John 3:16`, `Psalm 23`, `1 Cor 13`)
- Filters: Old/New Testament, 10 categories (Law, History, Wisdom & Poetry, Prophets, Gospels, Letters and more) or any single book
- 12 curated themes (Jesus foretold, Salvation, Grace, Freedom & identity, Love, Faith, Holy Spirit, Prayer, Kingdom, Creation, Generosity, Hope)
- Shareable links: the URL keeps your filters and selection
- Accessible: full keyboard support, screen reader announcements, every connection available as a list, 44px touch targets, reduced motion support
- Responsive: desktop sidebar, stacked layout on phones

## Run locally

No build tools needed.

```sh
cd site
python3 -m http.server 8000
```

Open http://localhost:8000.

## Rebuild the data

```sh
node scripts/build-data.mjs
```

Downloads the sources into `data-src/` and writes `site/data/`.

## Deploy

Pushing to `main` runs `.github/workflows/pages.yml`. In the repo go to **Settings > Pages** and set **Source** to **GitHub Actions** once.

## Sources and licences

- Scripture: [Berean Standard Bible](https://berean.bible/) (public domain)
- Cross references: [OpenBible.info](https://www.openbible.info/labs/cross-references/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Packaged data: [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
- Inspired by the cross reference visualisation by Chris Harrison and Christoph Römhild
