# Bible Connections

An interactive map of the cross references in the Bible. Every arc joins two passages that point to each other, from Genesis on the left to Revelation on the right.

No Bible text is published on this site. Every passage links out to [Bible.com](https://www.bible.com) in the reader's chosen translation (NIV by default).

## Features

- **Map:** around 200,000 cross references, a strength slider, zoom (scroll, pinch, buttons, keyboard) and pan
- **Connections:** tap any arc to see both passages, read them on Bible.com, or open the whole chapter
- **Why it connects:** short explanations for the strongest links, with a filter to show only explained connections
- **Search:** references (`John 3:16`, `Psalm 23`, `1 Cor 13`) or words (`shepherd`, `living water`)
- **Filters:** Old/New Testament, 10 categories, single books and 12 themes
- **Guided journeys:** step-by-step tours such as *The Lamb of God* and *Eden to the new creation*
- **Insights:** most connected verses and chapters, plus a category heatmap that filters the map
- **Sharing:** every view has its own link; Share and Copy buttons on connections, verses, searches and journeys
- **Settings:** light, dark or system appearance, high contrast mode and Bible.com translation
- **Installable and offline:** works as an app and without a connection after the first visit (reading links still need the internet)
- **Accessible:** keyboard support, screen reader announcements, list alternatives to the map, 44px touch targets, reduced motion support

## Editing content

| What | File |
| --- | --- |
| "Why it connects" notes | `site/notes.js` |
| Guided journeys | `site/journeys.js` |
| Themes | `site/themes.js` |

Write notes in your own words. Do not quote or closely paraphrase copyrighted translations such as the NIV or ESV.

References use OSIS format, for example `John.3.16` or `1Cor.13.4`. Notes and journeys are drafts and should be reviewed by a pastor or teaching team. The tests check that every reference exists and every note matches a real connection.

## Run locally

```sh
npm run serve
```

Open http://localhost:8000.

## Tests

```sh
npm install
npx playwright install chromium
npm test
```

The tests run on desktop and mobile sizes. They cover search, sharing links, journeys, insights, settings, keyboard use, offline mode and accessibility (axe, WCAG 2.1 AA) in light and dark themes.

## Rebuild the data

```sh
npm run build:data
```

Downloads the sources into `data-src/` and writes `site/data/`.

## Deploy

`.github/workflows/ci.yml` runs the tests on every push and pull request. Pushes to `main` that pass are deployed to GitHub Pages. In the repo go to **Settings > Pages** and set **Source** to **GitHub Actions** once.

## Sources and licences

Full details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).


- Cross references: [OpenBible.info](https://www.openbible.info/labs/cross-references/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Verse counts and word index: [Berean Standard Bible](https://berean.bible/) (public domain), via [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
- Reading links: [Bible.com](https://www.bible.com) (not affiliated)
- Inspired by the cross reference visualisation by Chris Harrison and Christoph Römhild
