# Changelog

All notable changes to Bible Connections are recorded here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- This changelog.

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
- 230 "why it connects" notes and a filter to show only explained connections.
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
