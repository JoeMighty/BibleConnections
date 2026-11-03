# Editing the content

Notes, journeys, themes and the sermon series live in plain data files in `site/content/`. You can edit them on the GitHub website without installing anything.

## How to edit on GitHub

1. Open the file on GitHub, for example `site/content/journeys.json`.
2. Click the pencil icon (Edit this file).
3. Make your change, keeping the quotes, commas and brackets as they are.
4. Click **Commit changes**. Choose **Create a new branch and start a pull request** if you want someone to review it first.
5. The automatic tests check every change. If something is wrong (a missing comma, or a reference that does not exist) the check turns red and the site is not updated. Open the failed check to see which line needs fixing.

## When changes appear

The site updates a minute or two after the change is merged into `main`. People who have visited before may see the old version once, because the site keeps a copy for offline use; it refreshes on their next visit.

## Copyright rule

Write everything in your own words. Do not copy or closely paraphrase verses from the NIV, ESV, NLT or any other copyrighted translation. Describe what the passage says instead.

## References

References use the format `Book.Chapter.Verse`, for example `John.3.16`, `1Cor.13.4`, `Ps.23.1`.
The book codes are listed in `site/data/books.json` (the `osis` value), for example Gen, Exod, Ps, Prov, Isa, Matt, Mark, Luke, John, Acts, Rom, 1Cor, Rev.

## Files

### `notes.json`: "why it connects" notes

```json
{ "from": "Rom.8.28", "to": "Gen.50.20", "type": "Echo", "note": "Joseph's story is the classic picture of Romans 8:28." }
```

- `type` is one of: Quotation, Fulfillment, Parallel, Promise, Echo, Same truth, Contrast.
- The two references must be a connection that exists in the map (the tests check this).

### `journeys.json`: guided journeys

```json
{
  "id": "lamb",
  "name": "The Lamb of God",
  "summary": "One sentence shown on the journey list.",
  "steps": [
    { "a": "Gen.22.8", "b": "John.1.29", "title": "Step title", "note": "Two or three sentences.", "question": "A discussion question." }
  ]
}
```

- `id` is used in links, so use lower case letters with no spaces, and do not change it once shared.
- Every step needs a `title`, `note` and `question`.

### `themes.json`: themes

```json
{ "id": "love", "name": "Love", "description": "Short description.", "verses": ["John.3.16", "1Cor.13.4"] }
```

### `series.json`: current sermon series

```json
{
  "enabled": true,
  "title": "Series name",
  "description": "One or two sentences.",
  "passages": [ { "ref": "John 3:16", "title": "Week 1: Title" } ]
}
```

- Set `enabled` to `true` to show the series on the welcome page, `false` to hide it.
- `ref` uses normal references such as `John 3:16`, `Psalm 23` or `Isaiah 53`.

## Spanish text

Spanish versions of themes and journeys are in `themes.es.json` and `journeys.es.json`. They use the same `id` values. If a Spanish entry is missing, the English text is shown.
