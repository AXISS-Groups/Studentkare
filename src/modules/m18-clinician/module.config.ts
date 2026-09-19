import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M18',
  name: 'clinician',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/clinician'],
  emits: ['clinician.updated'],
  consumes: [],
});
