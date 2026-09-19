import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M20',
  name: 'rewards',
  owner: 'commercial-team',
  phase: 1,
  dataClass: 'commercial',
  capabilities: [],
  dependsOn: [],
  routes: ['/rewards'],
  emits: ['rewards.updated'],
  consumes: [],
});
