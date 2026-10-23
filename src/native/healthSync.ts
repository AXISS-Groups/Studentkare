/**
 * src/native/healthSync.ts — device activity sync (Apple Health / Health Connect / the motion sensor).
 *
 * The registry and the sync live in `src/features/steps/sources/healthSources.ts`
 * so the shared Steps view model can use them on every platform (on the web
 * nothing registers, so nothing is read or sent). The native connectors in
 * `src/native/stepConnectors.ts` register here once the student connects a
 * source and the platform grants permission. See src/native/README.md.
 */
export {
  connectedProviders,
  isHealthSourceConnected,
  localDate,
  onHealthSourcesChanged,
  registerHealthSource,
  syncToday,
  unregisterHealthSource,
} from '@/features/steps/sources/healthSources';
export type {
  DayTotals,
  HealthPlatformSource,
  HealthProvider,
  HealthSyncOutcome,
  SyncedDay,
} from '@/features/steps/sources/healthSources';
