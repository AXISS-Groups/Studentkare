import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M07',
  name: 'health',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/health'],
  emits: ['health.updated'],
  consumes: [],
});
