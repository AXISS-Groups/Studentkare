import React from 'react';
import { Linking } from 'react-native';
import { useOnline } from '@/design-system';
import { useApiResource } from '@/hooks/api/useApiResource';
import { apiFileUrl } from '@/data/services/http';
import { useLocation } from '@/core/navigation';
import { useLanguage } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import { dateLocale } from '@/features/labResults/viewmodel/trendScreenModels';
import type { StudentLabTest } from '@/features/studentweb/views/t1/WebMyLabTestsView';
import { recordsArt } from '@/features/vault/views/recordsArt';
import { ReportInsightsView } from './ReportInsightsView';

/** The same page size the 3b page read, so "History · n" counts what My health's card counts. */
const ORDERS_PATH = '/lab-orders?limit=50';

/**
 * /report-insights for a signed-in student: the detail page of My health's
 * "Reviewed lab reports" card (Tier 1 parity plan §3). `?id=` is a report id
 * (never a test name: Rule L); the phone frame at phone width, the web shell
 * above it (`wide`).
 */
export function ReportInsightsRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const online = useOnline();
  const location = useLocation();
  const askedId = new URLSearchParams(location.search).get('id');
  const tests = useApiResource<{ items: StudentLabTest[] }>(ORDERS_PATH);
  const locale = dateLocale(useLanguage().lang);
  return (
    <ReportInsightsView
      tests={tests.data?.items ?? null}
      loading={tests.loading}
      failed={Boolean(tests.error)}
      online={online}
      onRetry={tests.reload}
      askedId={askedId}
      wide={wide}
      locale={locale}
      art={recordsArt.insightsMicroscope}
      links={{
        back: () => navigate(STUDENT_NAV_ROUTES.health),
        labTests: () => navigate('my-lab-tests'),
        talk: () => navigate('care'),
        addOutside: () => navigate('health/report-upload'),
        download: (documentId) => void Linking.openURL(apiFileUrl(documentId)),
      }}
    />
  );
}
