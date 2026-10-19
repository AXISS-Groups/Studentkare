import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import { Card, ErrorState, Eyebrow, Note, RadioGroup, Skeleton } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { getLaunchAppearance } from '@/design-system/nativeScheme';
import type { ThemePreference } from '@/features/account/appearance';
import { NativeAppearanceViewModel } from '@/features/account/viewmodel/NativeAppearanceViewModel';

/**
 * Appearance (Tier 3, composable; no canvas board): the same System / Light /
 * Dark choice as the web profile, saved to the account.
 */
export const AppearanceView = observer(function AppearanceView({ viewModel }: { viewModel: NativeAppearanceViewModel }) {
  const vm = viewModel;
  const t = useT();
  const options: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: t('appearance.system') },
    { value: 'light', label: t('appearance.light') },
    { value: 'dark', label: t('appearance.dark') },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Eyebrow>{t('appearance.title')}</Eyebrow>
      <Text accessibilityRole="header" style={styles.title}>{t('appearance.theme')}</Text>

      {vm.phase === 'loading' ? <Skeleton label={t('appearance.loading')} lines={['100%', '100%', '100%']} /> : null}

      {vm.phase === 'failed' ? (
        <ErrorState
          title={t('appearance.loadFailedTitle')}
          body={t('appearance.loadFailedBody')}
          retryLabel={t('common.tryAgain')}
          onRetry={() => void vm.load()}
        />
      ) : null}

      {vm.phase === 'ready' ? (
        <>
          <Card>
            <RadioGroup<ThemePreference>
              label={t('appearance.theme')}
              options={options}
              value={vm.preference}
              onChange={(next) => void vm.choose(next)}
            />
          </Card>
          {vm.saving ? <Note tone="info">{t('appearance.saving')}</Note> : null}
          {vm.saveFailed ? <Note tone="danger">{t('appearance.nativeSaveFailed')}</Note> : null}
          <View>
            <Text style={styles.meta}>{t('appearance.nativeIntro')}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
});

/** The route: one view model per visit, applying a saved choice through `applySaved`. */
export function AppearanceScreen({ applySaved }: { applySaved: (preference: ThemePreference) => void }) {
  const [vm] = useState(() => new NativeAppearanceViewModel(getLaunchAppearance(), applySaved));
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <AppearanceView viewModel={vm} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text3 },
});
