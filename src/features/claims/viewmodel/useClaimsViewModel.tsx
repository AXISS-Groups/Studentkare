import React, { useEffect } from 'react';
import { ClaimsViewModel } from './ClaimsViewModel';
import { useClaimsStore } from '../../../store/AppStores';

/** Creates a single ClaimsViewModel bound to the shared ClaimsStore. */
export function useClaimsViewModel(): ClaimsViewModel {
  const claimsStore = useClaimsStore();
  const vm = React.useMemo(() => new ClaimsViewModel(claimsStore), [claimsStore]);
  useEffect(() => {
    void vm.refreshFromAgent();
  }, [vm]);
  return vm;
}
