# Connecticut Launch

Working notes for seeding the app in Connecticut, drawn from the community
directory "LGBTQ+ CT Resources" by @queerct (last updated February 11, 2026),
used with the author's approval.

Nothing here has been verified with a venue or organizer. The directory's own
FAQ says its dates, times, and addresses are not monitored. Treat every row as
a lead to confirm.

## Files

| File | Rows | What it holds |
|---|---|---|
| `venues.csv` | 72 | Places where events happen: bars, cafes, community spaces, shops that host events, gyms |
| `recurring-events.csv` | 62 | Recurring events people can turn up to |
| `annual-events.csv` | 10 | Once-a-year events |

Each venue and event row has a `verified` column, set to `No`. Change it to
`Yes` once someone at the venue or the organizer has confirmed the details.

Left out on purpose, because the app is about going out: healthcare, mental
health services, support groups, housing and food resources, salons, tattoo
shops, photographers, wedding venues, college offices, virtual resources, and
anything you cannot simply turn up to (a chorus rehearsal that needs an
audition, for example).

Pride groups and community centers are in the lists as **hosts**. Their
hangouts, game nights, and socials are events like any other. Their services
are not listed.

## What the list shows

### How complete the schedules are

| Schedule detail | Events |
|---|---|
| Day and time both stated | 23 |
| Day stated, time missing | 15 |
| Neither stated | 24 |

Only the first group can be posted as it stands. The other 39 need a call,
an email, or a check of the organizer's website.

### How often events repeat

| Pattern | Events |
|---|---|
| Weekly | 15 |
| Monthly, on a set weekday such as "3rd Saturday" | 20 |
| Every two weeks or twice a month | 2 |
| Varies or not stated | 25 |

### Where they are

| Town | Events | Venues |
|---|---|---|
| Norwalk | 12 | 2 |
| New Haven | 10 | 12 |
| Hartford | 5 | 10 |
| Stamford | 5 | 6 |
| Middletown | 5 | 4 |
| Putnam and Danielson | 6 | 3 |

Norwalk's count is high because one organizer, Triangle Community Center,
runs most of its events, and one bar, Troupe 429, runs the rest.

### What this means for the app

1. **Most nights are quiet.** The events with a full schedule come to about
   two a night across the whole state. In any one town, most nights have
   nothing. The home screen now shows the week when fewer than three events
   are on today.
2. **Monthly repeats are the most common pattern.** The posting form now
   repeats weekly, every two weeks, or monthly on a numbered weekday such as
   the 3rd Saturday. For "1st and 3rd", post two monthly events.
3. **Connecticut is driven, not walked.** Events are spread across towns 20
   to 60 minutes apart by car. "12 min walk" will rarely apply, and nudges
   currently skip anything more than 8 km away.
4. **Many events are daytime.** Hangouts at 3 PM, a craft fair at noon, D&D
   from noon. The home tab is now called "What's on", and the app says
   "today" before 5 PM and "tonight" after.
5. **Many hosts are groups, not venues.** Trans Haven, Triangle Community
   Center, and Bethel Pride host at libraries, cafes, and churches.
6. **Bars are the thinnest part of the data.** Nine of the eleven bars have no
   schedule at all, only "frequent events, check their website".

## Activities

The app's activities are all things to go and do. The starting set has 32.
Six were added for Connecticut, and "Support groups" was retired because it
is a service, not a night out.

| Added activity | Events in the list | Examples |
|---|---|---|
| Hangouts | 11 | Nonbinary Hangout, FEMinent Domain, Bicon Social Hour |
| Meetups and mixers | 6 | Beers & Queers, Pink Drink Social, Building the Rainbow CT |
| Tabletop and role-playing | 5 | Dungeons & Dragons, Magic draft nights, Nerd Night |
| Markets and fairs | 1 | Queer Community Craft Fair |
| Watch parties | 0 with a schedule | Drag Race watch parties at Misfit Club and Blue Orchid |
| Theater and performance | 0 with a schedule | TheaterWorks, Ivoryton Playhouse, Real Art Ways |

To add them to the live app, run the seed script again. It adds what is
missing and switches off "Support groups":

```bash
pnpm --filter @community/admin-dashboard seed:activities
```

### Existing activities with no events in the list

Happy hours, Comedy, Leather nights, Pride events (annual only), and Classes
and workshops. Keep them; bars and venues are likely to fill them once they
post their own schedules.

### Existing activities that fit well

Game nights (7), Trivia (4), Sports and fitness (4), Outdoors (4), Karaoke
(3), Dancing (3), Arts and crafts (3), Film nights (3), Book clubs (3).

## Tags: comparison and suggested additions

The app records five facts per event: good for going solo, first-timers
welcome, alcohol-free, step-free entry, and a minimum age of all ages, 18, or
21. The directory records more, and one entry (Queer Craft Nights at Space)
shows how useful the extra detail is.

### Suggested additions

| Detail | Why | Seen in the directory |
|---|---|---|
| Gender neutral bathrooms | Often the deciding factor for trans and nonbinary people | Stated for several venues |
| Sound level: low, medium, loud | Helps people with sensory needs choose | "Low to medium (soft music, indoor voices)" |
| Quiet space available | Same | "Front foyer space or hallway" |
| ASL interpreted | Opens events to Deaf and hard of hearing people | Pink Drink Social |
| Sign-up required | Several events turn people away without it | Triangle Community Center groups, library book club |
| Parking and public transit | Connecticut is car-dependent | "Free in parking lot", "bus stop one block away" |
| Mask policy | Still matters to some people | "N95s provided, masks not required" |
| Language | Some events are not in English | Espacio Trans is in Spanish |
| Age range, with an upper limit | The current minimum age can't express these | 18 to 25, 18 to 24, 45+ |

### "Who it's for" should be structured

The app stores this as free text. The directory uses a consistent set, and a
fixed list would let people filter by it:

- Trans people, transfeminine, transmasculine, nonbinary
- People of color
- Sapphic, queer women
- Bears, queer men
- Bi+ and pan
- Seniors
- Young adults
- Everyone welcome

### Venue details worth recording

Accessibility belongs to the venue, so it should be entered once and carried
to every event there. The directory also notes ownership, which people use to
choose where to spend money: queer owned, gay owned, Black owned, woman owned.

## Under-18 events

The directory lists 23 events for preteens and teens. They are left out of
this folder and out of the app. This was decided on September 27, 2026.

- The app shows perks at bars and asks for location. It is for adults.
- Publishing when and where LGBTQ+ minors gather, in an app anyone can open
  without an account, is a safety risk.

When seeding, skip any event whose audience is under 18, and any event with an
age range that ends at 18 or below.

## Seed plan

### Stage 1: Get ready (before any data goes in)

Changes the app needs first. Each is listed because the data requires it.

| Change | Why |
|---|---|
| ~~Monthly repeat, such as "3rd Saturday"~~ Done | 20 events repeat this way |
| ~~Fall back to "this week" when today is thin~~ Done | About two events a night statewide |
| Choose a town, and show driving distance | Events are spread across the state |
| Seed venues from a file, with addresses and map positions | 72 venues; only 4 have a street address in the source |
| Let an admin post events on an organizer's behalf | Organizers don't have accounts yet |
| Mark seeded events as unconfirmed, with their source | The details are unverified |
| Let an organizer claim their event, and ask for removal | The directory offers removal to owners; the app should too |
| ~~New activities~~ Done. Tags from the section above are still to do | The extra detail helps people choose |

### Stage 2: Confirm the first town

Start in **New Haven**. It has the most venues (12) and the most events with a
full schedule (8), and they are close together. Trans Haven alone hosts five
monthly events at one address.

1. Look up and confirm addresses for the 12 New Haven venues.
2. Contact the hosts to confirm schedules. Five conversations cover most of
   it: Trans Haven, Blue Orchid, Ascent Climbing, Strange Ways, and Possible
   Futures.
3. Ask the bars for their regular nights: Partners, Gotham Citi Cafe, 168 York
   Street Cafe, Stella Blues. This fills the biggest gap in the data.
4. Post eight weeks of events for everything confirmed.

Target: about 15 confirmed recurring events, which is three or four a week.

### Stage 3: Add Hartford and Norwalk

- **Hartford:** Chez Est, Sol y Luna, Real Art Ways, Out Film CT, Space,
  the Trans Haven hangout at 30 Ash.
- **Norwalk:** Troupe 429 and Triangle Community Center. Two conversations
  cover twelve events.

### Stage 4: Hand over to organizers

- Invite each host to claim their events and keep them current.
- Offer the first perks with two or three bars that are already engaged.
- Work with @queerct: credit the directory in the app, and agree how
  corrections flow between the two.

### Stage 5: The rest of the state

Middletown, Stamford, Putnam and Danielson, and the statewide groups. By this
point the claim flow should let organizers add themselves.

### What to measure

- Events confirmed, as a share of events listed
- Events claimed by their organizer
- People who tapped "Take me there"
- Perks unlocked at the door

## Open questions

- Should the app credit @queerct inside the app, and how?
- Does the app launch under the name "Community" in Connecticut, or something
  local?
- Who makes the confirmation calls?
- Are events open only to a specific group listed for everyone to see, or
  shown only when someone filters for them?
