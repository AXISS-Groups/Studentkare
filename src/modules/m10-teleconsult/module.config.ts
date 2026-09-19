import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M10',
  name: 'teleconsult',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/teleconsult'],
  emits: ['teleconsult.updated'],
  consumes: [],
});
