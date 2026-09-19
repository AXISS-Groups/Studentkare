import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M04',
  name: 'emergency',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/emergency'],
  emits: ['emergency.updated'],
  consumes: [],
});
