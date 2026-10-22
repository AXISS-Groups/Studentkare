# App link files for studentkare.co

The phone app opens some `https://studentkare.co/...` links directly (iOS universal
links, Android App Links). Each OS checks a file on the web domain before it hands a
link to the app. These are templates: fill the placeholders, then serve them.

| Served at | Template | Placeholder | Where to find the value |
|---|---|---|---|
| `/.well-known/apple-app-site-association` (no extension, `application/json`) | `apple-app-site-association.template` | `APPLE_TEAM_ID` | Apple Developer → Membership → Team ID |
| `/.well-known/assetlinks.json` | `assetlinks.json.template` | `PLAY_APP_SIGNING_SHA256_FINGERPRINT`, `UPLOAD_KEY_SHA256_FINGERPRINT` | Play Console → Setup → App integrity; `eas credentials -p android` for the upload key |

To publish: copy each filled file to `public/.well-known/` (drop `.template`), so the
web build ships it. `deploy/nginx.conf` serves `/.well-known/` as files only (a missing
file is a 404, never the SPA's `index.html`) and the Apple file as JSON. Both hosts
(`studentkare.co`, `www.studentkare.co`) must serve them over HTTPS with no redirect.

The paths must match `LINK_PATH_PREFIXES` in `app.config.ts` and `resolveDeepLink` in
`src/native/linking.ts`. `/claim` is excluded on purpose: the phone cannot redeem an
invite yet, so the invite keeps working in the browser.
