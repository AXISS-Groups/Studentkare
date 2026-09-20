// Store entry point.
//
// State is now owned by per-feature, DOM-free MobX stores (see ../store and
// ../features/*/store). This module re-exports the composition provider and
// the granular per-store hooks for convenient imports.
export {
  AppStoresProvider as AppStoreProvider,
  useStores,
  useStudentStore,
  useRecordsStore,
  useEmergencyStore,
  useCampStore,
  useFabricStore,
  useClaimsStore,
  useClinicianStore,
  useChatStore,
} from '../../store/AppStores';
export type { AppStores } from '../../store/AppStores';
