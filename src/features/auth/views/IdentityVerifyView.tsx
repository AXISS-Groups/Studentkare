import React from 'react';
import { navigate } from '@/lib/workflowRouting';
import { IdentityVerifyRoute } from './IdentityVerifyPanel';

/**
 * Web route /verify. It used to mark photo, email, campus ID and government ID
 * "Verified" on a click with no server call; it now shows only what
 * GET /identity can prove, and leaves everything else unverified.
 */
export function IdentityVerifyView(): React.ReactElement {
  return <IdentityVerifyRoute links={{ openCampusVerification: () => navigate('profile'), back: () => navigate('profile') }} />;
}
