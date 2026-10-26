import { registerModule } from '@/core/routing/registry';
import type { FeatureModule } from '@/core/routing/registry';

/**
 * Developer-only pages. `import.meta.env.DEV` is false in a production build,
 * so Vite drops this branch and the gallery chunk is never emitted.
 */
const devModule: FeatureModule = {
  id: 'dev',
  title: 'Developer tools',
  basePath: '/dev',
  routes: [
    { path: '/dev/icons', public: true, load: () => import('./views/IconGalleryView').then((m) => ({ default: m.IconGalleryView })) },
  ],
};

if (import.meta.env.DEV) registerModule(devModule);
