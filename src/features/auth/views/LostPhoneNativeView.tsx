import React from 'react';
import { LostPhoneRoute } from './LostPhonePanel';
import type { LostPhoneLinks } from './LostPhonePanel';

/** Native lost-phone screen: the same honest panel as the web. */
export function LostPhoneNativeView({ signedIn, links }: { signedIn: boolean; links: LostPhoneLinks }): React.ReactElement {
  return <LostPhoneRoute signedIn={signedIn} links={links} />;
}
