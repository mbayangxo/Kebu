# KEBU Rooms: live project meetings

Captured November 6, 2026. Extends completion requirements K063–K065 and connects to K078 (team invitations). **Open: requirements captured; live meetings not verified or built by this change.**

## User journey

1. An authorized host opens a KEBU project, starts a private meeting, and invites selected teammates with a join link. A meeting invitation is distinct from permanent team membership or permission to edit a project.
2. Teammates join with camera and microphone controls. For two participants, offer an equal split. For larger calls, use participant tiles and a focus view.
3. Anyone allowed to present can explicitly choose a screen/window/tab to share, or present an authorized KEBU project directly. Everyone sees the presentation appear in the call. The project occupies the main panel while people remain visible beside it; on small screens use a stacked layout. Participants can switch who presents without leaving.
4. Project presentation follows the presenter’s view; viewers don’t gain edit access. Distinguish shared screen pixels from opening the underlying project. A meeting link alone does not grant file or project access.

## First build slice and acceptance

- Wire a private Rooms meeting to authenticated join, host controls, microphone/camera and two-person video. Prove invited join and unauthorized denial with separate accounts.
- Add explicit screen sharing, handoff, and split view. Verify share start/stop and that ending the meeting removes live access.
- Add native project presentation with an authorized project, and test that everyone sees the current project without bypassing its permissions. Verify group layout, mobile fallback, and reconnect.
- Select media transport and confirm cost and browser/device coverage before external service activation. No recording by default in this slice.

Existing code includes team invite links/email and Rooms workspace surfaces. This specification does not certify hosted email delivery, real-time calling, screen sharing, or native project presentation.

## November 6 implementation candidate

A review branch adds the first two-person browser call flow. A host selects an existing room teammate and shares a link bound to those two accounts. Browser-to-browser media provides video, microphone controls and desktop screen sharing. To show a project today in this slice, share its browser tab; native project presentation is still open. Guest creation does not change team or project permissions. Calls expire after 30 minutes. This slice does not include rejoining a previously negotiated seat, email notifications, group calls, public Live Rooms or JOKKO gifts.

Disabled by default. For isolated QA, the call migration and `NEXT_PUBLIC_KEBU_PRIVATE_CALLS=true` are required. `KEBU_ROOM_STUN_URL` is optional; direct media is not expected to work on every network. Production readiness requires managed relay credentials, expired-call cleanup, and browser verification with two real accounts across separate networks. No hosted schema or deployment was changed.

The focused PostgreSQL test executes the migration against synthetic identities and verifies participant-only access, a third member denied even with the link, offer/answer roles, SDP cleared on ending, and access revoked after membership removal.

Verification: TypeScript passed, Rooms suite 29/29 with PGlite enabled, changed-file lint had zero errors (two pre-existing Room-page warnings), and migration hygiene passed. Chromium with fixture signaling reached the join flow but gathered no media candidates in the local sandbox; real media and screen sharing are not certified.
