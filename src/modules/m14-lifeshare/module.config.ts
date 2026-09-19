import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M14',
  name: 'lifeshare',
  owner: 'ops-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/lifeshare'],
  emits: ['lifeshare.updated'],
  consumes: [],
});
