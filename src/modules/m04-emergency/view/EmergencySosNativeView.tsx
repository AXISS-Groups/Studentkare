import React from 'react';
import { SosView } from './SosView';
import type { SosLinks } from './SosView';

/** Native SOS screen — the shared, honest SosView. */
export function EmergencySosNativeView({ signedIn, links }: { signedIn: boolean; links: SosLinks }): React.ReactElement {
  return <SosView signedIn={signedIn} links={links} />;
}
