# Usage stats (optional)

Stats are **off** by default. When switched on, the site loads one small script from a privacy-friendly service. These services use no cookies and collect no personal data. Visitors who turn on "Do Not Track" or "Global Privacy Control" are never counted. When stats are on, the About box tells visitors.

## GoatCounter (free for non-commercial use)

1. Create an account at https://www.goatcounter.com and choose a code, for example `bibleconnections`.
2. Edit `site/content/config.json`:

```json
{ "analytics": { "provider": "goatcounter", "goatcounterCode": "bibleconnections", "plausibleDomain": "" } }
```

## Plausible (paid)

1. Add your site at https://plausible.io.
2. Edit `site/content/config.json`:

```json
{ "analytics": { "provider": "plausible", "goatcounterCode": "", "plausibleDomain": "bibleconnections.app" } }
```

To switch stats off again, set `"provider": ""`.

## Measuring the verse screen

Two events show whether the verse screen works:

- `event/verse/open`: someone opened a single verse.
- `event/verse/connection`: from that verse, they opened one of its connections.

Divide the second by the first. If fewer than about a third of people who open a verse go on to a connection, the connections are still too hard to see or too uninviting. Compare the number before and after a change, over at least two weeks.
