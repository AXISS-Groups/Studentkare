import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M11',
  name: 'camp',
  owner: 'ops-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/camp'],
  emits: ['camp.updated'],
  consumes: [],
});
