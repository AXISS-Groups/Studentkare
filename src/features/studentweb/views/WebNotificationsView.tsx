import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { BrandLogo, Icon } from '@/design-system/icons';
import { NotificationSettingsViewModel } from '@/features/notifications/viewmodel/NotificationSettingsViewModel';
import type { PushCategory } from '@/features/notifications/viewmodel/NotificationSettingsViewModel';
import { CATEGORY_DESC, CATEGORY_LOCK, CATEGORY_NAME, CHANNEL_NAME, DEVICE_TEXT } from '@/features/notifications/views/NotificationSettingsView';
import type { PushDeviceController } from '@/features/notifications/data/pushDevice';
import { webPushController } from '@/lib/webPush';
import { ErrorPanel, Eyebrow, LoadingRows, PageHead } from './parts';

type Switchable = 'pushEnabled' | 'emailEnabled' | 'remindersEnabled';

const MASTERS: { key: Switchable; label: MessageKey; detail: MessageKey }[] = [
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
 * NotificationSettingsViewModel), drawn as the web board: what we send and
 * where, per category, with App / WhatsApp / Email chips; safety always on;
 * partner offers off until turned on; this browser's Web Push; and the
 * lock-screen preview of the category picked. The lock-screen line is not a
 * switch: messages never carry a result, medicine or diagnosis whatever is
 * chosen (DESIGN.md §7), so it is shown as always on.
 */
export const WebNotificationsView = observer(function WebNotificationsView({ viewModel: vm }: { viewModel: NotificationSettingsViewModel }) {
  const t = useT();
  const d = vm.draft;
  const now = new Date();
  const preview: PushCategory = vm.previewCategory;

  return (
    <div className="sk-sw-page">
      <PageHead title={t('sw.notif.title')} sub={t('sw.notif.sub')} />
      <div className="sk-sw-notif">
        <div className="sk-sw-notif__main">
          <div className="sk-sw-card sk-sw-notif__row">
            <span className="sk-sw-notif__text">
              <strong>{t('push.hide.title')}</strong>
              <small>{t('push.hide.body')}</small>
            </span>
            <span className="sk-sw-always"><Icon name="lock-7" size={14} />{t('sw.notif.alwaysOn')}</span>
          </div>

          {vm.deviceState ? (
            <div className="sk-sw-card sk-sw-notif__row" data-testid="web-push-device">
              <Icon name={vm.deviceState === 'on' ? 'bell' : 'bell-off'} size={20} />
              <span className="sk-sw-notif__text">
                <strong>{t('push.device.browser')}</strong>
                <small>{t(DEVICE_TEXT[vm.deviceState])}</small>
                {vm.deviceError ? <small className="sk-sw-error" role="alert">{t('push.device.failed')}</small> : null}
              </span>
              {vm.deviceState === 'on' || vm.deviceState === 'off' ? (
                <button type="button" className={`sk-sw-btn ${vm.deviceState === 'on' ? 'sk-sw-btn--outline' : 'sk-sw-btn--primary'}`} aria-busy={vm.deviceBusy} disabled={vm.deviceBusy} onClick={() => void vm.setDevice(vm.deviceState !== 'on')}>
                  {vm.deviceBusy ? t('push.device.working') : t(vm.deviceState === 'on' ? 'push.device.turnOff' : 'push.device.turnOn')}
                </button>
              ) : null}
            </div>
          ) : null}

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
              {vm.categories.length ? (
                <div className="sk-sw-notif__grid">
                  {vm.categories.map((category) => {
                    const off = !category.locked && category.channels.every((channel) => !vm.channelOn(category.key, channel));
                    return (
                      <div key={category.key} className={`sk-sw-card sk-sw-notif__cat${preview === category.key ? ' is-on' : ''}`} data-testid={`web-category-${category.key}`}>
                        <div className="sk-sw-notif__cat-head">
                          <button type="button" className="sk-sw-notif__cat-name" aria-pressed={preview === category.key} onClick={() => vm.setPreview(category.key)}>
                            <strong>{t(CATEGORY_NAME[category.key])}</strong>
                          </button>
                          {category.locked ? <span className="sk-sw-always"><Icon name="lock-7" size={14} />{t('push.alwaysOn')}</span> : off ? <span className="sk-sw-muted">{t('push.off')}</span> : null}
                        </div>
                        <small>{t(CATEGORY_DESC[category.key])}</small>
                        <div className="sk-sw-notif__chips" role="group" aria-label={t(CATEGORY_NAME[category.key])}>
                          {category.channels.map((channel) => {
                            const on = vm.channelOn(category.key, channel);
                            return (
                              <button
                                key={channel}
                                type="button"
                                className={`sk-sw-notif__chip${on ? ' is-on' : ''}${category.locked ? ' is-locked' : ''}`}
                                aria-pressed={on}
                                aria-disabled={category.locked || undefined}
                                aria-label={t('push.chipSpoken', { channel: t(CHANNEL_NAME[channel]), category: t(CATEGORY_NAME[category.key]) })}
                                title={category.locked ? t('push.safetyLocked') : undefined}
                                disabled={vm.saving}
                                onClick={() => (category.locked ? vm.setPreview(category.key) : vm.toggleChannel(category.key, channel))}
                              >
                                {t(CHANNEL_NAME[channel])}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className={`sk-sw-card sk-sw-notif__cat${d.marketingOptIn ? ' is-on' : ''}`}>
                    <div className="sk-sw-notif__cat-head">
                      <label htmlFor="sk-sw-offers"><strong>{t('push.offers.title')}</strong></label>
                      <Switch id="sk-sw-offers" label={t('push.offers.title')} checked={Boolean(d.marketingOptIn)} disabled={vm.saving} onChange={(next) => vm.setMarketing(next)} />
                    </div>
                    <small>{t('push.offers.body')}</small>
                  </div>
                </div>
              ) : null}
              <p className="sk-sw-fine">{t('push.inAppNote')} {t('push.externalNote')}</p>

              <div className="sk-sw-notif__grid">
                {MASTERS.map((master) => (
                  <div key={master.key} className={`sk-sw-card sk-sw-notif__cat${d[master.key] ? ' is-on' : ''}`}>
                    <div className="sk-sw-notif__cat-head">
                      <label htmlFor={`sk-sw-${master.key}`}><strong>{t(master.label)}</strong></label>
                      <Switch id={`sk-sw-${master.key}`} label={t(master.label)} checked={d[master.key]} disabled={vm.saving} onChange={(next) => vm.setSwitch(master.key, next)} />
                    </div>
                    <small>{t(master.detail)}</small>
                  </div>
                ))}
              </div>

              {vm.saveError ? <p className="sk-sw-error" role="alert">{t(vm.saveError)}</p> : null}
              {vm.savedAt && !vm.dirty ? <p className="sk-sw-success" role="status"><Icon name="check" size={16} />{t('nset.saved')}</p> : null}
              <div>
                <button type="button" className="sk-sw-btn sk-sw-btn--primary sk-sw-btn--lg" aria-busy={vm.saving} disabled={!vm.canSave || vm.saving} onClick={() => void vm.save()}>{vm.saving ? t('sw.notif.saving') : t('nset.save')}</button>
              </div>
            </>
          ) : null}
        </div>

        <aside className="sk-sw-notif__side">
          <div className="sk-sw-lock" aria-label={t('push.preview.spoken', { category: t(CATEGORY_NAME[preview]), title: t('push.preview.brand'), text: t(CATEGORY_LOCK[preview]) })} role="img">
            <span className="sk-sw-lock__time" aria-hidden="true">{now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false })}</span>
            <span className="sk-sw-lock__cap" aria-hidden="true">{t('push.preview.cap')}</span>
            <span className="sk-sw-lock__note" aria-hidden="true">
              <BrandLogo size={30} label="" />
              <span><strong>{t('push.preview.title', { category: t(CATEGORY_NAME[preview]) })}</strong><small>{t(CATEGORY_LOCK[preview])}</small></span>
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
export function WebNotificationsRoute({ device = webPushController }: { device?: PushDeviceController | null } = {}): React.ReactElement {
  const [vm] = useState(() => new NotificationSettingsViewModel(undefined, device));
  useEffect(() => {
    void vm.load();
    void vm.loadDevice();
    return () => vm.dispose();
  }, [vm]);
  return <WebNotificationsView viewModel={vm} />;
}
