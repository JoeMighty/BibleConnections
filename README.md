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

- **Map:** around 200,000 cross references with a strength slider, zoom (scroll, pinch, buttons, keyboard) and pan. Uses WebGL where a graphics chip is available.
- **Welcome page:** a picture of the full map, quick starts, themes, the current sermon series and "pick up where you left off".
- **Connections:** tap any arc to see both passages and read them on Bible.com in your chosen translation.
- **Why it connects:** 219 short explanations for the strongest links, with a filter to show only explained connections.
- **Search:** references (`John 3:16`, `Psalm 23`, `Juan 3:16`) or words (`shepherd`).
- **How are these connected?:** the shortest chain of cross references between any two passages, animated on the map.
- **Filters:** Old/New Testament, 10 categories, single books and 12 themes, with a "You're viewing" bar and Start over.
- **Guided journeys:** nine step-by-step tours with discussion questions, presenter mode for sermons and classes (works with clickers), and printable handouts.
- **Sermon series:** show the current series passages on the welcome page.
- **Insights:** most connected verses and chapters, plus a category heatmap that filters the map.
- **Sharing:** every view has its own link, back button support, Share, Copy and Save image, plus link previews in messaging apps.
- **Saved and recent:** save items and see recently viewed, stored on the device only.
- **Spanish:** full Spanish interface, journeys and handouts, with Spanish Bible.com translations.
- **Settings:** language, light, dark or system appearance, high contrast mode and Bible.com translation.
- **Installable and offline:** works as an app and without a connection after the first visit (reading links still need the internet).
- **Accessible:** keyboard support, screen reader announcements, list alternatives to the map, 44px touch targets, reduced motion support, tested with axe in both languages and themes.

## Editing content

Notes, journeys, themes and the sermon series are plain data files in `site/content/`, editable on the GitHub website. See [docs/EDITING.md](docs/EDITING.md) for a step-by-step guide.

| What | File |
| --- | --- |
| "Why it connects" notes | `site/content/notes.json` |
| Guided journeys and discussion questions | `site/content/journeys.json` |
| Themes | `site/content/themes.json` |
| Current sermon series | `site/content/series.json` |

Write everything in your own words. Do not quote or closely paraphrase copyrighted translations such as the NIV or ESV. The tests check that every reference exists and every note matches a real connection.

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

The tests run on desktop and mobile sizes. They cover search, sharing links, journeys, presenter mode, handouts, the chain finder, insights, settings, Spanish, keyboard use, offline mode, both renderers and accessibility (axe, WCAG 2.1 AA) in light and dark themes. Lighthouse checks speed, accessibility, best practices and SEO.

## Rebuild the data

```sh
npm run build:data
```

Downloads the sources into `data-src/` and writes `site/data/`.

## Deploy

`.github/workflows/ci.yml` runs the tests on every push and pull request. Pushes to `main` that pass are deployed to GitHub Pages at https://joemighty.github.io/BibleConnections/ (Pages source: **GitHub Actions**).

## More guides

- [Editing the content](docs/EDITING.md)
- [Usage stats (optional)](docs/ANALYTICS.md)
- [Using your own web address](docs/CUSTOM-DOMAIN.md)
- [Accessibility testing with real users](docs/ACCESSIBILITY-TESTING.md)

## Automation

| Workflow | When | What it does |
| --- | --- | --- |
| `ci.yml` | Every push and pull request | Browser and accessibility tests, Lighthouse checks, then deploys `main` to GitHub Pages |
| `links.yml` | Weekly | Checks every Bible.com translation link |
| `data-refresh.yml` | Monthly | Rebuilds the cross reference data and opens a pull request if it changed |

For the monthly refresh to open pull requests, turn on **Settings > Actions > General > Allow GitHub Actions to create and approve pull requests**.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version.

## Sources and licences

Full details are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- Cross references: [OpenBible.info](https://www.openbible.info/labs/cross-references/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- Verse counts and word index: [Berean Standard Bible](https://berean.bible/) (public domain), via [scrollmapper/bible_databases](https://github.com/scrollmapper/bible_databases)
- Reading links: [Bible.com](https://www.bible.com) (not affiliated)
- Inspired by the cross reference visualisation by Chris Harrison and Christoph Römhild
