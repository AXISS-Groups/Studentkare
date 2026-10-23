import React from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import { Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { useT } from '@/i18n';
import { PARTNER_EMPTY_TILE } from '@/features/partner/PartnerPage';
import './vendor-camp-intake.css';

/**
 * VendorCampIntake — batch registration for campus health drives (design
 * page 6, Tier 2).
 *
 * No endpoint records camp batches, sample counts or cold-chain readings per
 * batch for a lab (the /camps API is the student's own booking and stations),
 * so the batch table is in its not-connected state in every build: designed
 * figures as "—", the columns, no rows. The fast-mode card opens the staff
 * app's camp board (StaffCampFast), which says plainly what it can't do yet.
 */
export interface VendorCampIntakeScreenProps {
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

const STEPS = ['scan', 'photo', 'sample'] as const;

export function VendorCampIntakeScreen({ onNavigate }: VendorCampIntakeScreenProps) {
  const t = useT();
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));
  const labels = [t('pc.camp.stat.samples'), t('pc.camp.stat.held'), t('pc.camp.stat.released'), t('pc.camp.stat.outside')];

  const fastMode = (
    <section className="vci-fast" aria-labelledby="vci-fast-title">
      <span className="vci-fast__badge" aria-hidden="true"><Icon name="scan" size={24} /></span>
      <span className="vci-fast__text">
        <span className="vci-fast__eyebrow">{t('pc.camp.fastEyebrow')}</span>
        <span id="vci-fast-title" className="vci-fast__title">{t('pc.camp.fastTitle')}</span>
        <span className="vci-fast__meta">{t('pc.camp.fastMeta')}</span>
      </span>
      <ul className="vci-fast__steps" aria-label={t('pc.camp.stepsLabel')}>
        {STEPS.map((step) => (
          <li key={step} className="vci-fast__step"><Icon name="check" size={14} strokeWidth={2.6} />{t(`pc.camp.step.${step}`)}</li>
        ))}
      </ul>
      <SkButton onClick={() => go('camp-fast')}>{t('pc.camp.openFast')}</SkButton>
    </section>
  );

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status="unconnected"
        header={{ title: t('pc.camp.title'), subtitle: t('pc.camp.sub') }}
        note={fastMode}
        statLabels={labels}
        statsLabel={t('pc.camp.statsLabel')}
        table={{
          caption: t('pc.camp.caption'),
          columns: [
            { label: t('pc.camp.col.batch'), width: '130px' },
            { label: t('pc.camp.col.camp') },
            { label: t('pc.camp.col.samples'), width: '130px' },
            { label: t('pc.camp.col.cold'), width: '160px' },
            { label: t('pc.camp.col.state'), width: '190px', align: 'end' },
          ],
          rows: [],
        }}
        empty={{ title: t('pc.camp.emptyTitle'), body: t('pc.camp.unconnectedBody'), icon3d: PARTNER_EMPTY_TILE }}
        unconnected={{ title: t('pc.camp.unconnectedTitle'), body: t('pc.camp.unconnectedBody') }}
        error={{ title: t('pc.camp.errorTitle'), reference: t('pc.camp.ref'), onRetry: () => go('camp-intake') }}
        loadingLabel={t('console.loading', { title: t('pc.camp.title') })}
      />
    </main>
  );
}
