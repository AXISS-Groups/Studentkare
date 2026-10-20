import { createContext, useContext } from 'react';

/**
 * The scope chosen in the console's top bar. Only "Whole campus" exists today:
 * no hostel-block or day-scholar source is connected, so no board can filter
 * by them yet, and the picker says so rather than offering scopes that would
 * show the same numbers.
 */
export interface CampusScope {
  id: string;
  label: string;
}

export const WHOLE_CAMPUS_SCOPE_ID = 'campus';

export const CampusScopeContext = createContext<CampusScope | null>(null);

export function useCampusScope(): CampusScope | null {
  return useContext(CampusScopeContext);
}
