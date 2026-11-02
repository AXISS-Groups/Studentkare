import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useLocation, useNavigate } from '@/core/navigation';
import { VisitSummaryViewModel } from '../viewmodel/VisitSummaryViewModel';
import { VisitSummaryView } from './VisitSummaryView';
import type { VisitSummaryLinks } from './VisitSummaryView';

/**
 * The web route: reads `?id=` (a notification links straight to one summary)
 * and owns the view-model. Kept in its own file, separate from
 * `VisitSummaryView.tsx`, because it's the only thing in this feature that
 * depends on `@/core/navigation` — the web-only react-router facade. That
 * import can't be allowed to ride along into native's module graph: Metro
 * (native's bundler) fails to resolve `react-router-dom`'s own
 * `react-router/dom` submodule, so anything native imports must come from
 * `VisitSummaryView.tsx` directly, never through this file. Native mounts
 * `VisitSummaryView` itself from its own route (src/native/App.tsx), with no
 * `?id=` deep link yet.
 */
export const VisitSummaryRoute = observer(function VisitSummaryRoute({ links, wide = false }: { links: VisitSummaryLinks; wide?: boolean }): React.ReactElement {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const linkedId = new URLSearchParams(location.search).get('id');
  const [initialId] = useState(linkedId);
  const [vm] = useState(() => new VisitSummaryViewModel());
  useEffect(() => {
    void vm.load();
    if (initialId) void vm.open(initialId);
    return () => vm.dispose();
  }, [vm, initialId]);
  const selectedId = vm.selectedId;
  const wasOpen = useRef(false);
  useEffect(() => {
    // Back to the list drops the id from the address too, so a reload shows the list.
    if (wasOpen.current && !selectedId && linkedId) routerNavigate('/visit-summaries', { replace: true });
    wasOpen.current = selectedId !== null;
  }, [selectedId, linkedId, routerNavigate]);
  return <VisitSummaryView viewModel={vm} links={links} wide={wide} />;
});
