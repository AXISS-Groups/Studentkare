import React, { useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Drawer } from '@/design-system/overlays/Drawer';
import { CanvasImage } from '@/design-system/art';
import { useAuth } from '@/data/contexts/AuthContext';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { IdentitySummary, MemberProfile } from '@/data/types/workflowTypes';
import type { NotificationPreferences } from '@/features/notifications/viewmodel/NotificationSettingsViewModel';
import { ProfileForm } from '@/screens/workspace/MemberProfilePanel';
import { initialsOf } from '@/design-system/student-shell/StudentWebShell';
import { navigate } from '@/lib/utils/workflowRouting';
import type { RoutePath } from '@/lib/utils/workflowRouting';
import { ErrorPanel, LinkRow, LoadingRows, PageHead, Pill, TrustBand } from './parts';

interface ContactRow { icon: SkIconName; label: MessageKey; value: string; action?: { label: MessageKey; onPress: () => void } }

/**
 * Account (canvas 3b, WebAccount, Tier 2): how we reach the student and what
 * we may send. Every row is read from the account (`/profile`, `/identity`,
 * `/points/me`, `/notifications/preferences`).
 *
 * Not drawn as the canvas has them, because nothing stores them: a campus email
 * and an ABHA address (shown as not available yet), the per-check identity
 * ticks (we show the campus and age checks the account really records), and the
 * WhatsApp / partner-offer / survey switches (the Messages card shows the
 * channels that exist and links to Notifications to change them). The sign-in
 * mobile and email are not editable here, so they carry no Edit.
 */
export function WebAccountView() {
  const t = useT();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const profile = useApiResource<MemberProfile>('/profile');
  const identity = useApiResource<IdentitySummary>('/identity');
  const points = useApiResource<{ balance: number; redeemable: boolean }>('/points/me');
  const prefs = useApiResource<NotificationPreferences>('/notifications/preferences');
  const firstName = (user?.fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const go = (route: RoutePath) => () => navigate(route);

  const data = profile.data;
  const campusStatus = identity.data?.campusStatus;
  const campusVerified = campusStatus === 'VERIFIED' || (!identity.data && Boolean(user?.isVerifiedStudent));
  const checks: { label: MessageKey; done: boolean }[] = [
    { label: 'sw.account.check.campus', done: campusVerified },
    { label: 'sw.account.check.age', done: Boolean(data?.ageVerified) },
  ];
  const doneCount = checks.filter((check) => check.done).length;

  const rows: ContactRow[] = data ? [
    { icon: 'phone', label: 'sw.account.mobile', value: data.phone || t('sw.account.notAdded') },
    { icon: 'mail', label: 'sw.account.email', value: data.email || t('sw.account.notAdded') },
    {
      icon: 'graduation-cap-2', label: 'sw.account.campus',
      value: campusStatus === 'VERIFIED' ? t('sw.account.campusVerified', { campus: data.university || t('sw.account.campusUnnamed') })
        : campusStatus === 'PENDING' ? t('sw.account.campusPending') : t('sw.account.campusNone'),
      action: { label: campusStatus === 'VERIFIED' ? 'sw.account.details' : 'sw.account.verify', onPress: go('verify') },
    },
    { icon: 'id-card-2', label: 'sw.account.abha', value: t('shell.unavailable') },
    {
      icon: 'heart-2', label: 'sw.account.emergency',
      value: data.emergencyContactName ? t('sw.account.emergencyOne') : t('sw.account.notAdded'),
      action: { label: data.emergencyContactName ? 'sw.account.edit' : 'sw.account.add', onPress: () => setEditing(true) },
    },
    { icon: 'user', label: 'sw.account.personal', value: data.fullName, action: { label: 'sw.account.edit', onPress: () => setEditing(true) } },
  ] : [];

  const channels: { label: MessageKey; on: boolean | undefined }[] = [
    { label: 'nset.push', on: prefs.data?.pushEnabled },
    { label: 'nset.email', on: prefs.data?.emailEnabled },
    { label: 'nset.reminders', on: prefs.data?.remindersEnabled },
  ];

  return (
    <div className="sk-sw-page">
      <PageHead title={firstName ? t('sw.account.hi', { name: firstName }) : t('sw.account.title')} sub={t('sw.account.sub')} />
      <div className="sk-sw-account">
        <section className="sk-sw-card sk-sw-contact" aria-labelledby="sk-sw-contact-title">
          <div className="sk-sw-contact__head">
            <h2 id="sk-sw-contact-title" className="sk-sw-card__title">{t('sw.account.contact')}</h2>
            {data ? <Pill tone={doneCount === checks.length ? 'positive' : 'attention'} dot>{t('sw.account.checksDone', { done: doneCount, total: checks.length })}</Pill> : null}
          </div>
          {profile.loading ? <LoadingRows label={t('sw.account.loading')} rows={5} /> : null}
          {profile.error ? <ErrorPanel title={t('sw.account.errorTitle')} body={t('sw.account.errorBody')} onRetry={profile.reload} /> : null}
          {data ? (
            <>
              <div className="sk-sw-verify">
                <span className="sk-sw-verify__avatar" aria-hidden="true">{initialsOf(data.fullName)}</span>
                <span className="sk-sw-verify__text">
                  <strong>{doneCount === checks.length ? t('sw.account.verifiedAll') : t('sw.account.verifiedSome')}</strong>
                  <span className="sk-sw-verify__ticks">
                    {checks.map((check) => (
                      <span key={check.label} className={check.done ? 'is-done' : 'is-todo'}>
                        <Icon name={check.done ? 'check' : 'circle'} size={13} />{t(check.label)}
                        <span className="sk-visually-hidden">{check.done ? t('sw.account.checkDone') : t('sw.account.checkTodo')}</span>
                      </span>
                    ))}
                  </span>
                </span>
                <button type="button" className="sk-sw-link" onClick={go('verify')}>{t('sw.account.detailsLink')}<Icon name="arrow-right" size={14} /></button>
              </div>
              <ul className="sk-sw-contact__rows">
                {rows.map((row) => (
                  <li key={row.label} className="sk-sw-contact__row">
                    <span className="sk-sw-contact__icon" aria-hidden="true"><Icon name={row.icon} size={18} /></span>
                    <span className="sk-sw-contact__text"><small>{t(row.label)}</small><strong>{row.value}</strong></span>
                    {row.action ? <button type="button" className="sk-sw-link" onClick={row.action.onPress} aria-label={`${t(row.action.label)}: ${t(row.label)}`}>{t(row.action.label)}</button> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <div className="sk-sw-account__side">
          <button type="button" className="sk-sw-points" onClick={go('rewards')}>
            <span className="sk-sw-points__icon" aria-hidden="true"><Icon name="star" size={20} /></span>
            <span className="sk-sw-points__text">
              <strong>{points.data ? t('sw.account.points', { count: points.data.balance }) : points.error ? t('sw.account.pointsTitle') : t('sw.account.pointsLoading')}</strong>
              <small>{points.error ? t('sw.account.pointsError') : t('sw.account.pointsNote')}</small>
            </span>
            <Icon name="chevron-right" size={18} />
          </button>
          <section className="sk-sw-card sk-sw-messages" aria-labelledby="sk-sw-messages-title">
            <h2 id="sk-sw-messages-title" className="sk-sw-card__title">{t('sw.account.messages')}</h2>
            {prefs.loading ? <LoadingRows label={t('sw.account.loading')} rows={3} /> : null}
            {prefs.error ? <p className="sk-sw-error" role="alert">{t('sw.account.prefsError')}</p> : null}
            {prefs.data ? (
              <ul className="sk-sw-messages__list">
                {channels.map((channel) => (
                  <li key={channel.label}>
                    <span>{t(channel.label)}</span>
                    <Pill tone={channel.on ? 'action' : 'muted'}>{channel.on ? t('sw.on') : t('sw.off')}</Pill>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="sk-sw-fine">{t('sw.account.offersOff')}</p>
            <button type="button" className="sk-sw-btn sk-sw-btn--outline" onClick={go('notification-settings')}>{t('sw.account.manage')}</button>
            <p className="sk-sw-fine">{t('always.detail')}</p>
          </section>
        </div>
      </div>

      <hr className="sk-sw-rule" />
      <TrustBand />

      <section className="sk-sw-clinician" aria-labelledby="sk-sw-clin-title">
        <CanvasImage name="a-friendly-doctor-waving-hello-b859fc.png" className="sk-sw-clinician__art" />
        <div>
          <h2 id="sk-sw-clin-title">{t('sw.account.clinTitle')}</h2>
          <p>{t('sw.account.clinBody')}</p>
          <button type="button" className="sk-sw-btn sk-sw-btn--primary" onClick={go('clinicians/apply')}>{t('sw.account.clinCta')}</button>
        </div>
      </section>

      <div className="sk-sw-card sk-sw-leave">
        <LinkRow icon="lock-4" title={t('privacy.title')} meta={t('privacy.accountMeta')} onPress={go('privacy-consent')} />
        <LinkRow icon="graduation-cap" title={t('sw.account.leaveTitle')} meta={t('sw.account.leaveMeta')} onPress={go('leave-campus')} />
        <LinkRow icon="trash" tone="danger" title={t('sw.account.deleteTitle')} meta={t('sw.account.deleteMeta')} onPress={go('delete-account')} />
      </div>

      {data ? (
        <Drawer open={editing} title={t('sw.account.editTitle')} onClose={() => { setEditing(false); profile.reload(); }}>
          <ProfileForm initial={data} onOpenDigitalId={() => { setEditing(false); navigate('digital-id'); }} />
        </Drawer>
      ) : null}
    </div>
  );
}
