# Staging test data

`python -m scripts.seed_scenarios` fills a **staging** database with about 2 lakh rows covering every main
scenario, and removes them again. It is for a separate staging server with its own database, never the
live site.

## What it makes (at `--scale 1`, about 2.2 lakh rows, a few seconds)

| Area | Rows | Scenarios |
|---|---|---|
| Accounts | ~20,400 | Students on ~20 test campuses; campus admins, counsellors, doctors; pharmacy, lab, clinic and wellness partners |
| Students | ~20,000 | B2C (62%), B2C without WhatsApp (8%), B2C with an unverified WhatsApp (5%), B2B claimed (15%), B2B pending (6%), B2B expired (2%), B2B locked after wrong passwords (1%), disabled (1%) |
| Sign-in | ~70,000 | Verified and unverified contacts, passwords, PINs (35% of students), invites, consent records, campus verification (verified, pending, rejected) |
| Health | ~55,000 | Readings (heart, oxygen, sleep, steps, temperature, weight, blood pressure, glucose, water), some out of range; medication plans and taken or skipped doses |
| Shop | ~22,000 | Orders paid, unpaid, expired, cancelled, refunded and partly refunded; lines requested to completed or declined; captured and failed payments |
| Labs | ~7,400 | Lab orders at every stage (booked to released, rejected, recollection, cancelled), results for released reports, some critical |
| Consults | ~6,200 | Slots, appointments (requested, confirmed, completed, cancelled, no-show), live sessions |
| Safety | ~600 | Crisis events in the counsellor queue (pending to closed) and SOS alerts in every state |

Every seeded row is marked: ids start `seed-`, emails end `@seed.studentkare.test` (a domain that can't
receive mail), names say "Test", and profiles carry `"seed"`. Every seeded account's password is
**`Staging-river 2026`** and every seeded PIN is **`482915`**, so testers can sign in as any scenario.

## Named test accounts (10 per role)

| Role | Sign-in IDs | How they sign in |
|---|---|---|
| Student | `student01@studentkare.test` … `student10@studentkare.test` | Password `Staging-river 2026`, PIN `482915` (on a device that has signed in once), or code `123456` |
| Lab | `lab01@studentkare.test` … `lab10@studentkare.test` | `/staff-sign-in`, emailed code `123456` |
| Clinic | `clinic01@studentkare.test` … `clinic10@studentkare.test` | `/staff-sign-in`, code `123456` |
| Doctor | `doctor01@studentkare.test` … `doctor10@studentkare.test` | `/staff-sign-in`, code `123456` |
| Pharmacy | `pharmacy01@studentkare.test` … `pharmacy10@studentkare.test` | `/staff-sign-in`, code `123456` |
| Campus admin | `campus01@studentkare.test` … `campus10@studentkare.test` | `/staff-sign-in`, code `123456` |

`studentNN` and `campusNN` share Test Campus NN, so a campus admin sees those students. The fixed code
`123456` works only on staging with **all three** set: `APP_ENV=testing`, `SEED_DEMO_DATA=true` and
`DEV_OTP_CONSOLE=true` (`services/demo_seed.is_demo_identifier`); production never accepts it. Staff
accounts other than the team accounts sign in with a code, not a password, so the code is how testers get in.

## Running it

On the staging server, from `backend/`, with the staging database's `DATABASE_URL`:

```bash
alembic -c config/alembic.ini upgrade head
APP_ENV=testing SEED_SCENARIOS=true python -m scripts.seed_scenarios seed --yes              # ~2.2 lakh rows
APP_ENV=testing SEED_SCENARIOS=true python -m scripts.seed_scenarios seed --yes --scale 0.1  # ~22 thousand
python -m scripts.seed_scenarios count                                                       # what's there
APP_ENV=testing SEED_SCENARIOS=true python -m scripts.seed_scenarios purge --yes             # remove it all
```

## Why it refuses

- `APP_ENV` isn't `development` or `testing`. The app reads `staging` as production (`core/app_env.py`), so
  this is deliberate.
- `SEED_SCENARIOS=true` isn't set, or `--yes` is missing.
- WhatsApp (OpenWA) is configured: the seeded numbers look real, and reminders must never reach a stranger.
  Turn it off on staging.
- The database already has more than 50 students the seed didn't make, so it looks like real data.
  `--allow-existing` overrides this, deliberately.

- It is already seeded. Run `purge` first, then seed again.
