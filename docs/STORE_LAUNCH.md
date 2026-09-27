# Store launch plan

This is the full map of what has to happen to put the app on the Apple App Store and Google Play.

Each item is marked with who does it:

- **Cameron**: needs a person, an account, money, or a legal decision.
- **In the repo**: code or config work.

Store rules, fees, and form questions change. Where this doc mentions one, confirm it on the official page before you act. Nothing here is legal advice.

Last checked against the code: 2026-09-27.

## What the app does today (checked in code)

These facts drive most of the store answers below.

| Fact | Where it was checked |
| --- | --- |
| Browsing works without an account. An account is only for perks. | `apps/community/app/account.tsx`, `firestore.rules` (events and activities are public read) |
| Sign up asks for a name, an email, and a password. | `apps/community/app/auth/register.tsx`, `src/services/firebase/auth.ts` |
| A "Continue with Google" button is on the sign in and sign up screens. It uses a web popup, which does not work in the phone app. | `app/auth/login.tsx`, `app/auth/register.tsx`, `src/services/firebase/auth.ts` |
| Location is asked for while the app is open only. There is no background location. | `src/utils/location.ts` uses `requestForegroundPermissionsAsync` only. No task manager, no background request. |
| Location is used to sort by distance and to confirm arrival within 150 m. The check runs on the phone. Coordinates are not written to Firestore. | `packages/types/src/perk-utils.ts` (`ARRIVAL_RADIUS_KM = 0.15`), `src/components/events/PerkCard.tsx`, `src/services/api/perks.ts` |
| Notifications are scheduled on the phone. No push token is sent to a server. | `src/services/notifications.ts`, `src/store/notificationStore.ts` |
| Account deletion is in the app, on the Account screen. It calls the `deleteMyAccount` Cloud Function. | `app/account.tsx`, `functions/src/account/deleteMyAccount.ts` |
| No ads, no analytics SDK, no crash reporting SDK, no in-app purchases. | `apps/community/package.json` |
| No camera, photo, or microphone permission or plugin is declared. | `apps/community/app.json` |
| There is no age check in the app. | Searched `app/` and `src/` |
| There are no Terms or Privacy screens or links in the app. | Searched `app/` and `src/` |

## Phase 0: decisions that block everything else

- [ ] **Cameron**: Decide whether to publish as an individual or as an organization. This sets the seller name shown on the stores and who is legally responsible. If you enroll as an organization, Apple and Google ask for a D-U-N-S number. Getting one can take time, so start early.
- [ ] **Cameron**: Pick the store name. "Community" alone is a weak choice:
  - App Store names must be unique. A common word like this is very likely taken.
  - Reviewers can reject generic names that do not describe the app.
  - People searching "community" will not find you.
  - See the name options in `docs/store-listing/app-store.md`. Check each one by searching both stores, and check for trademarks. Talk to a lawyer if you are unsure.
- [ ] **Cameron**: Decide the bundle identifier (iOS) and package name (Android). See the next section. These cannot be changed after release.
- [ ] **Cameron**: Buy a domain. You need it for the privacy policy URL, the support URL, the account deletion page, and a contact email.
- [ ] **Cameron**: Decide what to do with Google sign in for version 1. See "Sign in options" in phase 3.
- [ ] **Cameron**: Decide whether the app supports iPad. `ios.supportsTablet` is `true` today. If it stays on, you must supply iPad screenshots and the layout must look right on iPad. Turning it off is the simpler path for launch.

### Bundle identifier and Android package

**Current value: missing.** `apps/community/app.json` has no `ios.bundleIdentifier` and no `android.package`. Nothing was invented for you.

- Suggested format: `com.<yourdomain>.community`. For example, if your domain were `example.com`, the value would be `com.example.community`.
- Use the same value on both platforms.
- Use lowercase letters, numbers, and dots. Avoid hyphens and underscores, since each platform accepts different characters.
- Once an app is released with a value, it is permanent. A new value means a new app listing.

- [ ] **Cameron**: Choose the value.
- [ ] **In the repo**: Add `ios.bundleIdentifier` and `android.package` to `apps/community/app.json`.

## Phase 1: accounts

- [ ] **Cameron**: Enroll in the Apple Developer Program at https://developer.apple.com/programs/. There is a yearly fee. Check the current amount on that page. Enrollment can take days, longer for organizations.
- [ ] **Cameron**: Create a Google Play Console account at https://play.google.com/console/signup. There is a registration fee. Check the current amount on that page. Google verifies your identity, which can take days.
- [ ] **Cameron**: Note the Google Play testing rule for new personal accounts. New personal accounts must run a closed test with a minimum number of testers for a set number of days before they can apply for production. Confirm the current numbers in Play Console, under the production access section of your dashboard. Plan for this. It can be the longest wait in the whole launch. Organization accounts are treated differently. Confirm in Play Console.
- [ ] **Cameron**: Create an Expo account at https://expo.dev for EAS Build and Submit. Check the current plan limits on https://expo.dev/pricing.
- [ ] **Cameron**: Turn on two-factor sign in for the Apple, Google, Expo, and Firebase accounts.
- [ ] **Cameron**: In App Store Connect, accept the agreements. Nothing can be submitted until they are accepted. The paid apps agreement and bank details are not needed, because the app is free with no purchases.

## Phase 2: website and legal pages

The stores require public URLs. The app has no website yet.

- [ ] **Cameron**: Have a lawyer review `docs/legal/privacy-policy.md` and `docs/legal/terms-of-use.md`. They are drafts.
- [ ] **Cameron**: Fill in the placeholders: legal entity name, contact email, address, effective date.
- [ ] **In the repo**: Build a small website with these pages:
  - Home: what the app is, with store links.
  - Privacy policy.
  - Terms of use.
  - Support: a contact email and short answers to common questions.
  - Delete your account: how to delete in the app, plus a way to request deletion without the app. Google requires this web link. See phase 5.
- [ ] **In the repo**: Add links to the privacy policy and terms inside the app, on the Account screen and on the sign up screen. Apple expects the privacy policy to be easy to find in the app.
- [ ] **Cameron**: Set up a support email address on your domain and check it often during review.

Firebase Hosting is already configured in `apps/community/firebase.json`, but it currently points at the web build of the app. The website can use a second Hosting site or any static host.

## Phase 3: app changes before the first store build

### Must fix

- [ ] **In the repo**: Add the bundle identifier and package name (phase 0).
- [ ] **In the repo**: Add an age confirmation. The app is for adults but nothing in the app says so or asks. Add a clear "You must be 18 or older" statement at sign up at minimum. A one-time confirmation on first open is stronger. Ask your lawyer which one you need.
- [x] **In the repo**: Fix or remove Google sign in. See below. **Done for version 1: the button now shows in the browser only.**
- [ ] **In the repo**: Keep people signed in on the phone. `packages/firebase/src/client.ts` calls `getAuth(app)` with no storage set up for React Native, so the sign in may be lost each time the app closes. Test on a real device. If it is lost, set up Firebase Auth with AsyncStorage persistence.
- [ ] **In the repo**: Add links to the privacy policy and terms (phase 2).
- [ ] **In the repo**: Replace the icon and splash image if they are still placeholders. See phase 4.
- [ ] **In the repo**: Make sure the app never shows sample data in a production build. `src/data/sampleEvents.ts` and the `usingSampleData` flag exist. Reviewers reject apps that show placeholder content.
- [ ] **In the repo**: Remove or guard `console.log` calls that print location. `src/utils/location.ts` logs coordinates on web.

### Sign in options

The sign in and sign up screens show "Continue with Google". Two problems:

1. It uses `signInWithPopup`, which works in a browser but not in the iOS or Android app. The button will fail on phones. A broken button is a common reason for rejection.
2. Apple has a rule about apps that offer a third-party sign in such as Google. They must also offer another sign in option that meets Apple's privacy requirements, such as Sign in with Apple. Read App Store Review Guideline 4.8 on https://developer.apple.com/app-store/review/guidelines/ for the current wording.

- [ ] **Cameron**: Choose one:
  - **Simplest for launch**: hide the Google button in the phone app. Email and password only. No Apple sign in needed.
  - **Later**: add native Google sign in and Sign in with Apple together.

### Leftover features from the earlier version

`app.json` declares no camera, photo library, or microphone permission, and no plugin for them. Nothing had to be removed. No package for them is installed either.

The leftovers are in code, not in permissions:

| Leftover | Where | Reachable from current screens? | Suggested action |
| --- | --- | --- | --- |
| Photo upload helpers using Firebase Storage | `apps/community/src/services/firebase/storage.ts` | No screen imports it directly. It is re-exported from `src/services/firebase/index.ts`. | Remove the file and the export. |
| Firebase Storage client created at start up | `packages/firebase/src/client.ts` | Yes, it runs on start, but nothing uploads. | Leave for now. Remove when the dashboards no longer need it. |
| Review Cloud Functions | `apps/community/functions/src/reviews/`, `triggers/updateVenueRating.ts` | Not called by the app. | Remove, or stop deploying them. |
| `reviews` rules | `apps/community/firestore.rules` | Anyone can read reviews. Approved users can create them. | Close to `allow read, write: if false` unless a dashboard needs them. |
| Venue submission by users | `firestore.rules`, `venues` create rule | Not in the app. | Remove the user path when you remove the seeding bypass. |
| Extra profile fields | `functions/src/auth/onUserCreate.ts` writes `bio`, `photoURL`, `favorites`, `subscriptionTier`, `verified` | Not shown in the app. | Remove the unused fields. `subscriptionTier` suggests paid plans, which you do not have. |
| `watchLocation` helper | `src/utils/location.ts` | Not called anywhere. | Remove. It is foreground only, so it is not a policy problem. |
| Default starter screen | `apps/community/App.tsx` | Not used. The entry point is `expo-router/entry`. | Remove. |

These are under paths another engineer is editing, so nothing was changed.

### What was changed in `app.json`

- Added `ios.infoPlist.NSLocationWhenInUseUsageDescription` with plain wording.
- Added `ios.infoPlist.ITSAppUsesNonExemptEncryption: false`.
- Added `android.permissions`: coarse location, fine location, post notifications.
- Added `android.blockedPermissions`: background location, foreground service location, camera, record audio, read and write external storage, read media images, read media video, and the advertising ID permission.

Things to know:

- The Expo libraries add a few permissions of their own that are needed and harmless, such as `RECEIVE_BOOT_COMPLETED` so reminders survive a restart. After the first Android build, open the app bundle in Play Console and read the final permission list. It should match what you declare in the Data safety form.
- If Apple sends an email after upload about a missing purpose string for "always" location, add `NSLocationAlwaysAndWhenInUseUsageDescription` with wording that says the app only uses location while it is open. The app never asks for "always" access.
- The location message shown in the app when permission is denied (`src/utils/location.ts`) says "nearby LGBTQ+ venues and experiences". Update it to match the new purpose string.

### Location permission purpose strings

iOS, set in `app.json`:

> Community uses your location while the app is open to show what's on near you, sorted by distance, and to confirm you have arrived at a venue when you unlock a perk. Your location is not saved.

Replace "Community" when the final name is chosen.

Android shows its own system dialog with no custom text. Google may ask for a short explanation in Play Console if it flags location. Use the same wording.

Apple reviewers check that the app still works when location is denied. Browsing must work without it. Test this.

## Phase 4: store assets

Confirm every size on the official pages before you produce final art:

- Apple: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications
- Google: https://support.google.com/googleplay/android-developer/answer/9866151

### Icon and splash

| Asset | File | Current state | Needed |
| --- | --- | --- | --- |
| App icon | `apps/community/assets/icon.png` | 1024 x 1024 PNG | 1024 x 1024, square, no transparency, no rounded corners. Apple rejects icons with transparency. |
| Android adaptive icon | `apps/community/assets/adaptive-icon.png` | 1024 x 1024 PNG, has transparency | Foreground art kept inside the centre safe area, since Android crops it to circles and other shapes. |
| Splash | `apps/community/assets/splash-icon.png` | 1024 x 1024 PNG | Final logo on the chosen background colour. |
| Play Store icon | not in repo | missing | 512 x 512 PNG, uploaded in Play Console. |
| Play feature graphic | not in repo | missing | 1024 x 500, uploaded in Play Console. Required. |
| Notification icon (Android) | not in repo | missing | A white, single colour icon. Without it Android shows a default. Set through the `expo-notifications` plugin options. |

- [ ] **Cameron**: Confirm the three image files are final art and not the Expo starter images. This could not be judged from the files alone.
- [ ] **Cameron**: Produce the Play Store icon and the feature graphic.

### Screenshots

| Store | What is needed | Notes |
| --- | --- | --- |
| Apple, iPhone | One set at the largest iPhone size Apple currently asks for (the 6.9 inch display class). Apple scales it for smaller phones. | Confirm exact pixel sizes on the Apple page. |
| Apple, iPad | One set at the largest iPad size (the 13 inch display class). | Only if `supportsTablet` stays `true`. |
| Google, phone | At least two. Portrait. | Confirm limits on the Google page. |
| Google, tablet | Optional. | Skip for launch. |

- [ ] **Cameron**: Capture the screens in the screenshot plan in `docs/store-listing/app-store.md`.
- Use real Connecticut events, with the venue's approval. Do not show invented venues or perks.
- Screenshots must show the app itself. Do not show other people's personal data.

## Phase 5: store forms

### Data the app handles

This table is the source for both privacy forms. "Collected" means it leaves the phone and is stored or handled by your services.

| Data type | Collected? | Linked to identity? | Purpose | Notes |
| --- | --- | --- | --- | --- |
| Email address | Yes, only if the person makes an account | Yes | Account sign in, email confirmation, password reset | Stored in Firebase Auth and in the `users` document |
| Name (display name) | Yes, only with an account | Yes | Shown to the person on their Account screen | Asked for at sign up |
| Password | Handled by Firebase Auth | Yes | Sign in | You never see it. Firebase stores a protected form of it. |
| User ID | Yes, only with an account | Yes | Ties perk records to the account | Firebase UID |
| Perk unlock records: event, venue name, perk, time unlocked, time redeemed | Yes, only with an account | Yes | So each perk is used once. Venues see totals only. | This record shows the person was at a venue at a time. Treat it as sensitive. |
| Precise location | No | No | Sort by distance, confirm arrival | Read on the phone and compared on the phone. Not sent to your servers. |
| Notification choices and followed activities | No | No | Reminders | Saved on the phone only |
| Photos, camera, microphone, contacts, calendar | No | No | Not used | |
| Payment or purchase data | No | No | Not used | No purchases in the app |
| Advertising ID, tracking across apps | No | No | Not used | No ad SDK |
| Analytics | No | No | Not used | No analytics SDK is installed. If you add one, update both forms. |
| Crash data | No today | No | Not used | Changes if you add crash reporting. See phase 8. |
| IP address and device details | Handled by Google as your service provider | Not by you | Security and running the service | Firebase receives these when the app talks to it, as any server does. Read Firebase's own guidance for the forms: https://firebase.google.com/docs/ios/app-store-data-collection and https://firebase.google.com/docs/android/play-data-disclosure |

Sexual orientation: the app does not ask for it. But use of an LGBTQ+ app, and a record of being at an LGBTQ+ venue, can suggest it. Ask your lawyer whether your state privacy laws treat this as sensitive data, and whether to declare "Sensitive info" on the Apple form.

### Apple App Privacy answers (nutrition label)

- [ ] **Cameron**: Fill in App Store Connect, under App Privacy. Suggested answers:

| Apple data type | Answer | Linked to user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Contact info: email address | Collected | Yes | No | App functionality |
| Contact info: name | Collected | Yes | No | App functionality |
| Identifiers: user ID | Collected | Yes | No | App functionality |
| Usage data: product interaction (perk records) | Collected | Yes | No | App functionality |
| Location: precise location | Not collected | | | Used on the device only |
| Everything else | Not collected | | | |

- Tracking: answer No. The app does not track people across other companies' apps or sites. No App Tracking Transparency prompt is needed.
- Apple's form has its own definitions. Read them as you go. If a definition does not match this table, follow the definition.

### Google Data safety answers

- [ ] **Cameron**: Fill in Play Console, under App content, Data safety. Suggested answers:

| Question | Answer |
| --- | --- |
| Does the app collect or share required user data types? | Yes |
| Is all data encrypted in transit? | Yes. Firebase uses HTTPS. |
| Can people ask for their data to be deleted? | Yes. In the app and through the web link. |
| Personal info: email address | Collected. Not shared. Optional, since an account is optional. Purpose: account management, app functionality. |
| Personal info: name | Collected. Not shared. Optional. Purpose: account management. |
| Personal info: user IDs | Collected. Not shared. Optional. Purpose: account management, app functionality. |
| App activity: app interactions (perk records) | Collected. Not shared. Optional. Purpose: app functionality. |
| Location: approximate and precise | Not collected, if Google's definition of "collected" matches what the app does. The location stays on the phone. Read the definition in the form. |
| Everything else | Not collected |

"Shared" on Google's form does not cover service providers acting for you, such as Firebase. Confirm against the wording in the form.

### Account deletion

- Apple: apps that let people create an account must let them start deletion in the app. This exists on the Account screen.
- Google: needs the same, plus a web link where someone can ask for deletion without the app. You enter this link in the Data safety form.

- [ ] **In the repo**: Build the web deletion page (phase 2). The simplest version explains the in-app steps and gives an email address for requests. A better version lets the person sign in on the web and delete.
- [ ] **Cameron**: Decide how you confirm that an email request really comes from the account owner.
- [ ] **In the repo**: Test that `deleteMyAccount` is deployed to the production project and removes the `users` document, the perk records, and the sign in.
- [ ] **Cameron**: Partner and admin accounts cannot delete themselves. They are told to contact you. Make sure the support email works.

What deletion removes today: perk records, old reviews and check-ins, the profile document, uploaded files, and the sign in. `eventStats` totals stay, and they hold no account details.

### Age rating

- [ ] **Cameron**: Answer the Apple age rating questions in App Store Connect and the Google content rating questionnaire in Play Console. Answer honestly about alcohol references. The app features bars and drink perks.
- Expect the highest adult tier on Apple (17+ or 18+, depending on Apple's current tiers) and a Mature rating from Google's rating authority. The final rating comes from the questionnaires.
- [ ] **Cameron**: In Play Console, set the target audience to adults only (18 and over). Do not include any younger age group. Including children triggers the Families policy.
- [ ] **Cameron**: Read each store's policy on alcohol promotion. A "free drink" perk promotes alcohol. Keep wording aimed at adults and never suggest heavy drinking. Check Connecticut rules on free drink promotions with your lawyer, since that is a state law question and not a store one.
- There is no user-generated content visible to other users in the app today. If reviews or photos come back, both stores require reporting, blocking, and moderation tools.

### Countries

The app is LGBTQ+ themed. Some countries restrict this content by law, and listing the app there can create risk for you and for people who install it.

- [ ] **Cameron**: Choose availability on purpose. Start with United States only on both stores. Apple selects many countries by default, so change it.
- Events are in Connecticut only. A wider release would show an empty app.

### Export compliance

- The app uses standard HTTPS encryption only, through the operating system and Firebase.
- `ITSAppUsesNonExemptEncryption` is set to `false` in `app.json`, so Apple will not ask on every upload.
- [ ] **Cameron**: If App Store Connect still asks, answer that the app uses only exempt encryption. If you later add your own encryption, this answer changes.

### Other Play Console declarations

- [ ] **Cameron**: Ads: No.
- [ ] **Cameron**: App access: say that some features need sign in, and give the demo account.
- [ ] **Cameron**: Advertising ID: No. The permission is blocked in `app.json`.
- [ ] **Cameron**: Government, financial, health, and news declarations: answer as they apply. None should.

## Phase 6: build and submit with EAS

`apps/community/eas.json` is ready with three build profiles and a submit section with placeholders.

| Profile | For | Output |
| --- | --- | --- |
| `development` | Day to day work with a development build. Needs the `expo-dev-client` package, which is not installed yet. | iOS simulator build, Android APK |
| `preview` | Sharing a test build with a few people. | Internal distribution. On iOS this needs registered test devices. |
| `production` | The stores. | iOS store build, Android app bundle. Build numbers go up by themselves. |

Build numbers are kept by EAS (`"appVersionSource": "remote"`). The version people see, `1.0.0`, is `expo.version` in `app.json`. Change it by hand for each release.

### One-time setup

Run these yourself. None have been run.

```bash
npm install -g eas-cli
eas login
cd "apps/community"
eas init
```

`eas init` links the folder to an Expo project and writes a project ID into `app.json`. Commit that change.

- [ ] **Cameron**: Run the setup commands.
- [ ] **In the repo**: Add the bundle identifier and package name before the first build.
- [ ] **Cameron**: Add the Firebase settings to EAS. The `.env` file is not in git, so EAS builds will not see it. Without these the app cannot reach Firebase. Add each `EXPO_PUBLIC_FIREBASE_*` name from `apps/community/.env.example` for the `production` and `preview` environments:

```bash
eas env:create --environment production --name EXPO_PUBLIC_FIREBASE_API_KEY --value "[value]" --visibility plaintext
```

Repeat for each name, and for `preview`. You can also add them on the project page at expo.dev. These values ship inside the app, so they are not secrets. Protect them with API key restrictions and App Check (phase 8).

- [ ] **In the repo**: This is a pnpm monorepo. If the first build fails at install, check the Expo monorepo guide at https://docs.expo.dev/guides/monorepos/.
- [ ] **In the repo**: If you want development builds, install `expo-dev-client` first. It is not needed for store builds.

### Build

```bash
cd "apps/community"
eas build --platform ios --profile production
eas build --platform android --profile production
```

The first iOS build asks to sign in to your Apple account and offers to create the signing certificate and profile. Let EAS manage them. The first Android build offers to create the upload keystore. Let EAS manage it. Keep Play App Signing turned on in Play Console.

### Submit

Fill the placeholders in the `submit` section of `eas.json` first:

| Placeholder | Where to find it |
| --- | --- |
| `[APPLE_ID_EMAIL]` | The email of your Apple account |
| `[APP_STORE_CONNECT_APP_ID]` | App Store Connect, your app, App Information, Apple ID (a number) |
| `[APPLE_TEAM_ID]` | developer.apple.com, Membership details |
| `[PATH_TO_GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_JSON]` | A key file you create for a Google Cloud service account that has access to your Play Console. Guide: https://docs.expo.dev/submit/android/ |

Never commit the service account key file. The root `.gitignore` already ignores `serviceAccountKey.json` and `*-service-account*.json`. Name the file to match.

- [ ] **Cameron**: Create the app record in App Store Connect (My Apps, new app) with the chosen name and bundle identifier.
- [ ] **Cameron**: Create the app in Play Console.
- [ ] **Cameron**: Upload the first Android build by hand in Play Console. Google requires the first upload to be manual before the API can be used. Confirm in the Expo guide above.

```bash
cd "apps/community"
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

The Android submit goes to the internal track as a draft. You promote it in Play Console.

## Phase 7: testing tracks

### TestFlight (Apple)

- [ ] **Cameron**: After `eas submit`, wait for the build to finish processing in App Store Connect.
- [ ] **Cameron**: Add yourself and close helpers as internal testers. Internal testers need a role on your App Store Connect team.
- [ ] **Cameron**: For wider testing, make an external group. The first external build goes through a short beta review.

### Google Play

- [ ] **Cameron**: Start with internal testing to check that the build installs.
- [ ] **Cameron**: Then run the closed test that new personal accounts need before production. Recruit testers early. Friends, venue partners, and the @queerct network are a natural group. Testers must opt in and stay opted in for the full period. Confirm the numbers in Play Console.
- [ ] **Cameron**: When the period ends, apply for production access in Play Console. Google asks questions about your testing. Keep notes on feedback you received and what you changed.

## Phase 8: Firebase production readiness

Project: `community-86792`.

### Security rules, must fix before launch

- [x] **In the repo**: Remove the temporary venue bypass in `apps/community/firestore.rules`. The rule `allow create: if request.resource.data.submittedBy == 'system' || ...` lets anyone, signed in or not, create a venue by setting `submittedBy` to `system`. Seed with the Admin SDK, which skips rules. **Done in the repo on September 27, 2026. Cameron: deploy the rules.**
- [x] **In the repo**: Close the `users` read rule (done in the repo on September 27, 2026; Cameron: deploy the rules). Today `allow read` passes when `resource.data.moderationStatus == 'approved'`. Every account starts approved, so anyone, even without an account, can read any user's document, including the email. This breaks the "no public profile" promise shown in the app. Change it to owner or admin only.
- [x] **In the repo**: Remove partner access to user records. `isPartnerOrAdmin()` lets any partner read and update every user. Make it admin only. **Done in the repo on September 27, 2026: user records are readable by their owner and admins only, and the Users page is no longer linked in the partner dashboard. Cameron: deploy the rules.**
- [ ] **In the repo**: Move the moderation pages out of the partner dashboard. `apps/partner-dashboard/app/dashboard/users/page.tsx` shows user emails to any partner. The same area has `venues` and `reviews` moderation pages. Move them to `apps/admin-dashboard` and delete them from the partner dashboard.
- [ ] **In the repo**: Tighten `allow list: if true` on venues if unapproved venues must stay private.
- [ ] **In the repo**: Close the `reviews` rules if reviews are gone.
- [ ] **In the repo**: Review `apps/community/storage.rules`. If nothing uploads, deny all writes.
- [ ] **In the repo**: The arrival check runs only on the phone. Someone could skip it with a modified app. This is a fair trade for not sending location to the server. Accept it, and watch `eventStats` for odd totals.

### Project settings

- [ ] **Cameron**: Turn on App Check for Firestore and Cloud Functions, with App Attest on iOS and Play Integrity on Android. Start in monitoring mode, then enforce once real builds pass. The app uses the Firebase web SDK, so check the current Firebase docs for what that SDK supports in React Native before you plan this: https://firebase.google.com/docs/app-check
- [ ] **Cameron**: Restrict the API key in Google Cloud Console, under APIs and Services, Credentials. Limit it to the APIs the app uses. App restrictions by bundle identifier or package name may not work with the web SDK inside a phone app, because the requests do not carry the native app identity. Test before you enforce.
- [ ] **Cameron**: In Firebase Auth settings, turn on email enumeration protection and set a password policy.
- [ ] **Cameron**: Customize the confirmation and password reset emails with the final app name and your domain.
- [ ] **Cameron**: If Google sign in is hidden, consider turning off the Google provider in Firebase Auth.
- [ ] **Cameron**: Set a budget alert in Google Cloud billing. Cloud Functions need the pay as you go plan. Check current pricing on https://firebase.google.com/pricing.
- [ ] **Cameron**: Turn on scheduled Firestore backups or point in time recovery. Check the Firebase docs for current options.
- [ ] **Cameron**: Consider a separate Firebase project for development, so test data never mixes with real accounts.
- [ ] **In the repo**: Deploy rules, indexes, and functions to production, and confirm `deleteMyAccount` and `onPerkRedemptionWrite` are live.

### Crash reporting

There is none today. Without it you will not know when the app crashes for real users.

- [ ] **Cameron**: Pick a tool. Sentry and Firebase Crashlytics are the common choices with Expo. Both need a new package and a new build.
- [ ] **In the repo**: Install it, and turn off any feature that collects more than crash data.
- [ ] **Cameron**: Update the privacy policy, the Apple privacy label (Diagnostics: crash data), and the Google Data safety form before the build with crash reporting goes out.

The stores also show basic crash counts in App Store Connect and Play Console with no SDK. That is enough for a first release if you want to keep data collection at zero.

## Phase 9: test script on real devices

Run on at least one iPhone and one Android phone, using the production build from TestFlight and the internal track. Simulators do not count for location and notifications.

**First open, no account**

- [ ] App opens to the activity picker with no sign in wall.
- [ ] Pick an activity. Events load from the production project. No sample data.
- [ ] Location prompt appears with the right wording. Tap "Allow while using".
- [ ] Events sort by distance.
- [ ] Delete the app, install again, and deny location. Browsing still works. No crash, no dead end.
- [ ] Map tab works with and without location.
- [ ] Open an event. Tap directions. The maps app opens at the venue.

**Account**

- [ ] The age statement is shown.
- [ ] Create an account with email and password. The confirmation email arrives and the link works.
- [ ] Close the app fully and open it again. Still signed in.
- [ ] Sign out, then sign in.
- [ ] Password reset email arrives and works.
- [ ] Wrong password shows a clear message.
- [ ] Privacy policy and terms links open.
- [ ] No button on the sign in screens is broken.

**Perks**

- [ ] Away from the venue, the perk does not unlock and the message says why.
- [ ] At a venue, within 150 m, the perk unlocks and the countdown starts.
- [ ] Redeem it. It shows as redeemed.
- [ ] Try the same perk again. It cannot be used twice.
- [ ] Let one run out. It shows as out of time.
- [ ] The perk appears in the list on the Account screen.
- [ ] The review-only sample event unlocks for the demo account from anywhere.

**Notifications**

- [ ] Turn on nudges. The system prompt appears.
- [ ] Follow an activity with an event starting soon. The reminder arrives with the app closed.
- [ ] Tap the reminder. The event opens.
- [ ] Turn nudges off. No more reminders arrive.
- [ ] Restart the Android phone. A scheduled reminder still arrives.

**Deletion**

- [ ] Delete the account from the Account screen.
- [ ] In the Firebase console, the Auth user, the `users` document, and the perk records are gone.
- [ ] Signing in with the old details fails.
- [ ] Browsing still works afterwards.

**Rough conditions**

- [ ] Airplane mode: a clear message, no crash.
- [ ] Largest system text size: nothing is cut off.
- [ ] VoiceOver and TalkBack: main buttons are read aloud with sensible labels.
- [ ] Small phone and large phone.
- [ ] iPad, if iPad support stays on.
- [ ] Dark mode on the phone: the app stays light and readable.

## Phase 10: submit for review

### Demo account and review notes

Reviewers are not in Connecticut and cannot stand at a venue. If they cannot test the perk, expect a rejection for features that could not be checked.

- [ ] **Cameron**: Create a demo account in production with a confirmed email. Enter its details in App Store Connect under App Review Information, and in Play Console under App access. Do not put the password in this repo.
- [ ] **In the repo**: Build a way for reviewers to unlock a perk. Options:
  - **Review-only sample event** (suggested): an event named something like "App Review sample event" that is visible only to the demo account and skips the distance check for that account. No real venue is involved, and no real perk is given out.
  - A sample event placed at the reviewer's likely location. Less reliable, since you do not know where they are.
- [ ] **Cameron**: Make sure there are live events in the app on the days the app is in review.
- [ ] **Cameron**: Keep the demo account and sample event working after launch. Every update is reviewed again.

Suggested review notes. Edit before use:

```text
[App name] helps LGBTQ+ adults in Connecticut find events by activity, such as
dancing, drag shows, trivia, and book clubs.

No account is needed to browse. An account is only needed to unlock a perk.

Demo account
Email: [demo email]
Password: [demo password]

How to test perks
Perks unlock when the person is within 150 metres of the venue. Since you are
not at a venue, the demo account can see an event called "[sample event name]".
For this account, that event unlocks without the distance check.
1. Sign in with the demo account.
2. Open "[sample event name]".
3. Tap "I'm here".
4. The perk unlocks and a countdown starts. Tap to redeem.

Location
Used only while the app is open, to sort events by distance and to confirm
arrival. It is checked on the device and is not sent to our servers or saved.
The app works with location turned off.

Notifications
Reminders are scheduled on the device. We do not send push notifications from
a server.

Account deletion
Account screen, "Delete my account".

Alcohol
Some events are at bars and some perks are drinks. The app is for adults aged
18 and over. Perks are given by the venue, which checks ID under local law.
The app does not sell or deliver alcohol.

Payments
The app is free. There are no purchases. Perks are free offers from venues.

Contact
[name], [phone], [email]
```

### Final checks before you press submit

- [ ] **Cameron**: Listing text, screenshots, and icon uploaded on both stores.
- [ ] **Cameron**: Privacy policy URL and support URL load on a phone.
- [ ] **Cameron**: Privacy forms, age rating, and country list are done.
- [ ] **Cameron**: Apple: choose manual release, so the app goes live when you say so.
- [ ] **Cameron**: Google: use a staged rollout if offered.

## Phase 11: after you submit

Review times vary. They can be a day or much longer, and first submissions and new accounts often take longer. Do not promise venues a launch date until both apps are approved.

If rejected, read the message, fix the issue, and reply in the resolution centre. It is normal for a first submission. You can ask questions and you can appeal.

Rejection reasons most likely for this app:

| Risk | Why it applies here | How to avoid it |
| --- | --- | --- |
| Reviewer could not test a feature | Perks need you to be at a venue | Demo account, sample event, clear notes |
| Broken button or crash | Google sign in fails on phones | Hide it or fix it |
| Sign in rule (Apple 4.8) | Google sign in with no Apple option | Hide Google, or add Sign in with Apple |
| Privacy policy missing or does not match | No policy exists yet | Publish it, link it in the app and the listing |
| Privacy label does not match the app | Data collected but not declared, or a permission with no use | Use the table in phase 5. Check the final permission list. |
| Location purpose unclear | Vague wording | Already specific in `app.json` |
| App needs location to work | Reviewer denies location | Test the denied path |
| Placeholder content | Sample events, starter icon, empty lists | Real events, final art |
| Generic or misleading name | "Community" | Choose a distinct name |
| Too little content | Few events outside Connecticut | Explain the Connecticut launch in the notes. Limit to the United States. |
| Age rating too low | Alcohol references | Answer the questionnaire honestly |
| Alcohol promotion | Drink perks | Adults only, neutral wording |
| Account deletion not found | Reviewer did not see it | Say where it is in the notes |
| Google: not enough testing | New personal account rule | Run the closed test fully |
| Google: Data safety mismatch | Form does not match the build's permissions | Check the final permission list |

After launch:

- [ ] **Cameron**: Reply to store reviews and support email.
- [ ] **Cameron**: Watch crash counts in both consoles.
- [ ] **Cameron**: Renew the Apple membership each year, or the app is removed from sale.
- [ ] **Cameron**: Update the privacy forms whenever data handling changes.
- [ ] **In the repo**: Keep up with each store's yearly minimum SDK requirements by updating Expo.

## What is already done in this repo

- In-app account deletion, with a Cloud Function that removes the person's records.
- Browsing without an account.
- Location while in use only. No background location.
- Reminders scheduled on the phone, with no server involved.
- No ad, analytics, or tracking SDKs. No purchases.
- No camera, photo, or microphone permissions or plugins.
- `apps/community/app.json`: location purpose string, export compliance flag, Android permission list, blocked permissions.
- `apps/community/eas.json`: development, preview, and production profiles, and a submit section with placeholders.
- Icon, adaptive icon, and splash files at 1024 x 1024. Confirm they are final art.
- Draft privacy policy and terms: `docs/legal/`.
- Draft listing copy: `docs/store-listing/`.
- Connecticut seed lists: `docs/launch-connecticut/`.
- A checks workflow for pull requests.

## What Cameron needs to decide this week

1. **Store name.** Pick from the options in `docs/store-listing/app-store.md` or your own, and check it is free on both stores.
2. **Domain.** Buy it. It unlocks the website, the emails, and the bundle identifier.
3. **Bundle identifier and package name.** Format `com.<yourdomain>.community`. Permanent.
4. **Individual or organization** for the developer accounts. Start enrollment and, if needed, the D-U-N-S request now.
5. **Google Play account and closed test.** Open the account now and line up testers, since the waiting period sets your earliest Android launch date.
6. **Google sign in.** Hide it for version 1, or add native Google and Apple sign in.
7. **iPad support.** Keep it and make iPad screenshots, or turn it off.
8. **A lawyer** to review the privacy policy, the terms, the age statement, and drink perks under Connecticut law.
9. **Crash reporting.** Add a tool now, or launch with the store consoles only.
