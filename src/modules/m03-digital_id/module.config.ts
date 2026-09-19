import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M03',
  name: 'digital_id',
  owner: 'ops-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/digital_id'],
  emits: ['digital_id.updated'],
  consumes: [],
});
