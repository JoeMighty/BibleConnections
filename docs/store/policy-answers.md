# Play Console forms: drafted answers

Check each answer against the form on the day, as Google changes the wording.

## Data safety

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No.** Notes, saved verses and settings stay in the app's local storage on the device and are never sent anywhere. Visit counting (GoatCounter) is anonymous: no cookies, no identifiers, no personal data, and it is off when Do Not Track or Global Privacy Control is on. Under Google's definition, data that is processed only on the device or anonymised is not "collected". |
| Is all of the user data collected by your app encrypted in transit? | Not applicable (none collected). All traffic is HTTPS. |
| Do you provide a way for users to request that their data be deleted? | Not applicable. Users can clear it themselves: Settings in the app, or clearing the app's storage in Android. |
| Privacy policy URL | https://bibleconnections.app/privacy.html |

If you prefer to be extra cautious, declare **App activity > App interactions**, collected, not shared, **for Analytics**, processed ephemerally, not required. Either way the policy page matches.

## Content rating (IARC questionnaire)

- Category: **Reference, News, or Educational**.
- Violence, sexuality, language, controlled substances, gambling: **No** to all. (The app shows references and short summaries, not graphic content.)
- Users interact or share content with each other: **No.** (Sharing a link uses Android's share sheet; there is no chat or user-generated content in the app.)
- Shares the user's location: **No.**
- Digital purchases: **No.**
- Expected rating: Everyone / PEGI 3.

## Target audience and content

- Target age groups: **18 and over** and **13 to 17**. Do not select under 13, so the app is not in the Designed for Families program (kids mode stays a feature, not the audience).
- Appeals to children: answer honestly that it is a general Bible study app.
- Ads: **No ads.**
- In-app purchases: **None.**
- News app: **No.** Government app: **No.** Financial features: **None.** Health: **No.**

## Store settings

- App category: **Books & Reference**.
- Contact email: hello@bibleconnections.app (set up forwarding in Namecheap first).
- Website: https://bibleconnections.app

## Images

Made by `node scripts/store-images.mjs` (serve `site/` on port 8765 first): `icon-512.png`, and per language `feature-graphic.png` (1024 x 500) and 7 phone screenshots (1080 x 1920).
