# Website

The public website. It holds the pages the app and the app stores link to.

| Page | Address | Source |
|---|---|---|
| Home | `/` | `content/home.md` |
| Terms of Use | `/terms` | `docs/legal/terms-of-use.md` |
| Privacy Policy | `/privacy` | `docs/legal/privacy-policy.md` |
| Support | `/support` | `content/support.md` |
| Delete your account | `/delete-account` | `content/delete-account.md` |

The Terms and Privacy pages are built from the documents in `docs/legal`, so
there is one copy of each.

## See it on your computer

```bash
pnpm --filter @community/website dev
```

Then open http://localhost:4000.

## Blanks

Text in [square brackets] is a blank. A page with any blank left shows a
"Draft" banner and asks search engines not to list it. The build prints
every blank that is left.

Short blanks are filled from `site.config.json`:

| Setting | Fills |
|---|---|
| `appName` | [app name] |
| `siteUrl` | The addresses of the terms, privacy, support, and deletion pages |
| `legalEntityName` | [legal entity name] |
| `contactEmail` | [contact email] |
| `postalAddress` | [postal address] |
| `effectiveDate` | [effective date] |

Longer blanks, such as "[Lawyer to draft ...]", are replaced by editing the
document in `docs/legal`.

## Publish

Publishing refuses to go ahead while any page is a draft.

```bash
cd apps/website && firebase deploy --only hosting --project community-86792
```

This publishes to the project's main web address. If the app itself is ever
published to the web from `apps/community`, the two would share that
address, so give one of them its own site in Firebase Hosting first.

## After publishing

Set the two addresses in `apps/community/.env` and in the EAS build
settings, so the links in the app open the pages:

```
EXPO_PUBLIC_TERMS_URL=https://<your address>/terms
EXPO_PUBLIC_PRIVACY_URL=https://<your address>/privacy
```
