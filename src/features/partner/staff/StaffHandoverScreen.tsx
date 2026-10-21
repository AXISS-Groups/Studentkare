import React, { useEffect } from 'react';
import { Icon } from '@/design-system/icons';
import { SkButton } from '@/design-system/primitives';
import { useAuth } from '@/data/contexts/AuthContext';
import { useT } from '@/i18n';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { bindCounter, useCounterSession } from '@/features/partner/work/counterSession';
import { StaffPhone, VerifiedBanner } from './StaffPhone';

/**
 * StaffHandover — the staff app's "Hand over order" (design page 6, Tier 1,
 * phone board, approved 2026-10-21).
 *
 * Starts from this session's verified student. Nothing after that has a server
 * model yet, so (approved decisions) it is drawn honestly and nothing is ever
 * handed over from here: the bag's contents and the prescription match need a
 * handover record that links the order, the bag photo needs storage, retention
 * and access rules, and the counselling attestation has nowhere to be kept.
 * "Hand over" stays disabled with the reason. The rule is printed under it:
 * prescription medicines are never handed to a friend.
 */
export function StaffHandoverScreen({ onNavigate }: { onNavigate: (route: RoutePath) => void }) {
  const t = useT();
  const { user } = useAuth();
  const session = useCounterSession();
  useEffect(() => { bindCounter(user?.id ?? ''); }, [user?.id]);
  const current = session.current;
  return (
    <StaffPhone
      title={t('pt.sa.ho.title')}
      subtitle={user?.fullName}
      backLabel={t('pt.sa.back')}
      onBack={() => onNavigate('handover')}
      footer={(
        <>
          <SkButton disabled aria-describedby="sa-ho-why">{current ? t('pt.sa.ho.handTo', { name: current.fullName.split(/\s+/)[0] ?? '' }) : t('pt.sa.ho.hand')}</SkButton>
          <p id="sa-ho-why" className="sa-foot__note">{t('pt.sa.ho.why')}</p>
          <p className="sa-foot__note">{t('pt.sa.ho.rule')}</p>
        </>
      )}
    >
      <VerifiedBanner current={current} onRecheck={() => onNavigate('staff-verify')} />

      <section className="sa-card" aria-labelledby="sa-bag-title">
        <h2 id="sa-bag-title" className="sa-eyebrow">{t('pt.sa.ho.bag')}</h2>
        <p className="sa-note">{t('pt.sa.ho.bagNotConnected')}</p>
      </section>

      <section aria-labelledby="sa-photo-title" className="sa-stack">
        <h2 id="sa-photo-title" className="sa-eyebrow">{t('pt.sa.ho.photoTitle')}</h2>
        <div className="sa-capture">
          <Icon name="camera-2" size={26} strokeWidth={2} />
          <button type="button" className="sa-capture__label sa-capture__btn" disabled aria-describedby="sa-photo-why">{t('pt.sa.ho.photo')}</button>
          <span id="sa-photo-why" className="sa-capture__why">{t('pt.sa.ho.photoWhy')}</span>
        </div>
      </section>

      <label className="sa-check is-disabled">
        <input type="checkbox" disabled aria-describedby="sa-counsel-why" />
        {t('pt.sa.ho.counsel')}
      </label>
      <p id="sa-counsel-why" className="sa-small">{t('pt.sa.ho.counselWhy')}</p>
    </StaffPhone>
  );
}
