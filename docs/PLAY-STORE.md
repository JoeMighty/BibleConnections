# Google Play: plan

Bible Connections is already an installable web app (it has a manifest, icons and offline support). The usual way to put a web app like this on Google Play is a **Trusted Web Activity**: a small Android app that opens the site full screen, with no browser bar, and updates whenever the site updates. There is no second codebase to maintain.

## The one blocker: the web address

Android only hides the browser bar if the site proves it belongs to the app, with a file at the **root of the domain**: `https://<domain>/.well-known/assetlinks.json`.

The site lives at `joemighty.github.io/BibleConnections/`, so the file would have to be at `joemighty.github.io/.well-known/assetlinks.json`. That address belongs to a different repository. There are two ways to solve it:

| Option | What it takes | Notes |
|---|---|---|
| **A. Custom domain** (recommended) | Buy a domain (for example `bibleconnections.app`, about $15 a year), point it at GitHub Pages, add a `CNAME` file | A short, memorable address for churches and the store listing. All existing links keep working through a redirect. |
| **B. User site repository** | Create a `JoeMighty/JoeMighty.github.io` repository holding only `.well-known/assetlinks.json` (plus a `.nojekyll` file) | Free, but the store app and the site keep the long address. |

## Phases

| Phase | What | Who |
|---|---|---|
| 1. Account | Create a Google Play developer account ($25 one time, with identity verification). New personal accounts must run a **closed test with at least 12 testers for 14 days** before going public, so line up testers early (church members are ideal). Check Google's current rules when signing up, as they change. | You |
| 2. Web app ready for stores | Manifest: app `id`, `categories`, shortcuts (Journeys, Places, Study), `screenshots`, `display_override`. A privacy policy page (the store requires one). Check the install prompt, offline start and back button inside the app. | Code |
| 3. Domain | Option A or B above, then `assetlinks.json` with the app's signing fingerprint. | You choose, code does the rest |
| 4. Build the app | Generate the Android project with Bubblewrap (Google's tool for this), package name such as `app.bibleconnections`, using Play App Signing. A GitHub Actions workflow builds the signed bundle so releases are repeatable. The upload key is kept as a GitHub secret, never in the repository. | Code, plus you to hold the key |
| 5. Store listing | Name, short description (80 characters), full description, 512 px icon, 1024 x 500 feature graphic, 4 to 8 phone screenshots, plus tablet screenshots. In English first, then Spanish and Portuguese, which the site already supports. | Code drafts, you approve |
| 6. Policy forms | Content rating questionnaire, Data safety form (the site collects no personal data and uses no cookies; visit counting is anonymous), target audience. Choosing a general audience rather than "designed for children" avoids extra Families policy requirements, even though there is a kids mode. | You submit, using drafted answers |
| 7. Closed test, then launch | 12 or more testers for 14 days, fix anything they find, then apply for production. | You and testers |

## What stays the same

- No Bible translation text is added: reading still opens Bible.com, and the store description says so.
- Updates to the website appear in the app straight away. A new app build is only needed when the Android wrapper changes.

## Decisions needed

1. Custom domain (A) or user site repository (B)?
2. Whether you are ready to create the Google Play developer account, and who will be the testers.
