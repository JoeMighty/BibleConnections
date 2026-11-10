# The web address

The site lives at **https://bibleconnections.app**, hosted by GitHub Pages from this repository. Old `joemighty.github.io/BibleConnections/` links redirect there automatically.

## How it is set up

- **Domain:** registered at Namecheap, using Namecheap BasicDNS.
- **DNS records** (Namecheap, Advanced DNS):
  - Four `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
  - Four `AAAA` records for `@`: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
  - A `CNAME` record for `www` pointing to `joemighty.github.io.`
- **GitHub:** Settings > Pages > Custom domain is `bibleconnections.app`, with **Enforce HTTPS** on. Every `.app` address only works over HTTPS.
- **Email:** optional forwarding (for example `hello@bibleconnections.app`) is set in Namecheap under Mail Settings, and does not affect the website records.

## If the address changes again

Replace `https://bibleconnections.app/` in `site/index.html` (link previews, canonical and language links), `site/robots.txt`, `scripts/sitemap.mjs`, `scripts/feeds.mjs`, `package.json`, `CITATION.cff` and the README, then run `node scripts/sitemap.mjs`. The calendar feed keeps its event IDs (`@joemighty.github.io`) on purpose, so calendars that already subscribed do not get duplicate events.
