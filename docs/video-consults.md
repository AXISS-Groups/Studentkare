# Video consults (LiveKit)

Live audio/video between a student and their doctor runs on a
[LiveKit](https://livekit.io) server. Studentkare never relays media: the backend
only decides who may join which room, by signing a short-lived LiveKit token.

## Configuration

| Variable | Where | Notes |
|---|---|---|
| `LIVEKIT_URL` | config map / env | `wss://` address browsers connect to. `ws://` is accepted only when `APP_ENV` is development or testing. |
| `LIVEKIT_API_KEY` | secret | API key id; the token issuer (`iss`). |
| `LIVEKIT_API_SECRET` | secret | Signs tokens (HS256). Never sent to the browser. |

All three, or the feature is off. When off (or misconfigured):

- `GET /api/consultation/{id}/state` reports `liveMedia: false`;
- `POST /api/consultation/{id}/media-token` answers `503` with
  `{"code": "MEDIA_UNAVAILABLE"}`;
- both consult dialogs say "No call can be started from the app" and never ask
  for the camera or microphone. Student check-in still works.

Wired in `docker-compose*.yml`, the Helm chart (`LIVEKIT_URL` in the backend
config map, key and secret in `studentkare-secrets`) and the env examples, all
empty by default.

## Who gets a token, and when

`POST /api/consultation/{appointmentId}/media-token` issues a token only when
**all** of these hold (otherwise nothing is signed):

1. The caller is the student who booked the appointment, **or** the NMC doctor
   (`role = NMC_DOCTOR`) it is booked with. Anyone else gets `404`.
2. The appointment's catalog item is a `consultation` (not a lab visit).
3. The appointment is `CONFIRMED` (`409 NOT_CONFIRMED` otherwise).
4. Now is inside the **join window**: from **15 minutes before** the slot starts
   until **30 minutes after** it ends (`409 OUTSIDE_WINDOW` otherwise). Slot
   times without a UTC offset are read in `Asia/Kolkata`; a slot time that
   cannot be parsed has no window, so no token.

Constants live in `backend/services/livekit_media.py` (`JOIN_OPENS_BEFORE`,
`JOIN_CLOSES_AFTER`, `TOKEN_TTL`, `SLOT_TIMEZONE`). Every issued token is
written to the workflow audit log as `CONSULT_MEDIA_TOKEN_ISSUED` against the
appointment id.

## What the token grants

Signed with the official `livekit-api` Python package (`AccessToken`):

- `sub` (identity) = the opaque account id. No name, metadata or attributes.
- room `sk-consult-{appointmentId}` (the appointment id is an opaque key).
- `roomJoin`, `canPublish` and `canSubscribe`, with `canPublishSources` limited
  to `camera` and `microphone`. `canPublishData` and `canUpdateOwnMetadata`
  are false. No `roomAdmin`, `roomCreate`, `roomList`, `roomRecord`, SIP,
  agent or ingress grants.
- lifetime: 10 minutes, and never past the end of the join window. LiveKit
  checks the token when a participant connects; an ongoing call is not cut off
  when the token expires.

## In the app

`VideoConsultationDialog` (student) and `ProviderConsultationDialog` (doctor)
show a call panel (`src/components/health/consult/`) when `liveMedia` is true.
The browser asks for the camera and microphone **only after** the user presses
"Join video call" or "Join by voice only" **and** the backend has issued a
token. States: unavailable, refused (with the server's reason), permission
denied, no device, connecting, waiting for the other party, connected,
reconnecting, ended, error. Controls (44 px, labelled): mute/unmute, camera
off/on, leave. Joining as the student also checks them in (once).

These dialogs are not the canvas `Teleconsult` / `ClinicianConsultRoom`
screens. Both of those are Tier 1 and still need a named design review before
they are built; `ConsultRoomScreen` stays demo-only.

## Running a LiveKit server

**Local development.** Install `livekit-server` and run `livekit-server --dev`
(key `devkey`, secret `secret`, `ws://localhost:7880`). Set those three values
and `APP_ENV=development`.

**LiveKit Cloud.** Create a project, copy its `wss://…livekit.cloud` URL, API key
and secret into the secrets above. Choose the project's region to keep media
close to users; check LiveKit's current region list for India (Mumbai) or the
nearest region, and confirm data-residency terms with legal before go-live.

**Self-hosted.** Run `livekit-server` (Docker or Helm) on a host in an Indian
region with a public IP and TLS (`wss://`). Open the RTC ports
(UDP 50000–60000 or your configured range, TCP 7881) and enable the built-in
TURN server (`turn.enabled`, TURN/TLS on 443 or 5349). Campus Wi‑Fi and mobile
networks often block UDP, so TURN over TLS is what makes calls connect there.
Redis is needed only when running more than one node.

## Residual risks

- **TURN.** Without a reachable TURN/TLS relay many campus networks will fail to
  connect. LiveKit Cloud includes TURN; a self-hosted server must enable it.
- **Recording and consent.** Nothing in Studentkare records calls and tokens carry
  no recording grant, but whoever holds the LiveKit API key can start egress
  from outside the app. Any future recording needs explicit consent (Tier 1
  design + legal) first.
- **Call length.** The window gates joining, not staying: a connected call is not
  ended at the window's close. Ending rooms server-side (LiveKit room service
  `DeleteRoom`) would need a scheduler job.
- **Room size.** Only the two parties can get tokens, but the room is not
  capped at two participants in LiveKit itself.
- **Slot time zone.** Slot times are free text; naive ones are read as
  Asia/Kolkata. Slots stored with an explicit offset are unaffected.
- **CSP.** No Content-Security-Policy is served today. If one is added,
  `connect-src` must allow the LiveKit `wss://` host.
- **Native app.** The React Native app has no call UI; `livekit-client` is web
  only.
