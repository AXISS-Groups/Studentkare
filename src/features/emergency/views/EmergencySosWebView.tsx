import React from 'react';
import { SosView } from './SosView';
import type { SosLinks } from './SosView';

/** Web SOS screen — the shared, honest SosView. */
export function EmergencySosWebView({ signedIn, links }: { signedIn: boolean; links: SosLinks }): React.ReactElement {
  return <SosView signedIn={signedIn} links={links} />;
}
