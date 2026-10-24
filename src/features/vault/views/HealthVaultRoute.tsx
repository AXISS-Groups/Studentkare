import React, { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useOnline } from '@/design-system';
import { useLanguage } from '@/i18n';
import { apiFileUrl } from '@/data/services/http';
import { useAuth } from '@/data/contexts/AuthContext';
import { useLocation, useNavigate } from '@/core/navigation';
import { navigate } from '@/lib/utils/workflowRouting';
import { STUDENT_NAV_ROUTES } from '@/screens/workspace/StudentPhoneFrame';
import { LabSlotPickerModal } from '@/components/health/LabSlotPickerModal';
import { ProviderDirectoryPanel } from '@/screens/workspace/FulfilmentQueuePanel';
import { dateLocale } from '@/features/labResults/viewmodel/trendScreenModels';
import { HealthVaultViewModel } from '../viewmodel/HealthVaultViewModel';
import { ConsentInboxBoard } from './ConsentInboxBoard';
import { FamilyCircleBoard } from './FamilyCircleBoard';
import { HealthVaultView } from './HealthVaultView';
import type { VaultTab } from './HealthVaultView';
import type { LabOrder } from './PrescriptionsTab';
import { recordsArt } from './recordsArt';

const TABS: readonly VaultTab[] = ['documents', 'prescriptions', 'who', 'family'];
const tabOf = (value: string | null): VaultTab => (TABS.includes(value as VaultTab) ? (value as VaultTab) : 'documents');

/** Saves the export as a file on this device. Nothing is kept anywhere else. */
function saveExport(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'studentkare-export.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * /records for a signed-in student on the web: the one vault view (Tier 1
 * parity plan 2026-10-24 §6–7) in the phone frame at phone width and the
 * student web shell above it (`wide`). The tab lives in `?tab=` so
 * /prescriptions can redirect to the Prescriptions tab. Choosing a collection
 * time opens the web's slot picker; the pharmacy and lab directories sit under
 * the Prescriptions sections, as they did on the older page.
 */
export function HealthVaultRoute({ wide = false }: { wide?: boolean } = {}): React.ReactElement {
  const [vm] = useState(() => new HealthVaultViewModel());
  const online = useOnline();
  const { user } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();
  const tab = tabOf(new URLSearchParams(location.search).get('tab'));
  const locale = dateLocale(useLanguage().lang);
  const [scheduling, setScheduling] = useState<LabOrder | null>(null);
  const [rxVersion, setRxVersion] = useState(0);
  useEffect(() => { void vm.load(); return () => vm.dispose(); }, [vm]);
  const setTab = useCallback((next: VaultTab) => {
    routerNavigate(next === 'documents' ? '/records' : `/records?tab=${next}`, { replace: true });
  }, [routerNavigate]);
  return (
    <>
      <HealthVaultView
        viewModel={vm}
        online={online}
        tab={tab}
        onTabChange={setTab}
        wide={wide}
        locale={locale}
        verified={user?.isVerifiedStudent ?? true}
        art={{ hero: recordsArt.vaultRecords, empty: recordsArt.vaultEmptyDoctor, rx: recordsArt.rxPills }}
        links={{
          back: () => navigate(STUDENT_NAV_ROUTES.profile),
          addDocument: () => navigate('health/report-upload'),
          saveExport,
          download: (documentId) => void Linking.openURL(apiFileUrl(documentId)),
          visitSummaries: () => navigate('visit-summaries'),
          verify: () => navigate('verify'),
        }}
        prescriptions={{
          links: { chooseTime: setScheduling },
          reloadKey: rxVersion,
          directory: { pharmacies: <ProviderDirectoryPanel kind="PHARMACY" />, labs: <ProviderDirectoryPanel kind="LAB" /> },
        }}
        panels={{
          who: <ConsentInboxBoard embedded links={{ records: () => setTab('documents') }} />,
          family: <FamilyCircleBoard embedded links={{ emergencyCard: () => navigate('emergency-card'), consent: () => setTab('who') }} />,
        }}
      />
      {scheduling ? (
        <LabSlotPickerModal
          isOpen
          testName={scheduling.testPanel.join(', ')}
          catalogItemId=""
          labOrder={{ id: scheduling.id, fastingRequired: scheduling.fastingRequired }}
          onSlotChosen={() => setRxVersion((v) => v + 1)}
          onClose={() => { setScheduling(null); setRxVersion((v) => v + 1); }}
        />
      ) : null}
    </>
  );
}
