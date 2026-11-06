# The dev site (dev.studentkare.co)

One shared place to try everything: demo accounts, scenario data and open-licensed reference data. It is a
**separate server with its own database**, so it can never touch production or hold a real student's record.

## Why this is safe

- Demo accounts and the fixed code `123456` work only when `APP_ENV` is `development` or `testing`
  (`core/app_env.py`; anything else, including `staging`, is production). Production keeps `APP_ENV=production`.
- Every loader here refuses outside those two values, needs its own opt-in (`SEED_SCENARIOS`, `SEED_OPEN_DATA`)
  and `--yes`, and removes only its own rows.
- Real people never sign up on dev: leave WhatsApp, email and push **unconfigured** so no message can leave.
  The scenario seed refuses to run if WhatsApp is configured.

## 1. Set it up (once)

1. DNS: point `dev.studentkare.co` at the dev server. Give it its own Postgres database (`studentkare_dev`).
2. Deploy the same images as production with the base `docker-compose.yml` (it reads `APP_ENV` from the
   environment). In Dokploy, paste `.env.dev-server.example` as the environment and replace every `CHANGE-ME`
   with a new value. Do not reuse production secrets.
3. The base compose publishes monitoring ports. Close them at the firewall, or put the site behind a login
   (Cloudflare Access, basic auth) so only your team can reach it: demo accounts are public knowledge.
4. Start it. The backend log says `[SEED] Created … demo accounts` on first start.

## 2. Seed the scenarios (about 2 lakh rows, a few seconds)

From `backend/` on the dev server, see `docs/guides/staging-seed.md` for what it makes:

```bash
alembic -c config/alembic.ini upgrade head
python -m scripts.seed_scenarios seed --yes
```

Sign in with `student01@studentkare.test` … `campus10@studentkare.test` and code `123456`
(password `Staging-river 2026` for students).

## 3. Load the open data

The dev server has internet; this workspace's sandbox did not, so the files are fetched on the server.
Downloads go to `data/open/`, which git ignores: **licences differ and nothing here is committed.**

| What | Where from | Licence to confirm before you use it |
|---|---|---|
| Medicines (brand, salts, strength, maker) | `junioralive/Indian-Medicine-Dataset`, file `DATA/indian_medicine_data.csv` (about 254,000 rows) | Repo says MIT, but it does not say where the data was collected. **Check with a lawyer before using it anywhere but dev.** For production use WHO or national lists and your own reviewed data. |
| Hospitals and clinics for Find care | Hospital directory on data.gov.in (National Health Portal) | Open Government Data, check the licence line on the dataset page. Download the CSV in a browser and copy it to the server. |

```bash
cd backend
# Medicines. Try 500 rows first, then all of them.
python -m scripts.open_data fetch --url <raw https link to the CSV> --out data/open/medicines.csv
python -m scripts.open_data medicines data/open/medicines.csv --dry-run --yes     # read and count only
python -m scripts.open_data medicines data/open/medicines.csv --limit 500 --yes
python -m scripts.open_data medicines data/open/medicines.csv --yes

# Hospitals (the column names are matched loosely; the command says which column it cannot find).
python -m scripts.open_data facilities data/open/hospitals.csv --state Telangana \
    --dataset "Hospital Directory, National Health Portal (data.gov.in)" \
    --source-url https://data.gov.in/catalog/hospital-directory-national-health-portal --yes

python -m scripts.open_data count
python -m scripts.open_data purge --yes     # removes only rows it made (ids start od-)
```

### What the loader does and does not do

- **Every medicine is loaded as schedule H (prescription needed).** Open lists carry no Indian drug schedule,
  so it never guesses a medicine into OTC. A pharmacist or super admin changes it in Admin.
- **It adds the medicine master only, not shop listings or prices.** Medicine info stays "unreviewed" until a
  pharmacist approves it, so students see no clinical facts from it.
- **Rows it cannot read exactly are skipped and counted** (unknown unit, no clear dosage form, repeated salt,
  discontinued). Nothing is repaired by guessing.
- **Facilities say what they are:** the source reads "Open government data, not field-checked (dev site)" and
  the dataset name. A real directory needs a person to check each listing (`services/care_directory.py`).

## Not loaded yet

- **Lab tests with reference ranges** and **the vaccine schedule** have no importer. The common open code
  systems are licensed (LOINC) or clinical content that needs your clinical lead's review before it is shown to
  students. Send the files you want used and the clinical lead's approval, and they get an importer like the above.

## Starting again

`python -m scripts.open_data purge --yes` and `python -m scripts.seed_scenarios purge --yes` remove what they
made. For a clean slate, drop the dev database and let the backend recreate it.
