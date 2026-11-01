# Push Notification Device Matrix

Browser push is optional. The in-app notification list always works; device
notifications require HTTPS (or `localhost`), a VAPID key pair on the API, and
permission granted on the device.

## What is automated

`npm run test:push-matrix` drives Chromium through a signed-in student account
and checks, for four viewport sizes (360, 412, 820, 1440 px):

| Check | Detail |
| --- | --- |
| Secure context + API surface | `isSecureContext`, `serviceWorker`, `PushManager`, `Notification` |
| Service worker | `/sw.js` registers and activates, scope covers the app, `push` and `notificationclick` handlers present |
| PWA installability inputs | manifest name, `display: standalone`, `start_url`, 192 and 512 icons |
| Server push status | `/api/notifications/push/status` shape, VAPID public key is a valid 65-byte P-256 point, `keyId` matches its SHA-256 prefix |
| Settings layout | device-notification card and toggle render without horizontal overflow, clipping, or off-screen buttons |
| Screenshots | saved to `%TEMP%\ac-push-matrix` with `push-matrix-report.json` |

It uses one login per run (the dev rate limit allows 10 logins per 10 minutes
per IP). Set `AUDIT_BASE`, `PUSH_MATRIX_EMAIL`, `PUSH_MATRIX_PASSWORD`, or
`CHROME_PATH` to override defaults.

## Browser engine matrix

Automation runs in Chromium only. The rows below distinguish what the tool
proves from what still needs a real device. Nothing in the "hardware" column
has been executed for this project yet.

| Browser | Engine behaviour | Automated proxy | Real hardware |
| --- | --- | --- | --- |
| Chrome / Edge (desktop, Windows/macOS/Linux) | Standards push via FCM/Mozilla autopush | Covered: capability, SW, layout, key coherence | Not yet verified on hardware |
| Chrome / Edge / Samsung Internet (Android) | Same Push API, notification permission prompt | Covered: mobile viewports | Not yet verified on hardware |
| Firefox (desktop/Android) | Same Push API, different push service | Capability logic covered; engine not executed | Not yet verified on hardware |
| Safari 16.4+ (macOS) | Web Push requires the site to be added to the Dock/menu bar app | Not covered by Chromium | Not yet verified on hardware |
| Safari 16.4+ (iOS/iPadOS) | Web Push only inside a Home Screen web app; permission only after install | Manifest + `display: standalone` checked, behaviour not covered | Not yet verified on hardware |

## Physical-device checklist

Run once per row of the browser matrix, on a build served over HTTPS (staging
or a tunnel), signed in as a test account.

1. Open the app, go to **Dashboard → Notifications**, confirm the device
   notification status line renders and the toggle is reachable.
2. Tap **Enable on this device**, accept the permission prompt.
3. Confirm the row switches to "On for this browser" and the toggle offers
   "Turn off on this device".
4. Press **Send test notification** on another signed-in browser for the same
   account; confirm the notification arrives with the app icon and title.
5. With the app backgrounded (or closed on desktop), trigger a real in-app
   event (mentorship request or challenge update) and confirm delivery.
6. Tap the notification; confirm it opens the correct dashboard route.
7. Disable device notifications; confirm a subsequent test reports zero
   attempted deliveries for that endpoint.
8. Rotate `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` on staging, reload the app,
   and confirm the client re-subscribes automatically and still receives a test.
9. iOS/iPadOS only: add the app to the Home Screen first, then repeat steps
   1–7 from the installed icon.
10. Record device, OS version, browser version, and result in the table below.

## Results log

| Date | Device | OS | Browser | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | Not run | Awaiting physical devices |

## Known constraints

- Push delivery cannot be proven without a real subscription; the automated
  suite verifies configuration and UI readiness, not receipt.
- iOS requires the installed Home Screen web app; a Safari tab cannot receive
  push even when permission is granted.
- Localhost is treated as a secure context by browsers, so the matrix runs
  against the dev server without TLS.
