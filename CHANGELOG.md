# Changelog

All notable changes to Bible Connections are recorded here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- The site has its own address: https://bibleconnections.app. Old links redirect automatically, and link previews, the sitemap, feeds and search engine language links use the new address.

### Added
- Phones: the details slide up from the bottom as a sheet, like the Maps app. Drag or tap its handle to show more or less; the map always fills the space above it. A link to a verse or connection opens it half way, with the details straight under the search box, and translations and filters sit below the details.
- A Back button at the top of the details panel steps back through what you opened.
- One search, all results: a word search still shows every verse with that word, and now also lists the people, places, topics, themes, Hebrew and Greek words, journeys, prophecies and routes that match, each one tap away.
- Verse sections (In context, Original text, People, places and topics, Connections, My notes, Reflect) open and close, and your choice is remembered. People, places and topics, and Reflect, start closed to keep the page short.

- Undo instead of "Are you sure?": deleting a note or a collection, or removing an item from a collection, shows "Undo" for a few seconds.
- Your plan on the welcome page: a reading plan you are part way through is offered with a Continue button (unless it is the season's plan, which already has its own card).
- A one-line explanation of cross references on the welcome page for first-time visitors.
- An offline note when the connection drops, saying what still works.
- Loading placeholders: soft gray shapes for the welcome page picture, its numbers and loading sections, instead of empty space.

### Changed
- First-visit tips show one at a time (with Next and Skip), and wait until the map has room for them.
- On phones the "You're viewing" bar is a single row, and the tab bar is solid.

### Fixed
- The map keeps its base line in place when it is resized, so arcs no longer drift out of view.

## [0.16.0] - 2026-11-08 - Lent

### Added
- Lent: the road to the cross, a reading plan from Ash Wednesday to the eve of Palm Sunday (39 days, starting 10 February 2027), through dust, the wilderness, mercy, the heart and the road to Jerusalem, leading straight into Holy Week. Dates follow Easter each year. In English, Spanish and Portuguese.
- The connection of the day follows Lent too.
- Season banner on the welcome page: during Advent, Christmas, Lent and Holy Week it shows today's reading with a button to open it (and the season's journey where there is one). When a season is three weeks away it says when it starts.
- Approved weak link reports become pull requests: label a "Report a weak link" issue `approved` and a workflow adds it to site/content/weak-links.json in a pull request. Merging it hides the link for everyone. Duplicates are closed with a note, and incomplete reports get a comment.

## [0.15.1] - 2026-11-08 - Welcome First

### Fixed
- The welcome page shows straight away when the site opens, instead of the map flashing first while the data loads. A link with only a language (such as ?lang=pt) now opens the welcome page in that language too.

## [0.15.0] - 2026-11-08 - Places

### Added
- Places view: the places map now fills the main area, as a full view beside the connections map. Switch with the Connections and Places control at the top of the map, the Places tab on larger screens, or the M key.
- Drag, pinch, scroll or use the buttons and arrow keys to move and zoom. Bigger dots are named more often and lighter dots are less certain. Hover for a place's name and verse count, and tap a dot to see every verse that names it.
- The places map follows what is open: a chapter, verse, connection, journey step, prophecy, person or topic lights up its places and zooms to them. Verse, chapter and place panels have a "See it on the Places map" button.
- Journeys on the map: Abraham's journey, the exodus, Paul's three missionary journeys and his voyage to Rome, drawn as routes with numbered stops, each linked to its passage. Links look like ?route=paul2. In English, Spanish and Portuguese.

### Changed
- The color legend sits below the new map switch, and Study, Places on a map now opens the Places view.

## [0.14.0] - 2026-11-08 - For Churches

### Added
- Church page (Study, Church page): enter your church name, series title and each week's date, passage and sermon title to get a page with this week's passage first, every week listed, links to read each passage on Bible.com and to see its connections, and embed code for your website. The series is kept in the link, so there is no sign-up, and your draft stays on your device. Works in English, Spanish and Portuguese, in light or dark.
- Report a weak link: every connection has a "Does this link seem weak?" line. Report it opens a ready-made GitHub form, and Hide it on this device takes it off your map straight away. Settings shows how many links you have hidden and can show them all again, and backups include them.
- Reviewed reports go in site/content/weak-links.json, which hides those links from the map for everyone.

## [0.13.0] - 2026-11-08 - Português

### Added
- Portuguese: the whole site in Brazilian Portuguese, from the interface to every journey, reading plan, book introduction, reflection question, prophecy chain, timeline event, person, place, topic, handout, leader guide, slide deck, embed card and the How to use and Roadmap pages. It is chosen automatically on phones set to Portuguese, can be picked in Settings, and opens Bible.com in the Nova Versão Internacional by default.
- One language file per language for every page, a checker that shows what is missing in each language (`node scripts/i18n-check.mjs`), and a preview for unfinished languages (`?lang=xx`), so more languages can follow.

### Changed
- Numbers are written the way each language writes them (61.273 in Spanish and Portuguese).
- A few phrases on the places map and the shared connections page are now translated in Spanish too.

## [0.12.0] - 2026-11-08 - Seasons

### Added
- The twelve days of Christmas: a reading plan from Christmas Day to the eve of Epiphany, one promise and its fulfilment each day, dated to the calendar (Rachel weeping on 28 December, the name of Jesus on 1 January, the wise men's gifts on 4 January). The connection of the day follows it over Christmas.
- Holy Week: a journey (Holy Week: the road to the cross) and an eight-day reading plan from Palm Sunday to Easter morning, with an Old Testament passage for each day. Dates follow Easter each year (Palm Sunday 21 March 2027), and the connection of the day follows Holy Week too. Leader guides and handouts work for it like any journey.
- Search understands Portuguese book names in any language (João 3:16, Atos 2, 1 Coríntios 13), the first step toward a Portuguese version of the site.

## [0.11.1] - 2026-11-07 - Clear Slides

### Fixed
- Slides are easier to read: text no longer fades in (on some devices the fade never finished and left the text dim), secondary text and links have more contrast, and references sit on their own line in bolder, larger type.

## [0.11.0] - 2026-11-07 - Promise and Fulfilment

### Added
- Prophecy and fulfilment explorer (Study, Prophecy and fulfilment): 12 prophecies, 5 covenants (Noah, Abraham, Sinai, David and the new covenant) and 6 symbols (lamb, shepherd, vine, temple, water and light). Each one shows its passages as numbered stages joined by arcs on the map, plays in order, and is labeled as a quotation, fulfilment, pattern or promise. Links look like ?prophecy=servant. Written for this site and in Spanish too.
- Collection slides: Show as slides on any collection opens simple full-screen slides, one per item, with references linked to Bible.com. Move with the arrow keys, a presentation clicker or a swipe, switch light or dark, go full screen, or print or save as a PDF.
- Leader guides: every journey has a printable guide for the person leading, with a total time, what to prepare, an opening, who reads which passage, leader notes, discussion questions, a closing, and extra ideas for children's journeys.
- Smaller embeds: the Embed window now offers a small card for a single verse, connection, journey step or prophecy, and a choice of light, dark or the visitor's own colors (for the full map too).

### Changed
- Faster first load: the cross references are packed into a file about a third of the size, the welcome page no longer loads the word index, the dictionary loads in a slim form until a word study is opened, book introductions load after the map is showing, and the QR code tool loads only when used. The welcome page now loads about 1.2 MB instead of 2.3 MB, and a verse page about 2.7 MB instead of 7.1 MB.
- Passage handouts load the smaller files too.

## [0.10.0] - 2026-11-06 - Advent

### Fixed
- The welcome page footer no longer says no Bible text is stored: it now says no Bible translation is stored, since the original Hebrew and Greek are shown.

### Added
- How are you feeling? on the welcome page: tap anxious, afraid, grieving, tired, guilty, thankful and more to open the matching topic.
- Surprise me: opens a random connection that has an explanation (on the welcome page, in Explore, or press S).
- Smarter search: suggestions as you type (books, recent searches, topics, people and places), and misspelled book names are understood (Phillipians 4:6, Revelations 3, Genisis 1).
- Search by Hebrew or Greek (ἀγάπη, שלום) or by Strong's number (G26, H7965) to open a word study.
- Grammar toggle: show each original word's grammar in plain words under the Hebrew or Greek text (remembered on this device).
- Timeline: 40 key events in nine periods, from creation to John's vision on Patmos, each with its passage, place and reading link; show a whole period on the map. Dates are approximate and Genesis 1 to 11 is left undated.
- Advent reading plan: 27 days from Advent Sunday (29 November 2026) to Christmas Day, one Old Testament promise and its New Testament fulfilment each day, through hope, peace, joy and love. During Advent it opens on today's reading, and calendar reminders fall on the right dates.
- Three seasonal journeys: Advent: waiting for the King, Christmas: the Word became flesh, and The first Christmas for kids.
- Seasonal connection of the day: during Advent it follows the Advent plan, and over the twelve days of Christmas it follows the Christmas journey.
- How to use page: short guides to 18 features, each with a Try it button that opens it on the site.
- Roadmap page: what is in progress, what is planned next and later, and everything shipped so far (grayed out, by release).
- Both are linked from the welcome page footer and the About window, in English and Spanish. They follow Apple's Human Interface Guidelines: a translucent top bar, inset grouped lists, sentence-case labels, status symbols, 44-point touch targets, and the reader's text size, font and contrast settings.
- Keyboard shortcuts list: press ? (also linked from About). / goes to the search box.

## [0.9.2] - 2026-11-06 - Motion

### Changed
- About window: updated for the newer study tools, settings and sources (original language text, places, coastline, dictionaries and font), with a plain License section.

### Added
- Animations on larger screens with a mouse or trackpad: on the welcome page the heading rises in, the numbers count up and sections ease in as you scroll; selecting a connection sends a light along its arc; the side panel eases in new content; buttons respond when pressed. They are off for anyone who has asked their device for reduced motion, and can be switched off in Settings.

## [0.9.1] - 2026-11-05 - Colors and Polish

### Fixed
- The About window opens at the top instead of halfway down at Sources and copyright.

### Added
- Arc color styles in Settings: Rainbow (the default), Ocean, Sunset, Color-blind friendly and Single color, each with a preview. They apply to the map, the welcome page picture and the legend, in light and dark mode.

### Changed
- The site title in the header now has the Bible Connections icon beside it, sized for phones and larger screens. Tapping the icon also goes home.

## [0.9.0] - 2026-11-05 - Comfort and Depth

### Added
- Tapping the map where several arcs lie close together shows a short list to choose from, instead of guessing.
- Text size setting (Standard, Large, Extra large) for the whole site.
- Words in common: each connection shows the Hebrew and Greek words both passages use, including a Greek word and the Hebrew word it stands for (for example "beginning" in Genesis 1:1 and John 1:1).
- Chapter study: opening a chapter shows an introduction to the book, its key Hebrew or Greek words, the places it names on a small map, and reflection questions.
- Key words of a book: opening a book shows the original words that stand out in it compared with the rest of the Bible.
- Back up everything: one file with notes, saved items, collections, reading plan progress and settings, and a restore that merges it into the device (in Settings).
- Save for offline: download all the Hebrew and Greek text, word studies and places in one go (in Settings).
- Share a verse study as an image: reference, book introduction, the original words, the passages it connects to and a question, sized for social media.
- Easier-to-read font option (Atkinson Hyperlegible), stored with the site and only downloaded when turned on.

### Fixed
- The About window shows the current version (it still said 0.5.0). A test now checks that the version in the app and in CITATION.cff matches the latest release in the changelog.

## [0.8.0] - 2026-11-04 - Study Tools

### Added
- Listen: a headphones button next to Read opens the chapter in Bible.com's audio Bible, for the 65 translations that have audio there. The weekly link check now checks these too.
- Printable passage handout for any verse: book introduction, original words, strongest connections, reflection questions and space for notes (or your saved note).
- My notes: write your own notes on any verse, kept on this device only, with a list of all notes, export and import.
- Places on a map: 1,277 places from OpenBible.info on an offline map of the Bible lands and of Israel, with every verse that mentions each place. Verse pages show the places named in them.
- Shared connections: pick two passages to find the passages they both link to, and show them on the map.

### Changed
- Welcome page: the numbers are back in a centred band, and the search box is centred.
- Clicking outside a pop-up (About, Settings, QR code, Embed, Poster, Add to collection) closes it.

## [0.7.0] - 2026-11-04 - Passage Explorer

### Added
- Passage explorer: a single verse now shows its original Hebrew, Aramaic or Greek words (each one opens a word study), its place in the chapter with previous and next verse, a short introduction to the book, connections split into Old and New Testament, people, places and topics named in the verse, and three reflection questions.
- Expanded word study: language (Hebrew, Aramaic or Greek), Strong's number, approximate pronunciation, meanings by context with their own verse lists, where the word is used by book, its most common forms with grammar in plain words, related words and the full dictionary entry.
- Introductions to all 66 books and reflection questions for each kind of book, in English and Spanish.
- Content review packet for pastors (`docs/THEOLOGY-REVIEW.md`).
- Releases can be named in the changelog heading.

### Changed
- Redesigned welcome page: the map as a large picture with an Old and New Testament timeline lined up underneath, a simple list of ways in, and a wider layout that adapts from phones to large screens.

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

[Unreleased]: https://github.com/JoeMighty/BibleConnections/compare/dd77b09...HEAD
[0.10.0]: https://github.com/JoeMighty/BibleConnections/compare/33ec141...dd77b09
[0.9.2]: https://github.com/JoeMighty/BibleConnections/compare/40bc154...33ec141
[0.9.1]: https://github.com/JoeMighty/BibleConnections/compare/634e316...40bc154
[0.9.0]: https://github.com/JoeMighty/BibleConnections/compare/5834d40...634e316
[0.8.0]: https://github.com/JoeMighty/BibleConnections/compare/8331ef9...5834d40
[0.7.0]: https://github.com/JoeMighty/BibleConnections/compare/bc8cb41...8331ef9
[0.6.0]: https://github.com/JoeMighty/BibleConnections/compare/d022afc...bc8cb41
[0.5.0]: https://github.com/JoeMighty/BibleConnections/compare/c8f5413...d022afc
[0.4.0]: https://github.com/JoeMighty/BibleConnections/compare/0c2e1a9...c8f5413
[0.3.0]: https://github.com/JoeMighty/BibleConnections/compare/df4c68b...0c2e1a9
[0.2.0]: https://github.com/JoeMighty/BibleConnections/compare/febbd6c...df4c68b
[0.1.0]: https://github.com/JoeMighty/BibleConnections/commit/febbd6c
