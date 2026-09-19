import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M19',
  name: 'scanners',
  owner: 'ops',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/scanners'],
  emits: ['scanners.updated'],
  consumes: [],
});
