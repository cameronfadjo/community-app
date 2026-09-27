# Ticket sales: a thinking document

Status: thinking only. Nothing here is being built yet. Nothing here is decided until the owner decides it.

Every number in this document is a placeholder unless it says otherwise. Every legal, tax, and app store point needs to be re-checked against the current source before any build starts.

## 1. Recommendation in plain words

Do not build ticket sales yet. Learn first, then build the smallest thing that works.

| Stage | What it is | Why |
|---|---|---|
| 0 (now) | Keep the link out. The event's `ticketUrl` opens wherever tickets are sold today. Count taps on that link. | Costs almost nothing. Tap counts show whether people want tickets through the app at all, and give partners a number to look at. |
| 1 | In-app checkout using Stripe Connect. The buyer pays on a Stripe web page opened from the app. The money goes to the venue's Stripe account. The app keeps a small fee from each sale. | This is the first stage that earns revenue. Stripe holds the card details and the money. The app never does. |
| 2 | Door check-in. The ticket is shown on the phone and staff press and hold to admit, the same way perks work today. A door list in the partner dashboard is the backup. | Reuses a flow staff already know. Needs no scanner and no staff device. |
| 3 | Extras: more than one ticket type, tables, promo codes, QR scanning for big events. | Only when a real partner asks for them. |

Move from Stage 0 to Stage 1 only when there is evidence: steady taps on ticket links, and at least a few partners who say they would switch.

One place where this document differs from the simplest plan. The simplest Stripe setup makes the venue the seller in every sense. That is the safest for the owner, but it means the venue's name appears on the buyer's card statement and the venue can see the buyer's payment details. That conflicts with the promise not to out anyone. Section 2 explains the trade and section 8 lists it as the first decision to make.

## 2. Options compared

Some terms first.

- **Merchant of record**: the business that is the seller as far as the card networks are concerned. Its name goes on the card statement. It carries refunds and disputes.
- **Chargeback** (also called a dispute): the buyer asks their bank to reverse a payment. The seller loses the money and pays a dispute fee unless they win the case.
- **Connected account**: a venue's Stripe account, linked to the app's Stripe account.
- **Application fee**: the cut Stripe sends to the app out of each payment.

### The four broad choices

| | Link out only | Affiliate links | Stripe Connect | Ticketing provider's API |
|---|---|---|---|---|
| What it is | `ticketUrl` opens the seller's page | Same, but the link carries a code so the seller pays the app a commission | The app runs its own checkout on Stripe | The app sells tickets through another ticketing company's system |
| Effort | Small (exists today) | Small to medium. Depends on each seller having a programme and accepting the app | Large | Medium to large. Depends on the provider's terms and what their API allows |
| Who holds the money | The outside seller | The outside seller | Stripe, then the venue | The provider, then the venue |
| Refunds and chargebacks | The outside seller and venue | The outside seller and venue | The venue or the app, depending on setup (see next table) | The provider and venue |
| Tax | Not the app's concern | Commission is income for the app | Depends on setup. Needs an accountant | Mostly the provider and venue |
| Fees to the app | None | None. Commission rates are set by the seller and are unknown | Stripe's fees, check Stripe's current pricing page | Provider's fees, unknown |
| Revenue to the app | None | Unknown, likely small | The application fee, set by the app | Unknown, depends on the provider |
| Privacy | The app learns nothing. The outside seller's privacy practices apply. | Same as link out, but the link tells the seller the buyer came from an LGBTQ+ app | The app controls what is collected and shown | The provider's buyer data practices apply. Often the organiser gets a full buyer list |

Whether any particular ticket seller has an affiliate programme or an open API that fits is not known. That needs checking seller by seller. Many Connecticut hosts sell at the door for cash and use no ticket seller at all, so affiliate links would cover few events.

### Inside Stripe Connect: the choices that matter

Stripe offers different account types and different ways to move the money. The names below are Stripe's. Stripe has been changing how it describes account types, so confirm the current names in Stripe's Connect documentation.

| | Standard account, direct charge | Express account, destination charge |
|---|---|---|
| In one line | The venue has a full Stripe account. The buyer pays the venue. The app takes a fee. | The venue has a light Stripe account. The buyer pays the app. The app passes the money to the venue, minus a fee. |
| Merchant of record | The venue | The app |
| Name on the card statement | The venue's | The app's |
| What the venue can see | The payment in its own Stripe dashboard, which may include the buyer's name, email, and card details such as the last four digits | Only the transfer from the app. Buyer details stay with the app |
| Refunds | The venue issues them | The app issues them, then takes the money back from the venue |
| Chargebacks | Land on the venue | Land on the app first. The app can recover from the venue if the venue still has funds |
| Onboarding for the venue | Heavier. A full Stripe account | Lighter. A short Stripe-hosted form |
| Extra Stripe cost to the app | Check Stripe's pricing page | Stripe may charge the app extra for these accounts. Check Stripe's pricing page |
| Tax position | The venue is clearly the seller | The app looks like the seller. Ask an accountant what that means |
| Risk to the owner | Lower | Higher |
| Privacy for the buyer | Weaker | Stronger |

Stripe also has a setting (`on_behalf_of`) that shifts some of these back to the venue under a destination charge. It is worth a look, but it likely brings the venue's name back onto the statement. Confirm in Stripe's documentation.

### Which to pick

The honest position: privacy points to the right-hand column, and the owner's personal risk points to the left.

Suggested lean: **Express accounts with destination charges**, because the privacy promise is the heart of the product, with these limits to keep the risk small:

- Low price cap per ticket and per order at first.
- Pay venues after the event has happened, not before.
- A written partner agreement saying the venue covers refunds and lost disputes.
- A short list of trusted partners for the first months.

Do not commit to this until an accountant and, ideally, a lawyer have confirmed what being the merchant of record means for tax and liability in Connecticut. If the answer is bad, fall back to the left-hand column and add two protections: ask each venue to set a neutral name for card statements, and show the buyer the exact statement wording before they pay.

## 3. App store rules

Tickets to real-world events count as goods or services used outside the app. In plain terms:

- Apple's in-app purchase is not required for them, and must not be used for them.
- Google Play's billing system is likewise not required for them.
- Apple Pay and Google Pay are allowed when they run through the payment provider (Stripe). They are payment methods, not the stores' own purchase systems.

Where to read the rules:

| Store | Rule to read |
|---|---|
| Apple | App Store Review Guidelines, section 3.1.3(e), "Goods and services outside of the app". Older versions of the guidelines numbered this rule 3.1.5, and the numbering has moved over time. Search the guidelines for the rule's name, not only its number. |
| Google | Google Play Payments policy, the part covering physical goods and services. |

**The owner must re-read the current wording of both before building.** These rules change, and this document was not written from a live copy of them.

Two practical notes:

- Say clearly in the app review notes that the purchase is a ticket to an in-person event.
- Both stores have their own rules for apps with alcohol and nightlife content and for age ratings. Check those at the same time.

## 4. The flows

### Buyer flow

1. The person browses without an account, as today.
2. On an event with tickets, they see the price, the fee, and the total before doing anything.
3. They tap "Get tickets". If they have no account, they are asked to make one now. This is the only point where an account is needed.
4. For 18+ or 21+ events, they confirm their age. The screen says ID is still checked at the door.
5. They choose how many tickets, up to a small limit per order.
6. The app asks the server to start an order. The server checks there are tickets left and holds them for a short time.
7. A Stripe checkout page opens in a browser sheet inside the app. They pay by card, Apple Pay, or Google Pay. The screen shows what their card statement will say.
8. Stripe tells the server the payment worked. The server creates the tickets.
9. The app returns to a "You're going" screen. The ticket sits in a "My tickets" place in the app and is saved on the phone for use without signal.
10. If they close the page or the payment fails, the hold runs out and the tickets go back on sale.

### Door flow

1. The person opens the ticket. It shows the event, a first name, a short code, and something that moves (a live clock or animation).
2. Staff look at the screen, then press and hold it. The ticket changes to "Admitted" with the time.
3. The server records the check-in and updates the event totals.

Buying a ticket should not require location. The 150 m rule stays with perks only.

| Problem | What happens |
|---|---|
| No signal in the venue | The ticket was saved on the phone when bought. Press and hold still works. The check-in is sent when signal returns. |
| Screenshot of a ticket | A screenshot does not move and does not respond to press and hold. Staff are told to refuse a still image. |
| Same ticket on two phones | The ticket belongs to one account. With signal, the second attempt shows "Already admitted". Without signal, two phones signed in to the same account could both get in. For low-price events this risk is accepted. QR scanning in Stage 3 closes it. |
| Dead phone | Staff open the door list in the partner dashboard. It shows first name, short code, and status only. The person gives their first name, staff match it to the ID they are already checking, and mark them admitted. |
| Staff have no device at all | The venue prints the door list before doors open. |

### Partner flow

1. **Get set up to be paid.** In the partner dashboard, the partner taps "Set up payouts" and completes Stripe's own hosted form. Stripe checks identity and bank details. The app never sees bank details.
2. **Add tickets to an event.** On the event form, the partner sets a ticket name, a price, how many are for sale, and when sales close. Ticket sales cannot be switched on until Stripe says the account can take payments.
3. **See sales.** The dashboard shows totals: sold, left, checked in, money expected. No buyer list beyond the door list.
4. **Get paid.** Stripe pays the partner's bank account. Timing is a setting to decide (see section 5).
5. **Cancel or change.** Cancelling an event triggers refunds for every ticket.

Recurring events are stored as one event per date today. Tickets would follow that: each date has its own tickets and its own capacity.

## 5. Money

### Who pays the fee

| Choice | Buyer sees | Good | Bad |
|---|---|---|---|
| Fee added on top | Price plus a fee line | Venue receives the full price | Buyers dislike fees. It can feel like the app is charging users |
| Fee absorbed by the venue | One price, no fee line | Cleanest for the buyer. Fits "users are never charged" best | Venue receives less. Small groups may feel it |
| Venue chooses per event | Either | Flexible | More to build and explain |

Note on the product promise: "users are never charged for access to the app" is about access. A ticket fee is not an access charge, but a fee line may still feel like one. Absorbing the fee is the closest fit to the promise. Whichever is chosen, always show the full total before checkout. Some places have laws about showing the full price up front. Check what applies.

### Worked example (placeholder numbers only)

None of these numbers are decided. The ticket price and the 5% are made up so the sums can be followed. Stripe's processing fee is written as **S** because it must be taken from Stripe's current pricing page.

| Line | Fee on top | Fee absorbed |
|---|---|---|
| Ticket price set by venue (example) | $20.00 | $20.00 |
| App fee, X% (example uses 5%, not decided) | $1.00 | $1.00 |
| Buyer pays | $21.00 | $20.00 |
| Stripe processing fee | S | S |
| Venue receives | $20.00, minus S if the venue pays it | $19.00, minus S if the venue pays it |
| App receives | $1.00, minus S if the app pays it | $1.00, minus S if the app pays it |

Who pays S depends on the Stripe setup. In one setup it comes out of the venue's side, in the other it comes out of the app's side. On a low-price ticket, S could be larger than the app's fee. Work this out with real numbers before choosing X.

### Refunds

- Default rule to consider: tickets are not refundable unless the event is cancelled or moved. The venue may choose to refund in other cases.
- Decide whether the app gives back its fee on a refund. Find out from Stripe whether Stripe returns its processing fee on a refund. Do not assume it does.

### Cancelled events

- When an event's status becomes cancelled, every paid ticket is refunded in full, automatically.
- If the venue has already been paid, the refund has to come from somewhere. Paying venues after the event avoids this problem. That is the main reason to delay payouts.

### Chargebacks

- Who carries them depends on the setup chosen in section 2.
- Either way, keep evidence: order time, ticket, check-in time.
- The partner agreement should say the venue covers lost disputes for its events.

### Sales tax and admissions tax

This is not tax advice. Connecticut has an admissions tax regime, with rules about which events and which kinds of host it applies to. Whether it applies to a given event, who must collect it, and whether the app has any duty as the platform are questions for an accountant. Ask these before Stage 1:

- Is the app or the venue responsible for collecting and paying tax on admissions under each Stripe setup?
- Do rules for online marketplaces apply to the app?
- Are community groups and non-profits treated differently?
- What tax forms does the app need to issue to venues, and does Stripe handle them?

## 6. Data model sketch

Three new collections for sales, plus three helpers. All sit beside what exists today. `events`, `perkRedemptions`, and the perk fields in `eventStats` do not change.

| Collection | One document is | Key fields |
|---|---|---|
| `ticketTypes/{ticketTypeId}` | One kind of ticket for one event | `eventId`, `organizerId`, `name`, `priceCents`, `capacity`, `soldCount`, `heldCount`, `maxPerOrder`, `salesCloseAt`, `status` |
| `orders/{orderId}` | One purchase | `userId`, `eventId`, `organizerId`, `ticketTypeId`, `quantity`, `amountCents`, `feeCents`, `status` (pending, paid, expired, refunded, disputed), `holdExpiresAt`, Stripe session and payment IDs |
| `tickets/{ticketId}` | One admission | `orderId`, `eventId`, `userId`, `firstName`, `code`, `status` (valid, admitted, refunded), `admittedAt`, plus event title and venue name copied in so the ticket screen needs no other lookups |
| `doorLists/{eventId}/entries/{ticketId}` | One line on the venue's door list | `firstName`, `code`, `status` only. No user ID, no email |
| `payoutAccounts/{organizerId}` | A partner's Stripe link | Stripe account ID, whether it can take payments, whether it can be paid |
| `stripeEvents/{stripeEventId}` | A Stripe message already handled | Received time |

`eventStats/{eventId}` gains new counters: `ticketLinkTaps` (Stage 0), `ticketsSold`, `ticketsAdmitted`. The same pattern as perks applies: organizers read totals, never the records behind them.

### Security rules approach

| Collection | Who can read | Who can write |
|---|---|---|
| `ticketTypes` | Everyone (prices are public) | The event's organizer for name, price, capacity. Counters only by Cloud Functions |
| `orders` | Only the buyer, and admin | Cloud Functions only |
| `tickets` | Only the buyer, and admin | Cloud Functions only, with one exception: the buyer's phone may change `status` from valid to admitted once, setting `admittedAt` to the server time, and only around the event's hours. This mirrors the existing perk redeem rule |
| `doorLists` | The event's organizer | Cloud Functions, plus the organizer marking an entry admitted |
| `payoutAccounts` | The organizer it belongs to | Cloud Functions only |
| `stripeEvents` | Nobody | Cloud Functions only |

### What happens only in Cloud Functions

- **Start an order** (called by the app). Checks the event is on, sales are open, and the buyer confirmed their age. Holds the tickets. Creates the Stripe checkout. The price always comes from `ticketTypes` on the server, never from the phone.
- **Stripe webhook** (a web address Stripe calls when something happens). Handles: payment completed, checkout expired, refund, dispute, and changes to a venue's account. It must verify Stripe's signature on every call.
- **On ticket write**. Keeps `eventStats` and `doorLists` up to date, the same way `onPerkRedemptionWrite` does for perks.
- **On event cancelled**. Starts refunds.
- **Account deletion**. The existing `deleteMyAccount` function must learn about orders and tickets. Payment records may need to be kept for a period for tax reasons, with personal details removed. Ask the accountant how long.

### Idempotency (doing something twice has the same result as doing it once)

Stripe can send the same message more than once, and messages can arrive out of order.

- Before handling a message, create `stripeEvents/{stripeEventId}` inside a transaction. If it already exists, stop.
- Give each ticket a predictable ID, such as `{orderId}_{number}`. Creating it twice then writes the same document, not a second ticket.
- Pass an idempotency key to Stripe when creating checkouts and refunds.

### Overselling protection

- Starting an order runs in a Firestore transaction (an all-or-nothing read and write). It reads the ticket type, checks `soldCount + heldCount + quantity` is not more than `capacity`, then raises `heldCount` and creates the pending order.
- On payment completed, another transaction moves the quantity from held to sold.
- On checkout expired, the hold is released. A scheduled function also sweeps up old holds in case a message is lost.
- If a payment arrives after its hold was released and the event is now full, refund it automatically and tell the buyer.

## 7. Privacy and safety

| Topic | Approach |
|---|---|
| Card statement line | Neutral wording that names neither an activity nor the word for any identity. Under the destination setup the app controls this. Under the direct setup the venue's name appears, so show the buyer the wording before they pay. How the wording is set differs by setup. Confirm in Stripe's documentation. |
| Receipts | A receipt is proof of purchase and buyers need one. Keep it in the app by default. If an email receipt is sent, keep the subject line and contents plain: the app name, the amount, a date, an order code. No activity names. Let the buyer choose whether to get email at all. Emails show on lock screens and shared computers. |
| What the venue sees | Totals, and a door list with first name, short code, and status. No email, no phone number, no surname, no user ID. Note that under the direct setup the venue's own Stripe dashboard may show more, outside the app's control. |
| What is collected at checkout | As little as Stripe allows. No postal address. Confirm which fields Stripe's checkout page requires, since some may not be optional. |
| Account requirement | Only at the moment of purchase. Browsing stays open to everyone. |
| Age | The buyer confirms they meet the event's age limit. This is a statement, not proof. ID is still checked at the door, and the ticket screen says so. A ticket is not a promise of entry if the person fails the ID check. |
| Under-18s | The app is for adults and lists no events for under-18s. The event type today still allows an "all ages" value (`minimumAge: 0`). Tickets should only be sold for events marked 18+ or 21+, and the "all ages" value should be reviewed separately. |
| Interests and location | Buying a ticket must not send interests or location to the server. An order does reveal that an account is going to one event. That is a new kind of record for this app. Keep it readable only by the buyer, and remove personal details when no longer needed. |
| Notifications | Ticket reminders should use plain wording on the lock screen. |
| Analytics | Stage 0 tap counts are totals per event only. No record of who tapped. |

## 8. Risks and open questions for the owner

1. **Privacy or lower risk?** Destination charges (app is the seller, stronger privacy, more risk to the owner) or direct charges (venue is the seller, weaker privacy, less risk). This is the biggest decision.
2. **Who pays the fee?** On top, absorbed, or the venue's choice.
3. **What is X?** The fee percentage, and whether there is a minimum fee per ticket.
4. **Tax.** What the accountant says about Connecticut admissions tax and the app's duties under each setup.
5. **Business setup.** Does the owner have a company to hold the Stripe account, and insurance? Selling through a personal account is a risk.
6. **Refund policy.** One policy for all events, or each venue sets its own within limits.
7. **Payout timing.** After the event (safer) or as sales happen (kinder to small groups that need money up front).
8. **Free events.** Should free events offer a "reserve a spot" ticket? It helps hosts plan, but creates a list of who is going, which the app has avoided so far.
9. **Passing a ticket to someone else.** Useful when plans change, but it edges toward social features. Suggested answer for now: no.
10. **Small community groups.** Some have no bank account or legal entity and may not pass Stripe's checks. They stay on link out or cash at the door.
11. **Support load.** Ticket problems happen on weekend nights. One person cannot be on call every night. What is the promise to buyers and venues?
12. **Fraud.** Stolen cards are used to buy tickets. Price caps and order limits help. Stripe's fraud tools need checking.
13. **Partner demand.** Do venues want this, or are they happy with their current seller? Stage 0 numbers and direct conversations should answer this before any build.

## 9. What to build first

In order. Sizes are rough: small is days, medium is a week or two, large is several weeks. No dates.

| Order | Piece | Size |
|---|---|---|
| 1 | Count taps on `ticketUrl` into `eventStats` and show the total in the partner dashboard | Small |
| 2 | Talk to five partners and the accountant. Re-read both app store rules. Decide questions 1 to 5 | Small (no code) |
| 3 | Stripe account in test mode, and partner payout setup in the dashboard | Medium |
| 4 | Ticket type fields on the event form, with `ticketTypes` and its rules | Medium |
| 5 | Start-an-order function and Stripe webhook, with holds, idempotency, and tests | Large |
| 6 | Buyer screens: price on the event, checkout sheet, "You're going", "My tickets" saved on the phone | Medium |
| 7 | Door check-in by press and hold, and the door list in the dashboard | Medium |
| 8 | Refunds, cancelled event handling, dispute handling, account deletion changes | Medium |
| 9 | Pilot with one trusted venue and one low-price event | Small |
| 10 | Extras (ticket tiers, promo codes, tables, QR scanning), only on request | Large |

Steps 1 and 2 are worth doing whatever happens. Everything from step 3 on waits for the decisions in section 8.
