import React, { Suspense, lazy, useEffect, useState } from 'react';
import { navigate } from '@/lib/utils/workflowRouting';
import { ScreenLoading } from '@/components/health/ScreenLoading';
import { VaccinesViewModel } from '../viewmodel/VaccinesViewModel';
import { M2VaccinesView } from './M2VaccinesView';

const PreventiveCareScreen = lazy(() => import('../screens/PreventiveCareScreen').then((m) => ({ default: m.PreventiveCareScreen })));

/**
 * Mobile 2.0 Vaccines on the web: /preventive-care for a signed-in student at
 * phone width. "Search by pincode, report reviews and reminders" opens the
 * full preventive tools under the board, as the old board did.
 */
export function M2VaccinesRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [vm] = useState(() => new VaccinesViewModel());
  const [more, setMore] = useState(false);
  useEffect(() => {
    vm.load();
    return () => vm.dispose();
  }, [vm]);
  useEffect(() => {
    if (more) document.getElementById('board-panel-preventive')?.scrollIntoView({ block: 'start' });
  }, [more]);
  return (
    <>
      <M2VaccinesView wide={wide} vm={vm} links={{
        back: () => navigate('health'),
        myHealth: () => navigate('your-care'),
        camp: () => navigate('health-camp'),
        more: () => setMore(true),
      }} />
      {more ? <div id="board-panel-preventive"><Suspense fallback={<ScreenLoading />}><PreventiveCareScreen /></Suspense></div> : null}
    </>
  );
}
