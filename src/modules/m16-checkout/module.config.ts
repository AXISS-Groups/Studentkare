import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M16',
  name: 'checkout',
  owner: 'commerce-team',
  phase: 1,
  dataClass: 'commercial',
  capabilities: [],
  dependsOn: ['M01'],
  routes: ['/checkout'],
  emits: ['order.created', 'cart.cleared'],
  consumes: ['auth.session.changed'],
});
