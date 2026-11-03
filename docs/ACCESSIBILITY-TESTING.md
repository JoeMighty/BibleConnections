# Accessibility testing with real users

The automated tests check WCAG 2.1 AA rules on every change, but they cannot tell us whether the site is pleasant to use. This plan is for a one-hour session with two or three people who use assistive technology.

## Who to invite

- One screen reader user on a phone (VoiceOver on iPhone or TalkBack on Android).
- One screen reader user on a computer (NVDA or JAWS on Windows, or VoiceOver on Mac).
- One person who uses the keyboard only or switch access, or who has low vision and uses zoom.

Offer to pay for their time. Ask what they need in advance (for example, how they want to receive the tasks).

## Before the session

- Check that the live site is up to date.
- Prepare a short consent note: what you will record (notes only, or audio), and that they can stop at any time.
- Give each person a copy of the tasks in their preferred format.

## Tasks (about 5 to 8 minutes each)

1. From the welcome page, find what John 3:16 connects to and open one of those passages on Bible.com.
2. Choose the theme "Love" and tell us how many connections are shown.
3. Start the guided journey "The Lamb of God" and move to step 3. Tell us the discussion question.
4. Find how Genesis 3:15 is connected to Revelation 12:9.
5. Save a connection, go back to the start, and find the saved item again.
6. Clear everything and return to the welcome page.

## What to note for each task

- Did they finish it? How long did it take?
- Where did they hesitate, get lost or hear something confusing?
- What did the screen reader announce at key moments (after search, after selecting a connection)?
- Anything they expected that was not there.

## Afterwards

- Ask: "What was the most frustrating moment?" and "What would you change first?"
- Write up the findings as GitHub issues, one per problem, labelled `accessibility`.
- Fix the top three before the next release and invite the same people to check them.
