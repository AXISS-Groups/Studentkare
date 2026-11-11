# Health-data integration: current state and expansion plan (Android Health Connect + iOS HealthKit)

**Status:** plan, not yet built. Written after Krishna asked to scope Health Connect/HealthKit
integration "not only android ios also." Before drafting anything new, this checks what already
exists — and it's more than a scaffold.

## 1. Correction to the starting assumption

This is not a greenfield integration. Steps and distance are **already live** on both platforms,
with a real connector architecture, a server sync endpoint, and drafted app-store review notes:

| Piece | File |
|---|---|
| Platform adapters (HealthKit, Health Connect, phone motion sensor) | `src/native/stepConnectors.ts` |
| Connector interfaces + rules (no silent prompts, no fabricated zeros, never writes) | `src/features/steps/sources/connectors.ts` |
| Source priority + sync to server | `src/features/steps/sources/healthSources.ts`, `src/features/steps/model/stepSources.ts` |
| Server endpoint | `POST /v1/movement/background-sync` (keeps most-trusted source per metric per day, never sums) |
| iOS libraries | `react-native-health` (HealthKit), read-only: `StepCount`, `DistanceWalkingRunning` |
| Android libraries | `react-native-health-connect`, read-only: `Steps`, `Distance` |
| Play Store permissions declaration (draft) | `docs/store/health-connect-declaration.md` |
| App Store review notes (draft) | `docs/store/healthkit-review-notes.md` |
| Real screen this feeds | `/movement` (Steps) |

The pattern already in place: the student sees a plain explainer on the Steps screen, taps
Continue, *then* the OS permission prompt appears (never at launch); a connector only registers
a source once the OS actually granted read access; a metric the platform didn't return is left
out, never shown as zero; multiple connected sources are never added together — the most-trusted
one wins per day. Any expansion below should reuse this pattern exactly, not invent a new one.

**One stale doc found in passing:** `docs/integration-guide.md` §6 ("Native health integrations")
still describes an older, unrelated design — a web bridge (`src/lib/nativeHealth.ts`,
`window.nativeHealthBridge`) that a React Native wrapper would inject — and calls it "scaffolding,
activate by adding a native app bridge." That's superseded by the real connector code above, which
doesn't use a bridge at all. Worth a follow-up correction to that doc; not changed here since it's
a documentation accuracy fix, not part of this plan.

## 2. What's actually missing

Three flat, non-functional preview screens exist for reference (`src/features/redesignPreview/`,
explicitly "not wired, not replacing the real screen" — see each file's own JSDoc and `NOTES.md`).
Checking what each would need if a real screen were built behind it:

| Preview | What it shows | Sensor-fed? |
|---|---|---|
| `M2WaterPreview.tsx` | Hydration log, daily ml goal, 7-day bars | **Yes** — HealthKit/Health Connect both expose water intake |
| `VitalTrendsPreview.tsx` | Resting heart rate, SpO₂, blood pressure, sleep, each tagged MEASURED/MANUAL/ESTIMATE | **Partially** — heart rate, SpO₂ and sleep are sensor data; blood pressure in the preview is explicitly `MANUAL · you entered` (cuffs don't report through either platform in a way phones without a paired BP monitor can read) |
| `M2TrendsPreview.tsx` | Lab value over time (HbA1c), doctor's steps, "Recommended for this result" rail | **No** — this is a lab-result trend, not a sensor reading; out of scope for Health Connect/HealthKit |

So the real expansion work is two data types: **hydration** and **vitals (heart rate, SpO₂,
sleep)** — not three, because M2Trends's data never comes from the phone's health store.

## 3. Per-data-type plan

### 3a. Hydration (feeds a future real Water screen)

| | iOS (HealthKit) | Android (Health Connect) |
|---|---|---|
| Identifier | `HKQuantityTypeIdentifierDietaryWater` (`AppleHealthKit.Constants.Permissions.Water` in `react-native-health`) | `Hydration` record type (`react-native-health-connect`) |
| Read or write | Read **and optionally write** — unlike steps, the app is the natural place a student logs a glass of water, so this is the first metric where *writing back* to the health store is worth a product decision (write lets other apps see it too) | Same |
| Unit | Litres/millilitres | Litres |

Reuse `HealthKitModule`/`HealthConnectModule` in `connectors.ts` by adding a `waterMl(day)` method
to each, mirroring `stepCount`/`distanceMetres`. `DayTotals` in `healthSources.ts` would need a new
field (there's no placeholder for it today — `floors`, `activeEnergyKcal`, `standingMinutes` are
the only unused placeholders and none of them fit hydration, so this is a genuinely new field, not
one already anticipated).

### 3b. Vitals: heart rate, SpO₂, sleep (feeds a future real Trends/Vitals screen)

| | iOS (HealthKit) | Android (Health Connect) |
|---|---|---|
| Heart rate | `HeartRate` | `HeartRate` |
| SpO₂ | `OxygenSaturation` | `OxygenSaturation` |
| Sleep | `SleepAnalysis` (categorical, needs interval parsing — asleep/in-bed/awake segments, not a single number) | `SleepSession` |

These three are read-only by design — the preview's own `MEASURED`/`ESTIMATE` provenance labels
should map directly to whether the source is a paired device (band/watch, "MEASURED") or the
phone's own estimate ("ESTIMATE"), which HealthKit and Health Connect both expose per-sample as
a device/source identifier — reuse that rather than hardcoding a label.

**Blood pressure is explicitly out of this expansion.** The preview screen itself shows it as
`MANUAL · you entered`, and that's correct: without a paired BP cuff most phones have nothing to
read here. Building a BP connector would be real but low-value work until/unless a specific
paired-device partnership is in scope — flagging this rather than scoping it further.

Sleep is the trickiest of the three technically (session-based, not a single aggregate like steps),
so if this is sequenced, do heart rate and SpO₂ first — same aggregate-style read as steps/distance
already use — and treat sleep as its own follow-up ticket.

## 4. Architecture changes this implies

- **`connectors.ts`**: add `HeartRateModule`-style reads to `HealthKitModule`/`HealthConnectModule`,
  or split into per-metric connector sets if the existing `StepConnector` interface gets crowded.
  Worth deciding before writing code: one connector per *source* (current) vs. one connector per
  *metric* — hydration and vitals are optional reads a student might grant independently of steps,
  so a per-metric permission request (matching how `HK_READ`/`requestReads` already take an array
  of types) probably fits the existing explain-then-connect flow better than bundling everything
  into one giant permission ask.
- **`healthSources.ts`**: extend `DayTotals` with the new fields; `readValues()` already filters to
  finite non-negative numbers generically, so it needs no change for simple aggregates — sleep's
  interval data will need its own shape, not a `DayTotals` number.
- **Server**: a new sync endpoint (or an extended `/v1/movement/background-sync`) that keeps the
  same "most-trusted source per metric per day, never summed" rule the steps endpoint already
  enforces (`backend/services/wellness_api.py` `SOURCE_PRIORITY`).
- **Store docs**: `docs/store/health-connect-declaration.md` and `docs/store/healthkit-review-notes.md`
  both need a new row per added permission (Hydration, Heart Rate, SpO₂, Sleep) before either store
  submission — Google in particular reviews the Health Connect declaration before release, so this
  isn't optional paperwork.
- **Consent UI**: reuse the Steps screen's pattern exactly — plain explainer, "Continue," then the
  OS prompt, never asked at launch.

## 5. What this plan does not include

- Writing to Apple Health / Health Connect for anything except possibly hydration (flagged above
  as a product decision, not assumed).
- Blood pressure, blood glucose, or any paired-device clinical reading.
- Any gamification of these numbers (streaks, scores, comparisons) — same standing rule as steps
  and water already follow.
- Actually building the real Water/Vitals screens behind the previews — this plan only covers the
  data layer those screens would need, per the existing preview-screens-are-reference-only
  convention.
