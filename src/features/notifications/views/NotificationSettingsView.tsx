import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Eyebrow, Note, Rise, Skeleton, SwitchRow, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { ALWAYS_ON } from '@/features/auth/views/permissionChoices';
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>Notifications</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          What we send you
        </Text>
      </Rise>

      <Note tone="info" title={ALWAYS_ON.title}>
        {ALWAYS_ON.detail}
      </Note>

      {vm.phase === 'loading' ? <Skeleton label="Loading your settings" lines={['70%', '100%', '100%', '60%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState
          title="Couldn't load your settings"
          body="We won't change anything until we can see what you chose before. Try again."
          retryLabel="Try again"
          onRetry={() => void vm.load()}
        />
      ) : null}

      {vm.phase === 'ready' && d ? (
        <>
          <Rise index={1}>
            <Card>
              <SwitchRow
                label="App notifications"
                detail="Updates on this phone or browser."
                value={d.pushEnabled}
                onChange={(v) => vm.setSwitch('pushEnabled', v)}
              />
              <SwitchRow
                label="Email"
                detail="Receipts and updates to your email address."
                value={d.emailEnabled}
                onChange={(v) => vm.setSwitch('emailEnabled', v)}
              />
              <SwitchRow
                label="Consult and medicine reminders"
                detail="Before appointments and at the dose times you set."
                value={d.remindersEnabled}
                onChange={(v) => vm.setSwitch('remindersEnabled', v)}
              />
            </Card>
          </Rise>

          <Rise index={2}>
            <Card>
              <Text style={styles.cardTitle}>Quiet hours</Text>
              <Text style={styles.body}>Held until the end of quiet hours. Safety messages still come through.</Text>
              <View style={styles.times}>
                <View style={styles.time}>
                  <TextField
                    label="From"
                    mono
                    value={d.quietStart}
                    onChangeText={(t) => vm.setQuiet('quietStart', t)}
                    error={vm.quietStartError || undefined}
                    maxLength={5}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.time}>
                  <TextField
                    label="Until"
                    mono
                    value={d.quietEnd}
                    onChangeText={(t) => vm.setQuiet('quietEnd', t)}
                    error={vm.quietEndError || undefined}
                    maxLength={5}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Text style={styles.meta}>Times are in {d.timezone}.</Text>
            </Card>
          </Rise>

          <Text style={styles.meta}>
            Messages never contain a result, a medicine name or a diagnosis — only that something is ready to view.
          </Text>

          {vm.saveError ? <Note tone="danger">{vm.saveError}</Note> : null}
          {vm.savedAt && !vm.dirty ? <Note tone="positive">Saved.</Note> : null}

          <Button label="Save changes" size="cta" fullWidth busy={vm.saving} disabled={!vm.canSave && !vm.saving} onPress={() => void vm.save()} />
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
