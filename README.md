<div align="center">

<img src="site/icons/icon.svg" alt="" width="96" height="96">

<h1>Bible Connections</h1>

<p><strong>An interactive map of the cross references in the Bible.</strong><br>
Every arc joins two passages that point to each other, from Genesis on the left to Revelation on the right.</p>

<p>
  <a href="https://joemighty.github.io/BibleConnections/"><img alt="Live site" src="https://img.shields.io/badge/live%20site-open-38d9a9?style=plastic&logo=githubpages&logoColor=white"></a>
  <a href="https://github.com/JoeMighty/BibleConnections/actions/workflows/ci.yml"><img alt="Test and deploy" src="https://img.shields.io/github/actions/workflow/status/JoeMighty/BibleConnections/ci.yml?branch=main&style=plastic&label=tests%20%26%20deploy&logo=githubactions&logoColor=white"></a>
  <a href="https://github.com/JoeMighty/BibleConnections/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/JoeMighty/BibleConnections?style=plastic"></a>
</p>
<p>
  <img alt="Accessibility: WCAG 2.1 AA tested" src="https://img.shields.io/badge/accessibility-WCAG%202.1%20AA%20tested-0b5cad?style=plastic">
  <img alt="Works offline" src="https://img.shields.io/badge/PWA-works%20offline-5a0fc8?style=plastic&logo=pwa&logoColor=white">
  <img alt="No build step" src="https://img.shields.io/badge/build-none%20needed-lightgrey?style=plastic&logo=javascript&logoColor=white">
  <img alt="Tested with Playwright" src="https://img.shields.io/badge/tested%20with-Playwright-2EAD33?style=plastic&logo=googlechrome&logoColor=white">
</p>
<p>
  <a href="https://www.openbible.info/labs/cross-references/"><img alt="Cross references: OpenBible.info CC BY 4.0" src="https://img.shields.io/badge/cross%20references-OpenBible.info%20CC%20BY%204.0-ffa94d?style=plastic"></a>
  <a href="https://www.bible.com"><img alt="Reading links: Bible.com" src="https://img.shields.io/badge/reading%20links-Bible.com-c92a2a?style=plastic"></a>
  <img alt="No Bible text hosted" src="https://img.shields.io/badge/Bible%20text%20hosted-none-555?style=plastic">
</p>

<p><a href="https://joemighty.github.io/BibleConnections/"><strong>Open the live site</strong></a></p>

</div>

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

`.github/workflows/ci.yml` runs the tests on every push and pull request. Pushes to `main` that pass are deployed to GitHub Pages at https://joemighty.github.io/BibleConnections/ (Pages source: **GitHub Actions**).

## Sources and licences

Full details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- Cross references: [OpenBible.info](https://www.openbible.info/labs/cross-references/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Verse counts and word index: [Berean Standard Bible](https://berean.bible/) (public domain), via [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
- Reading links: [Bible.com](https://www.bible.com) (not affiliated)
- Inspired by the cross reference visualisation by Chris Harrison and Christoph Römhild
