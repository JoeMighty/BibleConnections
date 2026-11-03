# Third-party notices

This project publishes no copyrighted Bible text. Below is everything it uses from others, and on what terms.

## Cross references: OpenBible.info

- Source: https://www.openbible.info/labs/cross-references/
- Licence: Creative Commons Attribution 4.0 (CC BY 4.0), https://creativecommons.org/licenses/by/4.0/
- Attribution: "Cross references from OpenBible.info, CC BY 4.0"
- Changes made: references with fewer than 3 votes were removed, duplicate pairs were merged, verse references were converted to verse numbers and stored in a compact binary file (`site/data/refs.bin`).

## Verse counts and word index: Berean Standard Bible

- Source: https://berean.bible/
- Licence: public domain (dedicated to the public domain in 2023).
- Used only to count verses per chapter and to build a word to verse number index (`site/data/words.json`) for word search. No verse text is published.

## Data packaging: scrollmapper/bible_databases

- Source: https://github.com/scrollmapper/bible_databases
- Licence: MIT

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

## Bible.com links and translation names

- Passages link to Bible.com (YouVersion). No content from Bible.com is copied or embedded.
- Translation names and abbreviations (NIV, ESV, NLT, CSB, NKJV, KJV, AMP, MSG, NASB) are used only to label links. They are trademarks of their respective owners. This project is not affiliated with or endorsed by YouVersion or any Bible publisher.

## Notes, journeys and themes

- Written for this project. They describe passages in original words and do not quote or closely paraphrase copyrighted translations. Please keep it that way when editing.

## Design inspiration

- The arc layout is inspired by the 2007 cross reference visualisation by Chris Harrison and Christoph Römhild. No artwork or data from that work is used.

## Development tools (not shipped with the site)

- Playwright (Apache 2.0), axe-core and @axe-core/playwright (MPL 2.0).
