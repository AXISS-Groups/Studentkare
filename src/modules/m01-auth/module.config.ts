import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M01',
  name: 'auth',
  owner: 'auth-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: ['realtime'],
  dependsOn: [],
  routes: ['/auth', '/auth/login', '/auth/signup'],
  emits: ['auth.session.changed', 'auth.updated'],
  consumes: [],
});
