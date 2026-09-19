import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M16',
  name: 'checkout',
  owner: 'commercial-team',
  phase: 1,
  dataClass: 'commercial',
  capabilities: [],
  dependsOn: [],
  routes: ['/checkout'],
  emits: ['checkout.updated'],
  consumes: [],
});
