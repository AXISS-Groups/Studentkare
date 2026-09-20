import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M14',
  name: 'lifeshare',
  owner: 'health-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: ['realtime'],
  dependsOn: ['M01'],
  routes: ['/lifeshare'],
  emits: ['lifeshare.request_created', 'lifeshare.matched'],
  consumes: ['auth.session.changed'],
});
