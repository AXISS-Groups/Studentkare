import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M04',
  name: 'emergency',
  owner: 'care-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: ['realtime'],
  dependsOn: ['M01', 'M03'],
  routes: ['/emergency', '/sos'],
  emits: ['emergency.triggered', 'emergency.cancelled', 'emergency.dispatched'],
  consumes: ['auth.session.changed'],
});
