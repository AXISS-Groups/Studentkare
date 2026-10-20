import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BrandLogo, Icon } from '@/design-system/icons';
import { NotificationSettingsViewModel } from '@/features/notifications/viewmodel/NotificationSettingsViewModel';
import { ErrorPanel, Eyebrow, LoadingRows, PageHead } from './parts';

type Switchable = 'pushEnabled' | 'emailEnabled' | 'remindersEnabled';

const CHANNELS: { key: Switchable; label: MessageKey; detail: MessageKey }[] = [
  { key: 'pushEnabled', label: 'nset.push', detail: 'sw.notif.pushDetail' },
  { key: 'emailEnabled', label: 'nset.email', detail: 'nset.emailDetail' },
  { key: 'remindersEnabled', label: 'nset.reminders', detail: 'nset.remindersDetail' },
];

const RULES: MessageKey[] = ['sw.notif.rule.values', 'sw.notif.rule.offers', 'sw.notif.rule.codes'];

/** A real on/off control: role switch, label, 44 px hit area. */
function Switch({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} className={`sk-sw-switch${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="sk-sw-switch__knob" aria-hidden="true" />
    </button>
  );
}

/**
 * Notifications (canvas 3b, WebNotifications, Tier 2), for the student web
 * shell. Same preferences as the phone screen (`/notifications/preferences`,
 * NotificationSettingsViewModel), drawn as the web board.
 *
 * The board's per-category × per-channel grid has no column behind it, so
 * channels are chosen once for everything and the grid is not drawn. The
 * lock-screen line is not a switch: messages never carry a result, medicine
 * or diagnosis whatever is chosen (DESIGN.md §7), so it is shown as always on.
 */
export const WebNotificationsView = observer(function WebNotificationsView({ viewModel: vm }: { viewModel: NotificationSettingsViewModel }) {
  const t = useT();
  const d = vm.draft;
  const now = new Date();

  return (
    <div className="sk-sw-page">
      <PageHead title={t('sw.notif.title')} sub={t('sw.notif.sub')} />
      <div className="sk-sw-notif">
        <div className="sk-sw-notif__main">
          <div className="sk-sw-card sk-sw-notif__row">
            <span className="sk-sw-notif__text">
              <strong>{t('sw.notif.lockTitle')}</strong>
              <small>{t('sw.notif.lockBody')}</small>
            </span>
            <span className="sk-sw-always"><Icon name="lock-7" size={14} />{t('sw.notif.alwaysOn')}</span>
          </div>

          {vm.phase === 'loading' ? <LoadingRows label={t('nset.loading')} rows={4} /> : null}
          {vm.phase === 'failed' ? <ErrorPanel title={t('nset.failedTitle')} body={t('nset.failedBody')} onRetry={() => void vm.load()} /> : null}

          {vm.phase === 'ready' && d ? (
            <>
              <div className="sk-sw-card sk-sw-notif__quiet">
                <span className="sk-sw-notif__text">
                  <strong>{t('nset.quiet')}</strong>
                  <small>{t('nset.quietBody')}</small>
                </span>
                <div className="sk-sw-notif__times">
                  <label className="sk-sw-field">
                    <span>{t('nset.from')}</span>
                    <input type="time" value={d.quietStart} onChange={(event) => vm.setQuiet('quietStart', event.target.value)} aria-invalid={vm.quietStartError ? true : undefined} />
                  </label>
                  <label className="sk-sw-field">
                    <span>{t('nset.until')}</span>
                    <input type="time" value={d.quietEnd} onChange={(event) => vm.setQuiet('quietEnd', event.target.value)} aria-invalid={vm.quietEndError ? true : undefined} />
                  </label>
                </div>
                {vm.quietStartError ? <p className="sk-sw-error" role="alert">{t(vm.quietStartError, { example: '22:00' })}</p> : null}
                {vm.quietEndError ? <p className="sk-sw-error" role="alert">{t(vm.quietEndError, { example: '07:00' })}</p> : null}
                <small className="sk-sw-muted">{t('nset.tz', { tz: d.timezone })}</small>
              </div>

              <Eyebrow>{t('sw.notif.where')}</Eyebrow>
              <div className="sk-sw-notif__grid">
                <div className="sk-sw-card sk-sw-notif__cat">
                  <div className="sk-sw-notif__cat-head">
                    <strong>{t('sw.notif.safety')}</strong>
                    <span className="sk-sw-always"><Icon name="lock-7" size={14} />{t('sw.notif.alwaysOn')}</span>
                  </div>
                  <small>{t('always.detail')}</small>
                </div>
                {CHANNELS.map((channel) => (
                  <div key={channel.key} className={`sk-sw-card sk-sw-notif__cat${d[channel.key] ? ' is-on' : ''}`}>
                    <div className="sk-sw-notif__cat-head">
                      <label htmlFor={`sk-sw-${channel.key}`}><strong>{t(channel.label)}</strong></label>
                      <Switch id={`sk-sw-${channel.key}`} label={t(channel.label)} checked={d[channel.key]} disabled={vm.saving} onChange={(next) => vm.setSwitch(channel.key, next)} />
                    </div>
                    <small>{t(channel.detail)}</small>
                  </div>
                ))}
              </div>
              <p className="sk-sw-fine">{t('sw.notif.perCategory')}</p>

              {vm.saveError ? <p className="sk-sw-error" role="alert">{t(vm.saveError)}</p> : null}
              {vm.savedAt && !vm.dirty ? <p className="sk-sw-success" role="status"><Icon name="check" size={16} />{t('nset.saved')}</p> : null}
              <div>
                <button type="button" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--lg" aria-busy={vm.saving} disabled={!vm.canSave || vm.saving} onClick={() => void vm.save()}>{vm.saving ? t('sw.notif.saving') : t('nset.save')}</button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="sk-sw-notif__side">
          <div className="sk-sw-lock" aria-label={t('sw.notif.previewLabel')} role="img">
            <span className="sk-sw-lock__time" aria-hidden="true">{now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false })}</span>
            <span className="sk-sw-lock__cap" aria-hidden="true">{t('sw.notif.previewCap')}</span>
            <span className="sk-sw-lock__note" aria-hidden="true">
              <BrandLogo size={30} label="" />
              <span><strong>{t('sw.notif.previewTitle')}</strong><small>{t('sw.notif.previewText')}</small></span>
              <small className="sk-sw-lock__now">{t('sw.notif.previewNow')}</small>
            </span>
          </div>
          <section className="sk-sw-card sk-sw-rules" aria-labelledby="sk-sw-rules-title">
            <Eyebrow id="sk-sw-rules-title">{t('sw.notif.rules')}</Eyebrow>
            <ul>{RULES.map((rule) => <li key={rule}>{t(rule)}</li>)}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
});

/** Owns the view model for the route (same lifetime rule as NotificationSettingsRoute). */
export function WebNotificationsRoute(): React.ReactElement {
  const [vm] = useState(() => new NotificationSettingsViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <WebNotificationsView viewModel={vm} />;
}
