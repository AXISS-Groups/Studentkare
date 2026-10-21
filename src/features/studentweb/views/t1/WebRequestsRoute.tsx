import React, { useEffect, useState } from 'react';
import { MyRequestsViewModel } from '@/features/requests/viewmodel/RequestsViewModel';
import { WebRequestsView } from './WebRequestsView';

/** Route /my-requests on the web: owns the view-model (same one as the phone board). */
export function WebRequestsRoute(): React.ReactElement {
  const [vm] = useState(() => new MyRequestsViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <WebRequestsView viewModel={vm} />;
}
