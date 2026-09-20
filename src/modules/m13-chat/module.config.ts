import { defineModule } from '../../core/modules/moduleManifest';

export default defineModule({
  id: 'M13',
  name: 'chat',
  owner: 'clinical-team',
  phase: 1,
  dataClass: 'clinical',
  capabilities: [],
  dependsOn: [],
  routes: ['/chat'],
  emits: ['chat.updated'],
  consumes: [],
});
