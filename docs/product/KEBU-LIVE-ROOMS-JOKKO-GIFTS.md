# KEBU Live Rooms and JOKKO gifts

Captured November 6, 2026. Status: requirement captured, implementation open.

KEBU Live Rooms are separate from [private project meetings](KEBU-ROOMS-LIVE-PROJECT-MEETINGS.md). People can browse and enter public rooms without joining a work team. Hosts can also choose private access; private rooms are not listed publicly. Live hosts can stream, invite speakers, and manage chat, mute, removal and reporting. Joining never grants project, file, or team access.

## Gift flow

- During a live room, a signed-in viewer chooses a virtual gift, sees its CAURIS amount and recipient, and explicitly confirms purchase and sending from their linked JOKKO wallet.
- KEBU owns the room, gift catalog and on-screen presentation. JOKKO owns wallet authorization, balance, payment status and settlement. KEBU does not maintain a second wallet or create value from a gift animation.
- Display a paid gift only after verified confirmation, and deduplicate retries and events so one successful purchase results in one charge and one gift. Pending, rejected, and insufficient-funds states are clear.
- First release recommendation: gifts go to the verified room host. Co-host splits, creator cash-out terms, fees, refunds and eligibility need separate product decisions. Do not activate money movement until these decisions and sandbox checks are complete.

## Build and acceptance

1. Host starts a live room, audience discovers/joins, and host can moderate and end it. Verify public and private access using separate accounts.
2. Add JOKKO sandbox gifting and verify successful purchase, insufficient funds, pending confirmation, and replay without duplicate charges.
3. Verify recipient accounting and approved payout rules before enabling real gifting.

Prior conversations established optional public discovery and private livestreams in KEBU. Separate JOKKO and RECT live-room discussions do not establish that this KEBU gifting integration already exists.
