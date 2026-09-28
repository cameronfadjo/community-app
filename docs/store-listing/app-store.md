# App Store listing draft (Apple)

Draft copy. Nothing here has been checked for availability or trademarks. Confirm current field limits in App Store Connect as you paste. Character counts below include spaces.

Do not add statistics, awards, or quotes from users unless they are real and you can prove them.

## App name options

Apple limits the name to 30 characters, and it must be unique on the App Store. "Community" alone is weak: it is almost certainly taken, it says nothing about the app, and nobody searching for it would find you.

| Option | Characters | Notes |
| --- | --- | --- |
| Community: Queer Nights Out | 27 | Keeps the current name. Says what it is. |
| Community: LGBTQ+ Events | 24 | Clearest for search. |
| Community Tonight | 17 | Short. Matches the Tonight tab. Less clear about who it is for. |
| Community CT: Queer Events | 26 | Honest about Connecticut. Must change when you expand. |
| Community: Go Out, Get a Perk | 29 | Leads with the perk. Does not say LGBTQ+. |

Before you choose:

- Search the exact name on the App Store and Google Play.
- Search for trademarks. Ask a lawyer if unsure.
- Some people dislike the word "queer". Others prefer it. Choose what fits your audience.
- A fully distinct brand name, not based on "Community", would be easier to protect and to find. Worth considering now, since the name also drives the domain and bundle identifier.

## Subtitle

Limit: 30 characters.

| Option | Characters |
| --- | --- |
| LGBTQ+ events and venue perks | 29 |
| Find queer events near you | 26 |
| LGBTQ+ events in Connecticut | 28 |

Do not repeat words from the name. Apple already indexes both.

## Promotional text

Limit: 170 characters. Can be changed without a new build.

> Now in Connecticut. Pick what you feel like doing, see what's on, and unlock a perk when you walk in. Free, with no ads.

## Description

> [App name] is the simple way to find LGBTQ+ things to do.
>
> Start with what you feel like doing: dancing, a drag show, trivia, a book club. See what's on, when it starts, and how far away it is. Tap for directions and go.
>
> UNLOCK A PERK WHEN YOU ARRIVE
> Some events come with a perk from the venue, such as a free drink. When you get there, tap "I'm here" and show your phone at the bar or the door.
>
> LOOK AHEAD AND SAVE
> See what's on today, this week, or this month. Save anything you'd like to go to, and get a reminder the day before.
>
> NO ACCOUNT NEEDED TO BROWSE
> Open the app and look around. You only need an account to unlock perks.
>
> PRIVATE BY DESIGN
> - No public profile. Other people using the app can't see you.
> - Your location is checked on your phone and not saved.
> - What you save stays on your phone. Nobody else can see it.
> - Reminders are worked out on your phone. What you follow stays with you.
> - No ads. No tracking across other apps.
> - Delete your account at any time, in the app.
>
> FREE
> The app is free to use. There is nothing to buy.
>
> NOW IN CONNECTICUT
> We are starting in Connecticut and adding events as venues and organizers join.
>
> For adults aged 18 and over. Some events are at bars, and some perks are alcoholic drinks. Venues check ID. Please drink responsibly.
>
> Questions? [support email]

Notes:

- Only keep "such as a free drink" if a live event offers one at launch.
- Only keep the privacy claims that are still true in the build you submit. See the rules fixes in `docs/STORE_LAUNCH.md`, phase 8. The "no public profile" claim depends on closing the `users` read rule.

## Keywords

Limit: 100 characters, separated by commas, no spaces. This set is 96.

```text
lgbtq,queer,gay,lesbian,trans,pride,drag,nightlife,bar,events,dancing,trivia,karaoke,connecticut
```

- Remove any word that ends up in your name or subtitle, and use the space for another.
- Only keep activity words that have real events at launch.
- Do not use other apps' names.

## Category

| Field | Suggestion | Why |
| --- | --- | --- |
| Primary | Lifestyle | Going out and local events fit here. |
| Secondary | Entertainment | Drag shows, trivia, dancing. |

Avoid Social Networking. The app has no profiles, messages, or feeds, and the category sets the wrong expectation for reviewers and users.

## Other fields

| Field | Value |
| --- | --- |
| Support URL | [support URL] |
| Marketing URL | [website URL] |
| Privacy policy URL | [privacy policy URL] |
| Copyright | [year] [legal entity name] |
| Price | Free |
| In-app purchases | None |
| Availability | United States only |
| Age rating | Set by the questionnaire. Expect the adult tier. |
| Sign-in required | Yes for perks. Give the demo account in App Review Information. |

## Screenshot plan

Six screens, portrait. Use real events with the venue's approval. Captions are short so they stay readable at small sizes.

| # | Screen | Route in the app | Caption |
| --- | --- | --- | --- |
| 1 | Activity picker | `pick` | What do you feel like doing? |
| 2 | Tonight list, sorted by distance | `(tabs)/tonight` | See what's on tonight |
| 3 | Event detail with the directions button | `event/[id]` | The details, and how to get there |
| 4 | Perk unlocked, with the countdown | `perk/[eventId]` | Arrive and unlock a perk |
| 5 | Map of events | `(tabs)/map` | Find what's close |
| 6 | Account screen, privacy section | `account` | No public profile. No ads. |

Tips:

- Put the perk in the first three if you want it seen. The first three show in search results.
- Keep the status bar clean: full battery, full signal, a simple time.
- The demo account's email shows on the Account screen. Use an address you are happy to make public, or crop to the privacy section.
- If iPad support stays on, capture the same six on iPad.
