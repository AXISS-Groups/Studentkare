# Native public preventive care

From the repository root, install the locked dependencies with `npm ci`, then:

```sh
EXPO_PUBLIC_API_BASE_URL=https://your-api-host.example/api npm run start:native
```

Replace the example with your reachable backend API base, including `/api` for
this backend. Expo inlines this public value; restart Expo/re-export after changing
it. No secrets belong in `EXPO_PUBLIC_*`. Missing/relative URLs show a configuration
error, with no `/api` fallback. HTTPS is required; development alone allows HTTP
loopback (`localhost`, `127.0.0.1`, `::1`). A physical device needs a reachable HTTPS
host; its localhost is not your computer. Apply the preventive-care backend
migration as described in `docs/preventive-care-api.md`.

The mounted native stack opens the existing **camp proof of concept**. Tap
**Browse public vaccine directory** to search and paginate real public listings;
use the header back button or **Open camp proof of concept** to return.
The directory uses the shared `VaccineDirectoryViewModel` with a native public GET
adapter for `/preventive/vaccines`. It sends no authentication/session headers and
omits cookies. No providers or offerings are seeded or fabricated by the client.
Missing prices/availability remain unknown; timestamps are Unix seconds.

Source, booking, WHO and provider-resource links open external HTTPS websites.
Provider resources are general outbound links, not an integrated catalog feed or
partnership. Native authentication, private patient/report review and personal
preventive preferences are not implemented. Camp demonstration data is still a
PoC, not patient-data parity. Text scales with device settings; the brief native
fade respects Reduce Motion and cleans up its listener/animation.

Bundle check (use a fresh output directory outside the repository):

```sh
npx expo export --platform ios --output-dir /absolute/temporary/path/native-ios-unique
```

Export verifies bundling, not simulator/device rendering or live backend reachability.
