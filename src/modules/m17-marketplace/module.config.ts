import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M17',
  name: 'marketplace',
  owner: 'commercial-team',
  phase: 1,
  dataClass: 'commercial',
  capabilities: [],
  dependsOn: [],
  routes: ['/marketplace'],
  emits: ['marketplace.updated'],
  consumes: [],
});
