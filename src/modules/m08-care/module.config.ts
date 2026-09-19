import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M08',
  name: 'care',
  owner: 'ops-team',
  phase: 1,
  dataClass: 'operational',
  capabilities: [],
  dependsOn: [],
  routes: ['/care'],
  emits: ['care.updated'],
  consumes: [],
});
