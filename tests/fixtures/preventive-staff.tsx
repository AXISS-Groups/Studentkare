import React from 'react';
import { createRoot } from 'react-dom/client';
import { PreventiveOperationsScreen } from '../../src/features/preventive/screens/PreventiveOperationsScreen';
import { PreventiveReviewScreen } from '../../src/features/preventive/screens/PreventiveReviewScreen';
import { setCsrfToken } from '../../src/data/http';
import { ThemeProvider } from '../../src/theme/theme';
import '../../src/theme/marketplace.css';
import '../../src/theme/health-experience.css';
import '../../src/theme/workflows.css';
import '../../src/theme/indigo.css';

setCsrfToken('preventive-fixture-csrf');
createRoot(document.getElementById('root')!).render(
  <ThemeProvider><main className="wf-application" style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
    {location.search.includes('idle') ? null : location.search.includes('review') ? <PreventiveReviewScreen /> : <PreventiveOperationsScreen />}
  </main></ThemeProvider>,
);
