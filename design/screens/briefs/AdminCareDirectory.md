# AdminCareDirectory — Super admin and campus console — Care directory listings

| | |
|---|---|
| Canvas page | New · Find care near you (2026-10-21, no canvas board). Console pages 4 and 7 layout |
| Platform / frame | Web 1440 (super admin console `admin/care-directory`; campus console `campus/care-directory`) |
| Tier | 3 (admin table) |
| Ticket(s) | Find care near you (founder ticket, 2026-10-21) |
| Picture | none yet: screenshots of the build at `/home/claude/navy-shots/care-directory/` |
| Design source | none |

## Icons this screen must show (all of them)

- **Line / solid icons (7):** `alert-triangle`, `hospital`, `pencil`, `plug`, `plus`, `shield-check`, `trash`
- **3D icon tiles (0):** —
- **Small glyphs (0):** —
- **Brand mark:** —
- **Text symbols to replace with icons:** —

## Pictures and media

- **Illustrations (0):** —
- **Images / videos (0):** —
- **Data-driven graphics (build as components):** —

## Layout

- Page header: "Care directory", what is listed, and **Add a place** (`plus`).
- **Places** table: name and type (`hospital` tile for the empty state), campus ("Every campus" or the campus), phone, 24×7, verified on, status pill (Shown · Not verified · Check is old, amber · Off), row actions **Edit** (`pencil`) and **Remove** (`trash`, confirm dialog).
- Add / edit dialog: type, name, departments (comma separated), address, area, pincode, latitude and longitude (both or neither), phone, open 24×7, hours text, how it was checked (required), source link (https), verified on (date, not in the future), campus (super admin only; a campus administrator's rows are always their campus), shown to students (active). Validation errors from the server are shown as given.
- **Partners** card (super admin): partner pharmacies and clinics with why each is or isn't shown (not verified, check is old, licence, off) and **Mark verified today** (`shield-check`).
- **Health Facility Registry** card (super admin, `plug`): the connector's honest state ("not configured" → set it up in Integrations; "credentials set, live search not built"). `alert-triangle` on a failed load.

## States

Loading · empty ("No places yet") · error with retry · saving · validation error · removed (toast). Campus administrator: only their campus's rows, no campus field, no Partners or Registry card.

## Rules

Every create, edit and removal is audited (`CARE_FACILITY_CREATED/UPDATED/REMOVED`). Nothing is shown to students until it has a verified-on date within `care_directory.verification_max_age_days`.

> Verify with `node scripts/icons/check-icons.mjs --screen AdminCareDirectory`.
