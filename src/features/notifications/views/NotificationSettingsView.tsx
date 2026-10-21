import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, Note, Rise, Skeleton, SwitchRow, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardCard, BoardScreen, BoardSection } from '@/design-system/board/BoardKit';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { NotificationSettingsViewModel, isClockTime } from '../viewmodel/NotificationSettingsViewModel';

/**
 * Notification settings (design page 2, NotificationSettings, Tier 2), one
 * source for web and native.
 *
 * Built from what the backend stores today. The design's per-category ×
 * per-channel grid, its lock-screen preview and the "hide health details"
 * switch have no column behind them, so they are not drawn — a toggle that
 * saves nothing would be a lie. What the board calls "Safety & account, always
 * on" is drawn as it is: on, and not a switch.
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

      <BoardSection label={t('pb.nset.whatWhere')}>
        <BoardCard testID="notification-settings-always">
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, styles.flex]}>{t('always.title')}</Text>
            <View style={styles.always}>
              <Icon name="lock-7" size={space.s14} color={color.positive} />
              <Text style={styles.alwaysText}>{t('pb.nset.alwaysOn')}</Text>
            </View>
          </View>
          <Text style={styles.body}>{t('always.detail')}</Text>
        </BoardCard>

        {vm.phase === 'ready' && d ? (
          <Rise index={1}>
            <BoardCard>
              <SwitchRow
                label={t('nset.push')}
                detail={t('nset.pushDetail')}
                value={d.pushEnabled}
                onChange={(v) => vm.setSwitch('pushEnabled', v)}
              />
              <SwitchRow
                label={t('nset.email')}
                detail={t('nset.emailDetail')}
                value={d.emailEnabled}
                onChange={(v) => vm.setSwitch('emailEnabled', v)}
              />
              <SwitchRow
                label={t('nset.reminders')}
                detail={t('nset.remindersDetail')}
                value={d.remindersEnabled}
                onChange={(v) => vm.setSwitch('remindersEnabled', v)}
              />
            </BoardCard>
          </Rise>
        ) : null}
      </BoardSection>

      {vm.phase === 'ready' && d ? (
        <>
          <Rise index={2}>
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
          </Rise>

          <Text style={styles.meta}>
            {t('nset.privacy')}
          </Text>

          {vm.saveError ? <Note tone="danger">{t(vm.saveError)}</Note> : null}
          {vm.savedAt && !vm.dirty ? <Note tone="positive">{t('nset.saved')}</Note> : null}

          <Button label={t('nset.save')} size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave && !vm.saving} onPress={() => void vm.save()} />
        </>
      ) : null}
    </BoardScreen>
  );
});

/** Owns the view model's lifetime for a route on either platform. */
export function NotificationSettingsRoute({ links }: { links?: { back?: () => void } } = {}): React.ReactElement {
  const [vm] = useState(() => new NotificationSettingsViewModel());
  useEffect(() => {
    void vm.load();
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
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  times: { flexDirection: 'row', gap: space.s12 },
  time: { flex: 1, minWidth: 0 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
