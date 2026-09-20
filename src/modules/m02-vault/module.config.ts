import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M02',
  name: 'vault',
  owner: 'health-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: ['ai'],
  dependsOn: ['M01'],
  routes: ['/vault', '/vault/:id'],
  emits: ['vault.synced', 'consent.granted'],
  consumes: ['auth.session.changed'],
});
