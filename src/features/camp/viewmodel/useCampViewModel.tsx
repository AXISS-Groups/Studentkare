import React from 'react';
import { CampViewModel } from './CampViewModel';
import { useCampStore, useStudentStore } from '../../../store/AppStores';

/** Creates a single CampViewModel bound to the shared stores for the lifetime of the component. */
export function useCampViewModel(): CampViewModel {
  const campStore = useCampStore();
  const studentStore = useStudentStore();
  return React.useMemo(() => new CampViewModel(campStore, studentStore), [campStore, studentStore]);
}
