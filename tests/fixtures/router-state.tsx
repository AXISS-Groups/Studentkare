import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from '../../src/core/navigation';
import { AppRouter } from '../../src/core/routing/Router';
import { registerModule } from '../../src/core/routing/registry';
import { AuthProvider } from '../../src/data/AuthContext';

// A lazy import factory may create a wrapper. Its loader must not run again
// simply because the shell rerenders (or it loses the user's draft).
let loads = 0;
registerModule({
  id: 'state-regression', title: 'Route state regression', basePath: '/',
  routes: [{ path: '/draft', public: true, load: async () => {
    loads++;
    return { default: function DraftScreen() {
      const [draft, setDraft] = useState('');
      return <><label>Draft<input value={draft} onChange={event => setDraft(event.target.value)} /></label><output aria-label="Load count">{loads}</output></>;
    } };
  } }],
});

function Harness() {
  const [version, setVersion] = useState(0);
  return <><button onClick={() => setVersion(value => value + 1)}>Rerender shell {version}</button><AppRouter /></>;
}

createRoot(document.getElementById('root')!).render(<AuthProvider><HashRouter><Harness /></HashRouter></AuthProvider>);
