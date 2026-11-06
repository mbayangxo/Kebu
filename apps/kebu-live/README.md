# KEBU Live

Standalone React Native app for public, one-host broadcasts. Uses the same KEBU account as the web product, but never reads private project Rooms, team membership or files.

## Internal device build

1. Deploy the branch only to an approved QA preview after applying the public broadcast migration to the designated QA database. Production is blocked in the API. Set `KEBU_PUBLIC_LIVE_QA=true` and the server-only `KEBU_LIVE_MEDIA_URL`, `KEBU_LIVE_MEDIA_KEY` and `KEBU_LIVE_MEDIA_SECRET` for a dedicated LiveKit test project. A WSS endpoint is required. Keep provider credentials out of the app.
2. In this directory, copy `.env.example` to `.env.local` and fill in the preview origin and QA Supabase publishable key. Run `npm ci`. Use an Expo development build (not Expo Go) or the internal EAS preview profile. `npm run bundle` compiles the iOS and Android JS bundles but does not sign an installer.
3. On two devices, sign in with separate KEBU QA accounts. Start a public broadcast on one, discover and enter it on the other. Verify that only the host can publish camera and microphone; check audio-only playback, report submission, host end and removal from discovery. Verify already issued tokens can't reopen an ended broadcast and that server-enforced expiry disconnects active media before production is considered.

The optional JOKKO gift UI only appears in development mode with `EXPO_PUBLIC_KEBU_GIFT_SANDBOX=true`. Run the JOKKO sandbox service from [its review branch](https://github.com/mbayangxo/JOKO/tree/work/kebu-live-gifts-sandbox-nov06) on the same machine as the local KEBU API. Set `JOKKO_GIFT_SANDBOX_URL=http://127.0.0.1:4783` and `JOKKO_GIFT_SANDBOX_KEY` on the KEBU server. Use test CAURIS fixtures for the viewer and host. The endpoint is disabled on all Vercel environments and cannot touch a real JOKKO wallet.

## Publication

This is an internal source candidate. Apple App Store and Google Play distribution require signed native builds, approved publisher accounts, store assets and privacy disclosures, and device acceptance. Public rollout also needs effective abuse handling: user blocking, reporting and review, staff response and enforcement, age/safety controls, and account flows suitable for new users. The current report screen writes a record; no staff queue or on-call process is included. Private broadcasts, invited speakers, and chat are follow-up slices.

Review the intended regions against [Apple's review guidelines](https://developer.apple.com/app-store/review/guidelines/) and [Google Play's payments policy](https://support.google.com/googleplay/android-developer/answer/10281818) before enabling purchased digital gifts. Real JOKKO account linking, wallet authorization and creator settlement are separate from the sandbox and still open. Native store builds have no external purchase flow. A Kebu Exchange listing, if desired, should point to approved store pages once those URLs exist.
