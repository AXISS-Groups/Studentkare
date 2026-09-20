import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M03',
  name: 'digital_id',
  owner: 'identity-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: ['M01'],
  routes: ['/digital-id'],
  emits: ['digital_id.qr_refreshed'],
  consumes: ['auth.session.changed'],
});
