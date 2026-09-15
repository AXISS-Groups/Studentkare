// Exercise the shared native view through RN Web; the device-only navigator is bundled separately.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { CampScreen } from '../../src/native/CampScreen';
import { AppStoresProvider } from '../../src/store/AppStores';

createRoot(document.getElementById('root')!).render(<AppStoresProvider><CampScreen /></AppStoresProvider>);
