import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M05',
  name: 'appointments',
  owner: 'ops-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/appointments'],
  emits: ['appointments.updated'],
  consumes: [],
});
