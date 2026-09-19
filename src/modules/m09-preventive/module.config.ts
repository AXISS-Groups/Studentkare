import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M09',
  name: 'preventive',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/preventive'],
  emits: ['preventive.updated'],
  consumes: [],
});
