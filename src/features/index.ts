// Feature module registry. Importing this file registers every feature module
// with the router. Add a new domain by creating `features/<domain>/index.ts`
// and importing it here.
import './auth';
import './care';
import './health';

export * from './auth';
export * from './care';
export * from './health';
