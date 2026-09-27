# Security rules tests

Tests for `apps/community/firestore.rules`. They run the real rules inside
the Firestore emulator and try what each kind of person might try: signed
out, signed in, a partner, and an admin.

Nothing here touches the live project. The emulator is a copy of the
database that lives on the machine running the tests and is thrown away
afterwards.

## Run them

They run on GitHub with every pull request, in the "Security rules" check.

To run them on your own machine you need Java 21 or later, which the
emulator runs on:

```bash
pnpm --filter @community/rules-tests test:rules
```

## What is covered

| File | Covers |
|---|---|
| `signals.test.ts` | Anonymous counts: adding one, and everything else being refused |
| `perks.test.ts` | Unlocking and redeeming a perk, and who can see it |
| `events.test.ts` | Posting, editing, and handing over events |
| `venues.test.ts` | Adding, verifying, and approving venues |
| `claims.test.ts` | Hosts claiming events, and perk totals |
| `accounts.test.ts` | Profiles, activities, and the collections that were removed |

## Writing a test

Each test says who is asking, what they try, and whether it should work:

```ts
it('lets a partner cancel their own event', async () => {
  await seed(env, { 'events/event_1': anEvent() });
  await assertSucceeds(updateDoc(doc(asPartner(env), 'events/event_1'), { status: 'cancelled' }));
});
```

Where the app builds what it sends with a shared helper, such as
`getSignalFields`, the test uses the same helper. That way a change to the
app that the rules would refuse fails here first.
