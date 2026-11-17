# Search engines

What is in place:

| File | What it does |
|---|---|
| `site/robots.txt` | Lets every crawler in and points to the sitemap. |
| `site/sitemap.xml` | Every page (journeys, plans, themes, people, places, topics, prophecies, routes, handouts, help pages) in English, Spanish and Portuguese, each listing its language versions, with the latest release date. Regenerate with `node scripts/sitemap.mjs` after adding content or releasing. |
| `site/llms.txt` | A plain summary for AI assistants: what the site is, the main pages, the data sources, and that no Bible text is hosted. Update it when big features are added. |
| Book, verse and "How many" pages | `node scripts/static-pages.mjs` builds `site/books/`, `site/verse/` (the 1,000 most connected verses) and `site/cross-references/` from the map data. CI builds them before testing and deploying; they are not kept in git. English only for now. `scripts/dataset-stats.mjs` refreshes the full-dataset counts when the OpenBible file is updated. |
| `site/404.html` | A translated "Page not found" page that links back to the map (GitHub Pages serves it for any missing address). |
| Page tags | Description, canonical address, language links (hreflang), link previews (Open Graph, Twitter card) on the home, How to use, Roadmap and Privacy pages; Schema.org data on the home page. |

FAQ and how-to rich results are not added: Google now shows FAQ results only for government and health sites, and has stopped showing how-to results.

## Your steps

1. Open [Google Search Console](https://search.google.com/search-console), add a **Domain** property for `bibleconnections.app`, and verify it with the TXT record it gives you (Namecheap, Advanced DNS, add a TXT record with host `@`).
2. In Search Console, open Sitemaps and submit `https://bibleconnections.app/sitemap.xml`.
3. Optional: do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters) (it can import from Search Console). Bing also feeds DuckDuckGo and some AI assistants.
