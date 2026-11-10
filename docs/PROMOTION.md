# Growing the reach of Bible Connections

A checklist for getting the site and the repository in front of more people.

## 1. Set up the repository page (10 minutes)

In the repository on GitHub, click the gear next to **About** (top right of the code page):

- **Description:** `Interactive map of 200,000 Bible cross references with guided journeys, themes and a path finder. English and Spanish.`
- **Website:** `https://bibleconnections.app/`
- **Topics:** `bible`, `bible-study`, `cross-references`, `data-visualization`, `webgl`, `accessibility`, `church`, `christianity`, `scripture`, `open-data`, `pwa`, `spanish`

Then go to **Settings > General > Social preview** and upload `docs/social-preview.png`. This is the image people see when the repository link is shared.

Also worth doing:

- Pin the repository on your GitHub profile.
- Turn on **Discussions** (Settings > General > Features) so people can share ideas without opening issues.
- Create a release (Releases > Draft a new release, tag `v0.5.0`) and paste the 0.5.0 section of the changelog. Releases show up in followers' feeds.
- Add a few issues labeled `good first issue` (for example "Write a note for a connection" or "Translate a journey") to invite contributors.

## 2. Make the site easy to find

- Add the site to [Google Search Console](https://search.google.com/search-console) and submit `https://bibleconnections.app/sitemap.xml`.
- Do the same in [Bing Webmaster Tools](https://www.bing.com/webmasters).
- A custom domain such as `connections.yourchurch.org` is easier to remember and share (see [CUSTOM-DOMAIN.md](CUSTOM-DOMAIN.md)).

## 3. Share it where people already gather

**Church and ministry**

- Your own church: a short demo in a service or small group, the welcome page on screen, a QR code on the bulletin or slides.
- Small group and youth leaders: send the printable journey handouts.
- Christian tech communities such as FaithTech and church communications groups.

**Bible and data communities**

- Let OpenBible.info know you built on their cross reference data (they welcome hearing about projects).
- Reddit: r/dataisbeautiful (a screenshot or short screen recording of the map), r/Bible, r/Christianity, r/webdev and r/javascript (how it draws 200,000 arcs with WebGL).
- Hacker News: post as "Show HN: An interactive map of 200,000 Bible cross references".
- Product Hunt: launch on a weekday morning, Pacific time.

**Developers**

- Write a short article on DEV.to or Medium about a technical piece, for example "Rendering 200,000 arcs with WebGL instancing" or "Making a data visualization accessible to screen readers", with a link to the repository.
- Submit to curated lists on GitHub, for example `awesome-dataviz`, `awesome-webgl` and Bible or Christian open-source lists.

## 4. Show, do not tell

- Record a 20 to 30 second screen recording: zoom from the whole Bible into John 3:16, then play the "How are these connected?" chain. Short videos travel much further than links.
- Post one interesting connection a week (the Save image button makes a ready-made picture) with a link to that exact view.

## 5. Keep momentum

- Ship small updates and note them in the changelog; each release is a reason to post again.
- Reply to issues and discussions quickly; early contributors become your best promoters.
- Track what works with the optional privacy-friendly stats (see [ANALYTICS.md](ANALYTICS.md)).
