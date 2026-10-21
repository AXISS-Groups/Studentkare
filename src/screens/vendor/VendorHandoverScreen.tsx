import React, { useEffect } from 'react';
import { ConsoleTablePage } from '@/design-system/console/ConsoleTablePage';
import { SkButton } from '@/design-system/primitives';
import { Icon } from '@/design-system/icons';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import { navigate, RoutePath } from '@/lib/utils/workflowRouting';
import { PARTNER_EMPTY_TILE } from '@/features/partner/PartnerPage';
import { bindCounter, useCounterSession } from '@/features/partner/work/counterSession';
import type { CounterVerification } from '@/features/partner/work/counterSession';
import { clockTime, initials } from '@/features/partner/work/workCopy';
import '@/features/partner/work/partner-work.css';

/**
 * VendorHandover — the counter handover (design page 6, Tier 1, approved 2026-10-21).
 *
 * "At the counter now" starts from this tab's counter session: a live pass the
 * server accepted (`POST /identity/verify`) and the staff member matched to the
 * person. Nothing else on the board has a server model yet, so (approved
 * decisions) it is drawn honestly:
 * - the handover list, OTPs, refusals and expiries are not connected: "—"
 *   figures, the designed columns and a "not connected" row, never sample rows;
 * - "Rx matches" and "Bag photo" are not connected, so "Photo & hand over"
 *   stays disabled with the reason; nothing is ever marked handed over here;
 * - a student stopped at this counter ("not the same person") never appears as
 *   verified, so nothing can follow for them in this session.
 * The rule stands in the footnote: a prescription-only medicine goes only to
 * the person it was written for.
 */
export function VendorHandoverScreen({ onNavigate }: { onNavigate?: (route: string) => void; onLogout?: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const session = useCounterSession();
  useEffect(() => { bindCounter(user?.id ?? ''); }, [user?.id]);
  const go = (route: RoutePath) => (onNavigate ? onNavigate(route) : navigate(route));

  return (
    <main className="sk-ds pc-page">
      <ConsoleTablePage
        status="unconnected"
        header={{ title: t('pt.ho.title'), subtitle: t('pt.ho.sub') }}
        note={<CounterNow current={session.current} onVerify={() => go('scan-verify')} />}
        statLabels={[t('pt.ho.stat.today'), t('pt.ho.stat.refused'), t('pt.ho.stat.expired'), t('pt.ho.stat.validity')]}
        statsLabel={t('pt.ho.statsLabel')}
        table={{
          caption: t('pt.ho.caption'),
          columns: [
            { label: t('pt.ho.col.order'), width: '130px' },
            { label: t('pt.ho.col.collector'), width: '200px' },
            { label: t('pt.ho.col.contents') },
            { label: t('pt.ho.col.otp'), width: '170px' },
            { label: t('pt.ho.col.state'), width: '200px', align: 'end' },
          ],
          rows: [],
          footnote: t('pt.ho.footnote'),
        }}
        empty={{ title: t('pt.ho.unconnectedTitle'), body: t('pt.ho.unconnectedBody'), icon3d: PARTNER_EMPTY_TILE }}
        unconnected={{ title: t('pt.ho.unconnectedTitle'), body: t('pt.ho.unconnectedBody') }}
        error={{ title: t('pt.ho.errorTitle'), reference: t('pt.ho.ref'), onRetry: () => go('handover'), onHelp: () => go('support') }}
        loadingLabel={t('console.loading', { title: t('pt.ho.title') })}
      />
    </main>
  );
}

function CounterNow({ current, onVerify }: { current: CounterVerification | null; onVerify: () => void }) {
  const t = useT();
  if (!current) {
    return (
      <section className="pw-now is-empty" aria-labelledby="pw-counter-title">
        <span className="pw-now__words">
          <span className="pw-now__eyebrow">{t('pt.ho.now.eyebrow')}</span>
          <span id="pw-counter-title" className="pw-now__title">{t('pt.ho.now.none')}</span>
          <span className="pw-now__meta">{t('pt.ho.now.noneBody')}</span>
        </span>
        <span className="pw-now__actions"><SkButton onClick={onVerify}>{t('pt.ho.now.verify')}</SkButton></span>
      </section>
    );
  }
  return (
    <section className="pw-now" aria-labelledby="pw-counter-title">
      <span className="pw-now__avatar" aria-hidden="true">
        {initials(current.fullName)}
        <span className="pw-now__tick"><Icon name="check" size={12} strokeWidth={3} /></span>
      </span>
      <span className="pw-now__words">
        <span className="pw-now__eyebrow">{t('pt.ho.now.eyebrow')}</span>
        <span id="pw-counter-title" className="pw-now__title">{current.fullName}</span>
        <span className="pw-now__meta">{t('pt.ho.now.meta', { time: clockTime(current.verifiedAt, 'ms') })}</span>
      </span>
      <ol className="pw-steps" aria-label={t('pt.ho.now.stepsLabel')}>
        <li className="pw-step is-done"><Icon name="check" size={13} strokeWidth={2.6} />{t('pt.ho.step.verified')}<span className="sk-visually-hidden">{t('pt.step.done')}</span></li>
        <li className="pw-step"><span className="pw-step__dot" aria-hidden="true" />{t('pt.ho.step.rx')}<span className="sk-visually-hidden">{t('pt.step.notConnected')}</span></li>
        <li className="pw-step"><span className="pw-step__dot" aria-hidden="true" />{t('pt.ho.step.photo')}<span className="sk-visually-hidden">{t('pt.step.notConnected')}</span></li>
        <li className="pw-step"><span className="pw-step__dot" aria-hidden="true" />{t('pt.ho.step.handed')}</li>
      </ol>
      <span className="pw-now__actions">
        <SkButton disabled aria-describedby="pw-counter-why">{t('pt.ho.now.handOver')}</SkButton>
        <SkButton variant="secondary" onClick={onVerify}>{t('pt.ho.now.next')}</SkButton>
      </span>
      <p id="pw-counter-why" className="pw-hint">{t('pt.ho.now.why')}</p>
    </section>
  );
}
