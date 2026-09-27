# Google Play listing draft

Draft copy. Nothing here has been checked for availability or trademarks. Confirm current field limits in Play Console as you paste. Character counts below include spaces.

Do not add statistics, awards, or quotes from users unless they are real and you can prove them. Google also rejects listings that use words like "best" or "#1", or that put prices and promotions in the app name.

## App name options

Google limits the app name to 30 characters. Use the same name as on the App Store. See `docs/store-listing/app-store.md` for the reasoning.

| Option | Characters |
| --- | --- |
| Community: Queer Nights Out | 27 |
| Community: LGBTQ+ Events | 24 |
| Community Tonight | 17 |
| Community CT: Queer Events | 26 |
| Community: Go Out, Get a Perk | 29 |

Google does not require a unique name, but a name shared with many other apps is hard to find and easy to confuse. "Community" alone has both problems.

## Short description

Limit: 80 characters.

| Option | Characters |
| --- | --- |
| Find LGBTQ+ events by activity. Get directions. Unlock a perk when you arrive. | 78 |
| Pick an activity, see LGBTQ+ events near you, and unlock perks at the door. | 75 |

## Full description

Limit: 4000 characters. Google has no keyword field. Search uses the name and descriptions, so the words people search for should appear here naturally. Do not repeat words to game search.

```text
[App name] is the simple way to find LGBTQ+ things to do.

Start with what you feel like doing: dancing, a drag show, trivia, a book club. See what's on, when it starts, and how far away it is. Tap for directions and go.

UNLOCK A PERK WHEN YOU ARRIVE
Some events come with a perk from the venue, such as a free drink. When you get there, tap "I'm here" and show your phone at the bar or the door.

LOOK AHEAD AND SAVE
See what's on today, this week, or this month. Save anything you'd like to go to, and get a reminder the day before.

NO ACCOUNT NEEDED TO BROWSE
Open the app and look around. You only need an account to unlock perks.

PRIVATE BY DESIGN
- No public profile. Other people using the app can't see you.
- Your location is checked on your phone and not saved.
- What you save stays on your phone. Nobody else can see it.
- Reminders are worked out on your phone. What you follow stays with you.
- No ads. No tracking across other apps.
- Delete your account at any time, in the app.

FREE
The app is free to use. There is nothing to buy.

NOW IN CONNECTICUT
We are starting in Connecticut and adding events as venues and organizers join.

For adults aged 18 and over. Some events are at bars, and some perks are alcoholic drinks. Venues check ID. Please drink responsibly.

Questions? [support email]
```

Notes:

- Only keep "such as a free drink" if a live event offers one at launch.
- Only keep the privacy claims that are still true in the build you submit. See `docs/STORE_LAUNCH.md`, phase 8.

## Search terms to work into the text

Google has no keyword field. These are the terms the description should cover in natural sentences:

LGBTQ+, queer, gay, lesbian, trans, pride, drag show, nightlife, bar, events, dancing, trivia, karaoke, book club, Connecticut.

Only mention activities that have real events at launch.

## Category and tags

| Field | Suggestion | Why |
| --- | --- | --- |
| App or game | App | |
| Category | Events | Google has an Events category, which fits best. Confirm it is offered in Play Console. |
| Fallback category | Lifestyle | If Events does not fit how you want to be found. |
| Tags | Choose from the list Play Console offers | Pick the closest to events and nightlife. |

Avoid Social and Dating. The app has no profiles or messages, and the Dating category brings extra policy checks.

## Other fields

| Field | Value |
| --- | --- |
| Contact email | [support email] |
| Website | [website URL] |
| Privacy policy URL | [privacy policy URL] |
| Account deletion URL | [account deletion URL] |
| Price | Free |
| Contains ads | No |
| In-app purchases | None |
| Countries | United States only |
| Target audience | 18 and over only |
| Content rating | Set by the questionnaire. Expect Mature. |
| App access | Some features need sign in. Give the demo account. |

## Graphics

Confirm sizes at https://support.google.com/googleplay/android-developer/answer/9866151.

| Asset | Needed | State |
| --- | --- | --- |
| App icon | 512 x 512 PNG | To make, from the final icon |
| Feature graphic | 1024 x 500 | To make. Keep text away from the edges. Do not repeat the store badge or a price. |
| Phone screenshots | At least two, portrait | To capture |
| Tablet screenshots | Optional | Skip for launch |

## Screenshot plan

The same six screens as the App Store, so both listings match.

| # | Screen | Route in the app | Caption |
| --- | --- | --- | --- |
| 1 | Activity picker | `pick` | What do you feel like doing? |
| 2 | Tonight list, sorted by distance | `(tabs)/tonight` | See what's on tonight |
| 3 | Event detail with the directions button | `event/[id]` | The details, and how to get there |
| 4 | Perk unlocked, with the countdown | `perk/[eventId]` | Arrive and unlock a perk |
| 5 | Map of events | `(tabs)/map` | Find what's close |
| 6 | Account screen, privacy section | `account` | No public profile. No ads. |

Tips:

- Use real events with the venue's approval.
- Capture on an Android phone so the system bars look right.
- Google does not allow screenshots that show other stores' badges or iPhone frames.
