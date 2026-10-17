import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Eyebrow, Note, Rise, Skeleton, SwitchRow, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { NotificationSettingsViewModel } from '../viewmodel/NotificationSettingsViewModel';

/**
 * Notification settings (design page 2, NotificationSettings, Tier 3), one
 * source for web and native.
 *
 * Built from what the backend stores today. The design's per-category ×
 * per-channel grid and the lock-screen switch have no column behind them, so
 * they are not drawn — a toggle that saves nothing would be a lie.
 */
export const NotificationSettingsView = observer(function NotificationSettingsView({
  viewModel,
}: {
  viewModel: NotificationSettingsViewModel;
}) {
  const vm = viewModel;
  const d = vm.draft;
  const t = useT();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>{t('notif.title')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {t('nset.title')}
        </Text>
      </Rise>

      <Note tone="info" title={t('always.title')}>
        {t('always.detail')}
      </Note>

      {vm.phase === 'loading' ? <Skeleton label={t('nset.loading')} lines={['70%', '100%', '100%', '60%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState
          title={t('nset.failedTitle')}
          body={t('nset.failedBody')}
          retryLabel={t('common.tryAgain')}
          onRetry={() => void vm.load()}
        />
      ) : null}

      {vm.phase === 'ready' && d ? (
        <>
          <Rise index={1}>
            <Card>
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
            </Card>
          </Rise>

          <Rise index={2}>
            <Card>
              <Text style={styles.cardTitle}>{t('nset.quiet')}</Text>
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
            </Card>
          </Rise>

          <Text style={styles.meta}>
            {t('nset.privacy')}
          </Text>

          {vm.saveError ? <Note tone="danger">{t(vm.saveError)}</Note> : null}
          {vm.savedAt && !vm.dirty ? <Note tone="positive">{t('nset.saved')}</Note> : null}

          <Button label={t('nset.save')} size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave && !vm.saving} onPress={() => void vm.save()} />
        </>
      ) : null}
    </ScrollView>
  );
});

/** Owns the view model's lifetime for a route on either platform. */
export function NotificationSettingsRoute(): React.ReactElement {
  const [vm] = useState(() => new NotificationSettingsViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <NotificationSettingsView viewModel={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 640 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2, lineHeight: font.size.bodySm * font.lineHeight.body },
  times: { flexDirection: 'row', gap: space.s12 },
  time: { flex: 1, minWidth: 0 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
