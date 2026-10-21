import React, { useEffect, useState } from 'react';
import { useOnline } from '@/design-system';
import { useT } from '@/i18n';
import { navigate } from '@/lib/utils/workflowRouting';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import { ReportUploadViewModel } from '../viewmodel/ReportUploadViewModel';
import { M2ReportUploadView } from './M2ReportUploadView';
import { pickReportFile } from './pickReportFile.web';

/**
 * Mobile 2.0 Add a lab report on the web: /health/report-upload for a
 * signed-in student. A photo or a PDF comes from the browser's file picker (on
 * a phone the camera is offered for a photo); the server checks and scans it.
 */
export function M2ReportUploadRoute(): React.ReactElement {
  const t = useT();
  const [vm] = useState(() => new ReportUploadViewModel(t('m2v.up.documentTitle')));
  const online = useOnline();
  useEffect(() => () => vm.dispose(), [vm]);
  const pick = (kind: 'photo' | 'pdf') => () => {
    void pickReportFile(kind).then((file) => { if (file) void vm.upload(file); });
  };
  return (
    <M2ReportUploadView
      vm={vm}
      sources={{ photo: pick('photo'), pdf: pick('pdf') }}
      online={online}
      links={{ back: () => navigate(STUDENT_NAV_ROUTES.health), trends: () => navigate('health/trends') }}
    />
  );
}
