# Portuguese: plan and progress

The goal: someone whose phone is set to Portuguese opens the site, sees it in Portuguese, searches "João 3:16" and reads it in a Portuguese Bible, with no English left anywhere.

## Principles

1. **Native, not machine-only.** Each text is drafted, then checked by a native-speaking Christian. Church words (aliança, graça, Páscoa, Ceia) must be the ones churches use.
2. **Complete or not shown.** Portuguese appears in the language menu only when the interface, journeys, plans, book introductions, prophecy and guides are all done. Until then it can be previewed with `?lang=pt`.
3. **Brazilian Portuguese first.** It has by far the most readers. Book names and abbreviations follow the Almeida tradition used by most Brazilian churches (Gênesis, Êxodo, Jó, Cânticos, Apocalipse).
4. **The right Bible by default.** Portuguese readers start in NVI (Nova Versão Internacional, Bible.com id 129), with NAA, NVT, ARA, ARC and NTLH in the picker. All six have audio.
5. **Same rules on copyright.** No Bible translation text is shown; every passage links to Bible.com.

## Phases

| Phase | What | Status |
|---|---|---|
| 1. Groundwork | Book names and abbreviations (`site/content/i18n/pt.json`), Portuguese names in search in every language, category names | Done |
| 2. Language plumbing | Move each page's dictionary (app, handout, pages, slides, card) to one file per language; a check that lists missing strings; `?lang=pt` preview; default Bible version per language | Next |
| 3. Interface | About 700 interface strings and patterns, the welcome page, Settings, dialogs | To do |
| 4. Content | 16 journeys, 6 plans, 66 book introductions, reflection questions, 23 prophecy chains, timeline, topics, How to use and Roadmap pages | To do |
| 5. Review | A native speaker reads every screen on a phone; fix wording and layout (Portuguese runs about 20% longer than English) | To do |
| 6. Launch | Add Português to the language menu, pick it automatically for Portuguese devices, link previews and sitemap in Portuguese | To do |

## How to help

Open an issue on GitHub with the Translation form, or comment on the Portuguese issue. Reviewers are credited in the About window.

## After Portuguese

French, then Korean and Chinese (Simplified), using the same files and checks. Right-to-left languages (Arabic, Farsi) need their own design pass.
