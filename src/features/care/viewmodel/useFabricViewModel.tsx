import React from 'react';
import { FabricViewModel } from './FabricViewModel';
import { useFabricStore } from '../../../store/AppStores';

/** Creates a single FabricViewModel bound to the shared FabricStore. */
export function useFabricViewModel(): FabricViewModel {
  const fabricStore = useFabricStore();
  return React.useMemo(() => new FabricViewModel(fabricStore), [fabricStore]);
}
