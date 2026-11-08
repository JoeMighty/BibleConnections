# Portuguese: plan and progress

Status: **live**. The goal: someone whose phone is set to Portuguese opens the site, sees it in Portuguese, searches "João 3:16" and reads it in a Portuguese Bible, with no English left anywhere.

## Principles

1. **Native, not machine-only.** Each text is drafted, then checked by a native-speaking Christian. Church words (aliança, graça, Páscoa, Ceia) must be the ones churches use.
2. **Complete or not shown.** A language appears in the language menu only when the interface, journeys, plans, book introductions, prophecy and guides are all done. Until then it can be previewed with `?lang=xx`.
3. **Brazilian Portuguese first.** It has by far the most readers. Book names and abbreviations follow the Almeida tradition used by most Brazilian churches (Gênesis, Êxodo, Jó, Cânticos, Apocalipse).
4. **The right Bible by default.** Portuguese readers start in NVI (Nova Versão Internacional, Bible.com id 129), with NAA, NVT, ARA, ARC and NTLH in the picker. All six have audio.
5. **Same rules on copyright.** No Bible translation text is shown; every passage links to Bible.com.

## Phases

| Phase | What | Status |
|---|---|---|
| 1. Groundwork | Book names and abbreviations (`site/content/i18n/pt.json`), Portuguese names in search in every language, category names | Done |
| 2. Language plumbing | One file per language (`site/content/i18n/<lang>.json`) for the map and every page, shared by `site/i18n.js`; `node scripts/i18n-check.mjs pt` shows what is missing; `?lang=pt` preview; default Bible version per language | Done |
| 3. Interface | About 780 interface strings and patterns, plus the handout, guide, roadmap, slides and card pages | Done |
| 4. Content | 16 journeys, 6 plans, 66 book introductions, reflection questions, 23 prophecy chains, timeline, 56 people and places, 42 topics, How to use and Roadmap pages | Done |
| 5. Review | Every screen checked in Portuguese for leftover English and for layout on a small phone; numbers written the Portuguese way; shorter labels where space is tight (Ajustes). A review by native speakers is still welcome: suggest changes on GitHub | Done (native review welcome) |
| 6. Launch | Português in the language menu, picked automatically on Portuguese devices, NVI as the default Bible, Portuguese pages in the sitemap and language links for search engines | Done |

## Adding a language

1. Add it to `LANGS` in `site/app.js` and `site/i18n.js` (locale, default Bible.com version, `listed: false`).
2. Copy `site/content/i18n/pt.json` to `<lang>.json` and fill in the book names, abbreviations and categories.
3. Run `node scripts/i18n-check.mjs <lang> --json` for every missing string, translate them, then run `node scripts/pack-data.mjs`.
4. Translated journeys and themes go in `content/journeys.<lang>.json` and `content/themes.<lang>.json` (list them under `content` in the language file); other written content uses `_<lang>` fields next to the English.
5. Preview with `?lang=<lang>`. When it is complete and reviewed, set `listed: true` and add it to the Settings language choice.

## How to help

Open an issue on GitHub with the Translation form, or comment on the Portuguese issue. Reviewers are credited in the About window.

## After Portuguese

French, then Korean and Chinese (Simplified), using the same files and checks. Right-to-left languages (Arabic, Farsi) need their own design pass.
