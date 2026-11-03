# Changelog

All notable changes to Bible Connections are recorded here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- This changelog.
- "You're viewing" bar above the map listing every active theme, filter, verse, connection or journey, each with its own remove button, plus Start over.
- Home button in the header.
- Browser and phone back button steps back through verses, connections, filters and journeys.
- Picture of the full arc map at the top of the welcome page.
- Notes, journeys, themes and sermon series moved to editable data files in `site/content/`, with a guide in `docs/EDITING.md`.
- Discussion questions on every journey step.
- Four new journeys: God's covenant promises, Out of Egypt, Our great High Priest, Water and new life (nine in total).
- Presenter mode: full screen, large text, high contrast, works with presentation clickers.
- Printable journey handouts with references, notes and questions (no Bible text).
- Sermon series page, shown on the welcome page when switched on in `series.json`.
- First-time tips on the map.
- Version number and a "What's new" link in the About box.

### Changed
- The welcome page is now always the homepage, with a solid background. The map has its own address (`?view=map`).
- "Reset filters" is now "Reset everything" and also clears the selected verse, connection or journey.

## [0.4.0] - 2026-11-03

### Added
- Welcome landing page on a plain visit, with shortcuts to the map, guided journeys, search and themes.
- Site title in the header returns to the welcome page.
- Tests for the landing flow and its accessibility in light and dark themes.

### Changed
- README: centred header with icon and status badges.
- Deploys use the GitHub Pages "GitHub Actions" source. Live at https://joemighty.github.io/BibleConnections/

## [0.3.0] - 2026-11-03

### Changed
- Rewrote all "why it connects" notes and journey steps as original descriptions, removing wording that followed copyrighted translations.
- About dialog now lists licences, the OpenBible.info changes made, trademark notes and non-affiliation with YouVersion or any Bible publisher.

### Added
- `THIRD_PARTY_NOTICES.md` covering OpenBible.info (CC BY 4.0), the Berean Standard Bible (public domain), scrollmapper/bible_databases (MIT) and translation trademarks.

## [0.2.0] - 2026-11-03

### Added
- Passages link to Bible.com in a chosen translation (NIV by default) instead of showing verse text.
- Word search (for example "shepherd") using a word to verse index from the public domain Berean Standard Bible.
- Shareable links for connections, searches and journey steps, with Share and Copy buttons.
- Five guided journeys (Lamb of God, God with us, The promised King, The Spirit poured out, Eden to the new creation).
- Insights view: most connected verses and chapters, Old/New Testament split and a category heatmap that filters the map.
- 219 "why it connects" notes and a filter to show only explained connections.
- Settings: light, dark or system appearance, high contrast mode and Bible.com translation.
- Installable app with offline support.
- Two-row book labels and an Old/New Testament divider on the axis.
- Automated Playwright and axe accessibility tests on desktop and mobile, run in CI before every deploy.

### Removed
- Hosted verse text. No Bible text is published on the site.

## [0.1.0] - 2026-11-03

### Added
- Interactive arc map of about 200,000 OpenBible.info cross references with zoom, pan and pinch.
- Search by verse, chapter or book, testament, category and book filters, 12 themes and a strength slider.
- Keyboard and screen reader support and a responsive layout.

[Unreleased]: https://github.com/JoeMighty/BibleConnections/compare/c8f5413...HEAD
[0.4.0]: https://github.com/JoeMighty/BibleConnections/compare/0c2e1a9...c8f5413
[0.3.0]: https://github.com/JoeMighty/BibleConnections/compare/df4c68b...0c2e1a9
[0.2.0]: https://github.com/JoeMighty/BibleConnections/compare/febbd6c...df4c68b
[0.1.0]: https://github.com/JoeMighty/BibleConnections/commit/febbd6c
