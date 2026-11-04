# Changelog

All notable changes to Bible Connections are recorded here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Passage explorer: a single verse now shows its original Hebrew, Aramaic or Greek words (each one opens a word study), its place in the chapter with previous and next verse, a short introduction to the book, connections split into Old and New Testament, people, places and topics named in the verse, and three reflection questions.
- Expanded word study: language (Hebrew, Aramaic or Greek), Strong's number, approximate pronunciation, meanings by context with their own verse lists, where the word is used by book, its most common forms with grammar in plain words, related words and the full dictionary entry.
- Introductions to all 66 books and reflection questions for each kind of book, in English and Spanish.
- Content review packet for pastors (`docs/THEOLOGY-REVIEW.md`).
- Releases can be named in the changelog heading.

### Changed
- Redesigned welcome page: a serif headline, the map as a large picture with an Old and New Testament timeline lined up underneath, a simple list of ways in, and a wider layout that adapts from phones to large screens.

## [0.6.0] - 2026-11-04 - Many Languages

### Added
- 75 more Bible.com translations in 28 more languages: Portuguese, French, German, Russian, Italian, Korean, Nigerian Pidgin, Yoruba, Igbo, Hausa, Swahili, Amharic, Oromo, Tigrinya, Lingala, Kikongo (Kituba), Tshiluba, Zulu, Xhosa, Afrikaans, Kikuyu, Luo, Tagalog, Cebuano, Ilocano, Tamil, Telugu and Hindi.
- Searchable translation picker: type a language (in English or in the language itself), a translation name or a code.
- Optional second translation: pick "Read in" and "Compare with" right in the sidebar, and every reading link also opens in the second translation. Notes and the interface stay in the site language.
- Malayalam translations on Bible.com: Malayalam OV, Malayalam C.L., Malayalam IRV and Malayalam MCV.
- Study section (replaces the Insights tab; Insights is now inside it).
- Reading plans: The story of Scripture (about a month), Jesus foretold and Twelve themes, with progress saved on the device.
- People and places: 35 people and 21 places, lighting up every verse that names them.
- Topics: 42 topics such as anxiety, forgiveness, money and rest, found by key words in the public domain Berean Standard Bible. OpenBible.info's topic data was not used because no download or license could be confirmed.
- Guess the connection: a quiz with score and streak, for personal use or small groups.
- Connection of the day on the welcome page and in Study, the same for everyone each day.
- QR code for any view, with a downloadable image for slides and bulletins.
- Embed code for church websites and blogs, with a compact embedded view that links back to the full site.
- Printable poster of the whole map as SVG (any print size) or PNG.
- "Suggest a note" link on connections without a note, opening a pre-filled GitHub issue form.
- 143 new "why it connects" notes for the key verses in every theme (362 in total).
- Usage events in GoatCounter for journeys, themes, plans, the game, Connect, QR codes, embeds, posters and note suggestions (no personal data).
- QR code library: qrcode-generator (MIT), listed in THIRD_PARTY_NOTICES.md.

- Word study: about 14,000 Hebrew and Greek words from STEP Bible (CC BY 4.0), searchable by English meaning, transliteration or Strong's number, with 32 featured words such as hesed, shalom, agape and charis.
- Chronological view: books can be arranged by when their events happen (approximate), with arcs, labels, colors and posters following the new order.
- Collections: group connections, verses, journey steps and searches, step through them, and share a whole collection as one link.
- Kids mode: bigger text and targets, simpler welcome text, fewer advanced filters, and three kids journeys (God keeps His promises, Jesus the Good Shepherd, God's big rescues) in English and Spanish.
- Reading plan reminders as a calendar file (a daily 7 am reminder for each remaining day).
- Daily calendar and RSS feeds of the connection of the day, rebuilt every day by the deploy workflow.
- Story-sized images (1080 by 1920) of a connection or the connection of the day, for Instagram and WhatsApp stories.
- "Describe this view": a plain-language summary of the map (button, D key and a summary line in the details panel).
- Automatic pull requests from approved note suggestions, automatic releases from the changelog, screenshot tests with baselines taken on GitHub, and private error counts in GoatCounter.

### Changed
- The content suggestion form now has separate fields for the two passages, the kind of connection and the note.

### Fixed
- Moving the pointer over the map while it was still loading could cause an error.

### Added
- Credits to [JoeMighty](https://github.com/JoeMighty) on the welcome page, in the About box and in the README.
- Licenses: code under Apache 2.0 with a NOTICE file that must be kept, and original content under CC BY 4.0, both requiring credit back to this repository. Added `CITATION.cff` for GitHub's "Cite this repository" button.
- Contributing guide, issue forms (bug, content suggestion, feature idea), `robots.txt`, `sitemap.xml`, structured data for search engines and a GitHub social preview image (`docs/social-preview.png`).
- Bottom tab bar on phones and small tablets (Home, Journeys, Connect, Insights, Settings), following Apple's Human Interface Guidelines.

### Changed
- Redesigned the interface following Apple's Human Interface Guidelines: system type scale, grouped lists, segmented controls, switches, translucent bars, line icons and a pure black or white map background.
- Headings are balanced and paragraphs avoid single-word last lines (widows).
- Standardized on US English spelling (color, favor, honor, center, judgment, license, fulfillment, visualization) and typographic apostrophes and quotes.
- Fixed "1 verse contain" grammar in word search results.
- Link and button colors adjusted to keep WCAG AA contrast in the new design.
- Updates now appear on the first visit after a deploy: the app is fetched fresh when online and only falls back to the saved copy offline.

- Privacy-friendly visit counts switched on with GoatCounter (`bibleconnections.goatcounter.com`). No cookies, and visitors with Do Not Track or Global Privacy Control are not counted.
- README: removed the editing, local setup, testing and data rebuild instructions.

### Fixed
- The bottom of the welcome page could not be reached on iPad Safari. The welcome page now scrolls as a normal page instead of a separate scrolling layer.

### Fixed
- Links for verse ranges (for example John 1:1-3) now open the first verse on Bible.com. Bible.com does not support ranges in links and showed a generic page. The weekly link check confirmed all 14 translation codes are correct.

## [0.5.0] - 2026-11-03

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
- "How are these connected?" (Connect): finds and animates the shortest chain of cross references between any two passages.
- Save image button for the current view, with the filters and site address in the caption.
- Link preview image and tags, so shared links show a picture in messaging apps and social media.
- Save items and see recently viewed (stored on the device only), also shown on the welcome page.

- WebGL map drawing on devices with a graphics chip, for smooth zooming with all connections. Falls back to the 2D canvas automatically (or with `?renderer=canvas`).

- Weekly automatic check that every Bible.com translation link opens the right translation (`.github/workflows/links.yml`).
- Lighthouse checks for speed, accessibility, best practices and SEO run before every deploy and block it if scores drop.
- Monthly workflow that refreshes the OpenBible.info data and opens a pull request for review.
- Optional privacy-friendly usage stats (GoatCounter or Plausible), off by default, respecting Do Not Track. See `docs/ANALYTICS.md`.
- Spanish Bible.com translations (NVI, RVR1960, NTV, LBLA, TLA) in the translation list.
- Guides: `docs/CUSTOM-DOMAIN.md` and `docs/ACCESSIBILITY-TESTING.md` (plan for a session with assistive technology users).
- Spanish version: menus, messages, book names and abbreviations, categories, themes, all nine journeys and their discussion questions, and the printable handouts. Chosen from the browser language, Settings, or `?lang=es` links. Spanish users get NVI reading links by default. Spanish and English references both work in either language (with or without accents). "Why it connects" notes are shown in English and marked as such.

### Changed (header)
- Settings and About are now icon buttons to make room for Connect.

### Changed (performance)
- The map no longer animates its zoom on first load, cutting blocking time from about 800 ms to under 100 ms in Lighthouse.
- Bible.com translations moved to `site/content/versions.json`.

### Changed
- The welcome page is now always the homepage, with a solid background. The map has its own address (`?view=map`).
- "Reset filters" is now "Reset everything" and also clears the selected verse, connection or journey.

## [0.4.0] - 2026-11-03

### Added
- Welcome landing page on a plain visit, with shortcuts to the map, guided journeys, search and themes.
- Site title in the header returns to the welcome page.
- Tests for the landing flow and its accessibility in light and dark themes.

### Changed
- README: centered header with icon and status badges.
- Deploys use the GitHub Pages "GitHub Actions" source. Live at https://joemighty.github.io/BibleConnections/

## [0.3.0] - 2026-11-03

### Changed
- Rewrote all "why it connects" notes and journey steps as original descriptions, removing wording that followed copyrighted translations.
- About dialog now lists licenses, the OpenBible.info changes made, trademark notes and non-affiliation with YouVersion or any Bible publisher.

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

[Unreleased]: https://github.com/JoeMighty/BibleConnections/compare/bc8cb41...HEAD
[0.6.0]: https://github.com/JoeMighty/BibleConnections/compare/d022afc...bc8cb41
[0.5.0]: https://github.com/JoeMighty/BibleConnections/compare/c8f5413...d022afc
[0.4.0]: https://github.com/JoeMighty/BibleConnections/compare/0c2e1a9...c8f5413
[0.3.0]: https://github.com/JoeMighty/BibleConnections/compare/df4c68b...0c2e1a9
[0.2.0]: https://github.com/JoeMighty/BibleConnections/compare/febbd6c...df4c68b
[0.1.0]: https://github.com/JoeMighty/BibleConnections/commit/febbd6c
