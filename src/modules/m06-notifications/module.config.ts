import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M06',
  name: 'notifications',
  owner: 'platform-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: ['realtime'],
  dependsOn: ['M01'],
  routes: ['/notifications'],
  emits: ['notifications.synced', 'notification.read'],
  consumes: ['auth.session.changed'],
});
