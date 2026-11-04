# Third-party notices

This project publishes no copyrighted Bible text. Below is everything it uses from others, and on what terms.

## Cross references: OpenBible.info

- Source: https://www.openbible.info/labs/cross-references/
- License: Creative Commons Attribution 4.0 (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- Attribution: "Cross references from OpenBible.info, CC BY 4.0"
- Changes made: references with fewer than 3 votes were removed, duplicate pairs were merged, verse references were converted to verse numbers and stored in a compact binary file (`site/data/refs.bin`).

## Verse counts and word index: Berean Standard Bible

- Source: https://berean.bible/
- License: public domain (dedicated to the public domain in 2023).
- Used only to count verses per chapter and to build a word to verse number index (`site/data/words.json`) for word search. No verse text is published.

## Hebrew and Greek words: STEP Bible

- Source: STEPBible-Data (TAHOT, TAGNT, TBESH and TBESG), https://github.com/STEPBible/STEPBible-Data
- Created by Tyndale House Cambridge and curated by STEP Bible, https://www.STEPBible.org
- License: Creative Commons Attribution 4.0 (CC BY 4.0). Credit: "STEP Bible" linked to www.STEPBible.org
- Changes made: Strong's numbers were grouped by base number, prefixes were left out, definitions were shortened to about 110 characters, and verse references were converted to verse numbers in `site/data/strongs.json` (built by `scripts/build-strongs.mjs`).
- The original Hebrew, Aramaic and Greek text of each verse (from TAHOT, based on the Westminster Leningrad Codex, and the NA28 words of TAGNT) and the full lexicon entries are in `site/data/text/` and `site/data/lex/` (built by `scripts/build-original.mjs`). Changes made: Hebrew cantillation marks and morpheme dividers were removed, only Leningrad Codex and NA28 words were kept, and lexicon markup was simplified.
- The lexicon entries in TBESH and TBESG are drawn from Brown-Driver-Briggs (1906) and Abbott-Smith (1922), which are in the public domain.
- No English or other modern translation text is included. Word meanings shown under the original words are dictionary glosses, not a translation of the verse.

## Data packaging: scrollmapper/bible_databases

- Source: https://github.com/scrollmapper/bible_databases
- License: MIT

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## QR codes: qrcode-generator

- Source: https://github.com/kazuhikoarase/qrcode-generator (npm package `qrcode-generator` 1.4.4), included as `site/vendor/qrcode.js`
- License: MIT, Copyright (c) 2009 Kazuhiko Arase. The copyright and license notice are kept at the top of the file.
- "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.

## Bible.com links and translation names

- Passages link to Bible.com (YouVersion). No content from Bible.com is copied or embedded.
- Translation names and abbreviations (for example NIV, ESV, NLT and the other versions listed in `site/content/versions.json`) are used only to label links. They are trademarks of their respective owners. This project is not affiliated with or endorsed by YouVersion or any Bible publisher.

## Notes, journeys and themes

- Written for this project in English and Spanish. They describe passages in original words and do not quote or closely paraphrase copyrighted translations (English or Spanish, for example NIV, ESV, NVI or RVR1960). Please keep it that way when editing.

## Design inspiration

- The arc layout is inspired by the 2007 cross reference visualization by Chris Harrison and Christoph Römhild. No artwork or data from that work is used.

## Development tools (not shipped with the site)

- Playwright (Apache 2.0), axe-core and @axe-core/playwright (MPL 2.0), Lighthouse CI (Apache 2.0).
