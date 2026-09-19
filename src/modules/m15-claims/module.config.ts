import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M15',
  name: 'claims',
  owner: 'commercial-team',
  phase: 1,
  dataClass: 'commercial',
  capabilities: [],
  dependsOn: [],
  routes: ['/claims'],
  emits: ['claims.updated'],
  consumes: [],
});
