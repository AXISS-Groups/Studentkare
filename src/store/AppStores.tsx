import React, { createContext, useContext, ReactNode } from 'react';
import { StudentStore } from '../features/health/store/StudentStore';
import { RecordsStore } from '../features/health/store/RecordsStore';
import { EmergencyStore } from '../features/health/store/EmergencyStore';
import { CampStore } from '../features/camp/store/CampStore';
import { FabricStore } from '../features/care/store/FabricStore';
import { ClaimsStore } from '../features/claims/store/ClaimsStore';
import { ClinicianStore } from '../features/clinician/store/ClinicianStore';
import { ChatStore } from '../features/chat/store/ChatStore';
import { LifeShareStore } from '../features/care/store/LifeShareStore';
import { MedicalIncidentStore } from '../features/care/store/MedicalIncidentStore';

/**
 * Composes every feature store into a single container, wiring cross-store
 * dependencies (records/camp/chat/fabric award or read points from the
 * student store) explicitly at construction time.
 *
 * Each store is DOM-free and independently observable, so it runs unchanged on
 * web and native. Components read individual stores via `useXStore()` hooks.
 */
export class AppStores {
  student: StudentStore;
  records: RecordsStore;
  emergency: EmergencyStore;
  camp: CampStore;
  fabric: FabricStore;
  claims: ClaimsStore;
  clinician: ClinicianStore;
  chat: ChatStore;
  lifeshare: LifeShareStore;
  medicalIncident: MedicalIncidentStore;

  constructor() {
    this.student = new StudentStore();
    this.emergency = new EmergencyStore();
    this.records = new RecordsStore(this.student);
    this.camp = new CampStore(this.student);
    this.fabric = new FabricStore(this.student);
    this.claims = new ClaimsStore();
    this.clinician = new ClinicianStore();
    this.chat = new ChatStore(this.student);
    this.lifeshare = new LifeShareStore();
    this.medicalIncident = new MedicalIncidentStore();
  }
}

const AppStoresContext = createContext<AppStores | undefined>(undefined);

export function AppStoresProvider({ children }: { children: ReactNode }) {
  const [stores] = React.useState(() => new AppStores());
  return <AppStoresContext.Provider value={stores}>{children}</AppStoresContext.Provider>;
}

export function useStores(): AppStores {
  const context = useContext(AppStoresContext);
  if (!context) throw new Error('useStores must be used within an AppStoresProvider');
  return context;
}

export function useStudentStore(): StudentStore {
  return useStores().student;
}
export function useRecordsStore(): RecordsStore {
  return useStores().records;
}
export function useEmergencyStore(): EmergencyStore {
  return useStores().emergency;
}
export function useCampStore(): CampStore {
  return useStores().camp;
}
export function useFabricStore(): FabricStore {
  return useStores().fabric;
}
export function useClaimsStore(): ClaimsStore {
  return useStores().claims;
}
export function useClinicianStore(): ClinicianStore {
  return useStores().clinician;
}
export function useChatStore(): ChatStore {
  return useStores().chat;
}
export function useLifeShareStore(): LifeShareStore {
  return useStores().lifeshare;
}
export function useMedicalIncidentStore(): MedicalIncidentStore {
  return useStores().medicalIncident;
}
