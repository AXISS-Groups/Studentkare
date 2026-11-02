import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/i18n';
import { dateLocale } from '@/features/labResults/viewmodel/trendScreenModels';
import type { ArtSource } from '@/features/phoneKit/artSource';
import { HealthVaultViewModel } from '../viewmodel/HealthVaultViewModel';
import { HealthVaultView } from './HealthVaultView';
import type { VaultTab } from './HealthVaultView';

/**
 * Health records in the Expo app (design page 2: RecordsVault): the same
 * `HealthVaultView` the web draws (Tier 1 parity plan 2026-10-24 §6), on the
 * same view-model. Add a document opens the camera capture; the Prescriptions
 * tab shows the same two sections (choosing a collection time, the consent
 * inbox and the care circle are web-only until phase 4). No export here: a
 * phone has nowhere the app may write the file.
 */
export function HealthVaultRoute({ onCapture, art }: { onCapture?: () => void; art?: { hero?: ArtSource; empty?: ArtSource; rx?: ArtSource } } = {}): React.ReactElement {
  const [vm] = useState(() => new HealthVaultViewModel());
  const [tab, setTab] = useState<VaultTab>('documents');
  const locale = dateLocale(useLanguage().lang);
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return (
    <HealthVaultView
      viewModel={vm}
      online
      tab={tab}
      onTabChange={setTab}
      locale={locale}
      art={art}
      links={{ addDocument: onCapture }}
      prescriptions={{ links: {} }}
    />
  );
}
