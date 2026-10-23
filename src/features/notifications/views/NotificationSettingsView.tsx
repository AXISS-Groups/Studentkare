import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Chip, ErrorState, Note, Rise, Skeleton, SwitchRow, TextField } from '@/design-system';
import { BrandLogo, Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardCard, BoardScreen, BoardSection } from '@/design-system/board/BoardKit';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import type { PushDeviceController, PushDeviceState } from '../data/pushDevice';
import { NotificationSettingsViewModel, isClockTime } from '../viewmodel/NotificationSettingsViewModel';
import type { PushCategory, PushChannel } from '../viewmodel/NotificationSettingsViewModel';

export const CATEGORY_NAME: Record<PushCategory, MessageKey> = {
  SAFETY: 'push.cat.SAFETY', CARE: 'push.cat.CARE', REMINDERS: 'push.cat.REMINDERS', ORDERS: 'push.cat.ORDERS',
  CAMPS: 'push.cat.CAMPS', ACCOUNT: 'push.cat.ACCOUNT', ANNOUNCEMENTS: 'push.cat.ANNOUNCEMENTS',
};
export const CATEGORY_DESC: Record<PushCategory, MessageKey> = {
  SAFETY: 'push.cat.SAFETY.desc', CARE: 'push.cat.CARE.desc', REMINDERS: 'push.cat.REMINDERS.desc', ORDERS: 'push.cat.ORDERS.desc',
  CAMPS: 'push.cat.CAMPS.desc', ACCOUNT: 'push.cat.ACCOUNT.desc', ANNOUNCEMENTS: 'push.cat.ANNOUNCEMENTS.desc',
};
/** The fixed line the server sends for each category (backend/core/push_copy.LOCK_SCREEN). */
export const CATEGORY_LOCK: Record<PushCategory, MessageKey> = {
  SAFETY: 'push.lock.SAFETY', CARE: 'push.lock.CARE', REMINDERS: 'push.lock.REMINDERS', ORDERS: 'push.lock.ORDERS',
  CAMPS: 'push.lock.CAMPS', ACCOUNT: 'push.lock.ACCOUNT', ANNOUNCEMENTS: 'push.lock.ANNOUNCEMENTS',
};
export const CHANNEL_NAME: Record<PushChannel, MessageKey> = { PUSH: 'push.ch.PUSH', WHATSAPP: 'push.ch.WHATSAPP', EMAIL: 'push.ch.EMAIL' };
export const DEVICE_TEXT: Record<PushDeviceState, MessageKey> = {
  on: 'push.device.on', off: 'push.device.off', denied: 'push.device.denied',
  unsupported: 'push.device.unsupported', unavailable: 'push.device.unavailable',
};

/**
 * Notification settings (design page 2, NotificationSettings, Tier 2), one
 * source for web (phone frame) and native.
 *
 * What we send and where: each category with its channel chips (App,
 * WhatsApp, Email), safety drawn as always on, a lock-screen preview of the
 * category tapped, and partner offers as a separate switch that starts off.
 * "Hide health details" is not a switch: no message ever carries a result,
 * medicine or diagnosis, whatever is chosen, so it is drawn as always on.
 * This phone's push state sits above the grid; the OS prompt appears only
 * when the student taps Turn on (or sets their first reminder).
 */
export const NotificationSettingsView = observer(function NotificationSettingsView({
  viewModel,
  links = {},
}: {
  viewModel: NotificationSettingsViewModel;
  links?: { back?: () => void };
}) {
  const vm = viewModel;
  const d = vm.draft;
  const t = useT();
  const preview = vm.previewCategory;

  return (
    <BoardScreen testID="notification-settings">
      <BoardHeader title={t('notif.title')} backIcon="chevron-left" backLabel={t('common.back')} onBack={links.back} />

      {vm.phase === 'loading' ? <Skeleton label={t('nset.loading')} lines={['70%', '100%', '100%', '60%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState
          title={t('nset.failedTitle')}
          body={t('nset.failedBody')}
          retryLabel={t('common.tryAgain')}
          onRetry={() => void vm.load()}
        />
      ) : null}

      {vm.phase === 'ready' && d && vm.categories.length ? (
        <Rise index={0}>
          <View
            style={styles.lock}
            accessible
            accessibilityRole="image"
            accessibilityLabel={t('push.preview.spoken', { category: t(CATEGORY_NAME[preview]), title: t('push.preview.brand'), text: t(CATEGORY_LOCK[preview]) })}
            testID="notification-lock-preview"
          >
            <Text style={styles.lockCap}>{t('push.preview.cap')}</Text>
            <View style={styles.lockNote}>
              <BrandLogo size={space.s32} label="" />
              <View style={styles.flex}>
                <View style={styles.lockHead}>
                  <Text style={styles.lockTitle} numberOfLines={1}>{t('push.preview.title', { category: t(CATEGORY_NAME[preview]) })}</Text>
                  <Text style={styles.lockTime}>{t('push.preview.now')}</Text>
                </View>
                <Text style={styles.lockText}>{t(CATEGORY_LOCK[preview])}</Text>
              </View>
            </View>
          </View>
        </Rise>
      ) : null}

      <BoardCard testID="notification-settings-always">
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, styles.flex]}>{t('push.hide.title')}</Text>
          <View style={styles.always}>
            <Icon name="lock-7" size={space.s14} color={color.positive} />
            <Text style={styles.alwaysText}>{t('push.alwaysOn')}</Text>
          </View>
        </View>
        <Text style={styles.body}>{t('push.hide.body')}</Text>
      </BoardCard>

      {vm.deviceKind && vm.deviceState ? (
        <BoardCard testID="notification-device">
          <View style={styles.cardHead}>
            <Icon name={vm.deviceState === 'on' ? 'bell' : 'bell-off'} size={space.s20} color={vm.deviceState === 'on' ? color.action : color.text3} />
            <Text style={[styles.cardTitle, styles.flex]}>{t(vm.deviceKind === 'phone' ? 'push.device.phone' : 'push.device.browser')}</Text>
          </View>
          <Text style={styles.body}>{t(DEVICE_TEXT[vm.deviceState])}</Text>
          {vm.deviceError ? <Note tone="danger">{t('push.device.failed')}</Note> : null}
          {vm.deviceState === 'on' || vm.deviceState === 'off' ? (
            <Button
              label={vm.deviceBusy ? t('push.device.working') : t(vm.deviceState === 'on' ? 'push.device.turnOff' : 'push.device.turnOn')}
              variant={vm.deviceState === 'on' ? 'secondary' : 'primary'}
              busy={vm.deviceBusy}
              onPress={() => void vm.setDevice(vm.deviceState !== 'on')}
            />
          ) : null}
        </BoardCard>
      ) : null}

      <BoardSection label={t('pb.nset.whatWhere')}>
        {vm.phase === 'ready' && d && vm.categories.length ? vm.categories.map((category, index) => (
          <Rise key={category.key} index={index + 1}>
            <Pressable
              onPress={() => vm.setPreview(category.key)}
              accessibilityRole="button"
              accessibilityLabel={t(CATEGORY_NAME[category.key])}
              accessibilityState={{ selected: preview === category.key }}
              style={[styles.category, preview === category.key ? styles.categoryOn : null]}
              testID={`notification-category-${category.key}`}
            >
              <View style={styles.cardHead}>
                <Text style={[styles.cardTitle, styles.flex]}>{t(CATEGORY_NAME[category.key])}</Text>
                {category.locked ? (
                  <View style={styles.always}>
                    <Icon name="lock-7" size={space.s14} color={color.positive} />
                    <Text style={styles.alwaysText}>{t('push.alwaysOn')}</Text>
                  </View>
                ) : category.channels.every((channel) => !vm.channelOn(category.key, channel)) ? (
                  <Text style={styles.offText}>{t('push.off')}</Text>
                ) : null}
              </View>
              <Text style={styles.body}>{t(CATEGORY_DESC[category.key])}</Text>
              <View style={styles.chips}>
                {category.channels.map((channel) => (
                  <Chip
                    key={channel}
                    label={t(CHANNEL_NAME[channel])}
                    spokenLabel={t('push.chipSpoken', { channel: t(CHANNEL_NAME[channel]), category: t(CATEGORY_NAME[category.key]) })}
                    selected={vm.channelOn(category.key, channel)}
                    disabled={category.locked || vm.saving}
                    onPress={() => vm.toggleChannel(category.key, channel)}
                    testID={`notification-chip-${category.key}-${channel}`}
                  />
                ))}
              </View>
            </Pressable>
          </Rise>
        )) : null}

        {vm.phase === 'ready' && d ? (
          <BoardCard>
            {vm.categories.length ? (
              <SwitchRow
                label={t('push.offers.title')}
                detail={t('push.offers.body')}
                value={Boolean(d.marketingOptIn)}
                onChange={(v) => vm.setMarketing(v)}
              />
            ) : null}
            <SwitchRow label={t('nset.push')} detail={t('nset.pushDetail')} value={d.pushEnabled} onChange={(v) => vm.setSwitch('pushEnabled', v)} />
            <SwitchRow label={t('nset.email')} detail={t('nset.emailDetail')} value={d.emailEnabled} onChange={(v) => vm.setSwitch('emailEnabled', v)} />
            <SwitchRow label={t('nset.reminders')} detail={t('nset.remindersDetail')} value={d.remindersEnabled} onChange={(v) => vm.setSwitch('remindersEnabled', v)} />
          </BoardCard>
        ) : null}
        {vm.phase === 'ready' && vm.categories.length ? (
          <Text style={styles.meta}>{t('push.inAppNote')} {t('push.externalNote')}</Text>
        ) : null}
      </BoardSection>

      {vm.phase === 'ready' && d ? (
        <>
          <BoardCard>
            <Text style={styles.cardTitle}>{isClockTime(d.quietStart) && isClockTime(d.quietEnd) ? t('pb.nset.quietRange', { from: d.quietStart, to: d.quietEnd }) : t('nset.quiet')}</Text>
            <Text style={styles.body}>{t('nset.quietBody')}</Text>
            <View style={styles.times}>
              <View style={styles.time}>
                <TextField
                  label={t('nset.from')}
                  mono
                  value={d.quietStart}
                  onChangeText={(v) => vm.setQuiet('quietStart', v)}
                  error={vm.quietStartError ? t(vm.quietStartError, { example: '22:00' }) : undefined}
                  maxLength={5}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.time}>
                <TextField
                  label={t('nset.until')}
                  mono
                  value={d.quietEnd}
                  onChangeText={(v) => vm.setQuiet('quietEnd', v)}
                  error={vm.quietEndError ? t(vm.quietEndError, { example: '07:00' }) : undefined}
                  maxLength={5}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <Text style={styles.meta}>{t('nset.tz', { tz: d.timezone })}</Text>
          </BoardCard>

          <Text style={styles.meta}>{t('nset.privacy')}</Text>

          {vm.saveError ? <Note tone="danger">{t(vm.saveError)}</Note> : null}
          {vm.savedAt && !vm.dirty ? <Note tone="positive">{t('nset.saved')}</Note> : null}

          <Button label={t('nset.save')} size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave && !vm.saving} onPress={() => void vm.save()} />
        </>
      ) : null}
    </BoardScreen>
  );
});

/** Owns the view model's lifetime for a route on either platform. `device` is this phone or browser, when push exists there. */
export function NotificationSettingsRoute({ links, device = null }: { links?: { back?: () => void }; device?: PushDeviceController | null } = {}): React.ReactElement {
  const [vm] = useState(() => new NotificationSettingsViewModel(undefined, device));
  useEffect(() => {
    void vm.load();
    void vm.loadDevice();
    return () => vm.dispose();
  }, [vm]);
  return <NotificationSettingsView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  always: { flexDirection: 'row', alignItems: 'center', gap: space.s4, borderRadius: radius.full, backgroundColor: color.positiveBg, paddingHorizontal: space.s10, paddingVertical: space.s4 },
  alwaysText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  offText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.text3 },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  times: { flexDirection: 'row', gap: space.s12 },
  time: { flex: 1, minWidth: 0 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  category: { gap: space.s10, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.surface3 },
  categoryOn: { borderColor: color.action },
  lock: { gap: space.s10, padding: space.s16, borderRadius: radius.xl, backgroundColor: color.heroBg },
  lockCap: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero2 },
  lockNote: { flexDirection: 'row', gap: space.s10, padding: space.s12, borderRadius: radius.lg, backgroundColor: color.onHeroVeil },
  lockHead: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  lockTitle: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  lockTime: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.onHero2 },
  lockText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.onHero, lineHeight: font.size.bodySm * font.lineHeight.body },
});
