import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M12',
  name: 'incidents',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/incidents'],
  emits: ['incidents.updated'],
  consumes: [],
});
