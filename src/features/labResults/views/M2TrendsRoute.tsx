import React, { useEffect, useState } from 'react';
import { useOnline } from '@/design-system';
import { useApiResource } from '@/hooks/api/useApiResource';
import { navigate } from '@/lib/utils/workflowRouting';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import type { Page, ReportReview } from '@/features/preventive/models';
import { TrendsViewModel } from '../viewmodel/LabValuesViewModels';
import { REVIEWS_PATH } from '../viewmodel/trendScreenModels';
import { M2TrendsView } from './M2TrendsView';

/**
 * Mobile 2.0 Trends on the web: /health/trends for a signed-in student (the
 * phone frame at phone width, the student web shell above it). No test is
 * named in the URL: a test name is health data (plan, Rule L), so the screen
 * opens on the first bookmarked test, else the first.
 */
export function M2TrendsRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [vm] = useState(() => new TrendsViewModel());
  const online = useOnline();
  const reviews = useApiResource<Page<ReportReview>>(REVIEWS_PATH);
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  return (
    <M2TrendsView
      vm={vm}
      reviews={reviews.data?.items ?? null}
      online={online}
      wide={wide}
      links={{ back: () => navigate(STUDENT_NAV_ROUTES.health), upload: () => navigate('health/report-upload') }}
    />
  );
}
