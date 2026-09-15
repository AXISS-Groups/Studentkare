import React, { useEffect } from 'react';
import { ClinicianViewModel } from './ClinicianViewModel';
import { useClinicianStore } from '../../../store/AppStores';

/** Creates a single ClinicianViewModel bound to the shared ClinicianStore. */
export function useClinicianViewModel(): ClinicianViewModel {
  const clinicianStore = useClinicianStore();
  const vm = React.useMemo(() => new ClinicianViewModel(clinicianStore), [clinicianStore]);
  useEffect(() => {
    void vm.refreshCdss();
  }, [vm]);
  return vm;
}
