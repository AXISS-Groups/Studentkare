import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M06',
  name: 'notifications',
  owner: 'ops-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/notifications'],
  emits: ['notifications.updated'],
  consumes: [],
});
