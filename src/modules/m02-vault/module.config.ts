import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M02',
  name: 'vault',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/vault'],
  emits: ['vault.updated'],
  consumes: [],
});
