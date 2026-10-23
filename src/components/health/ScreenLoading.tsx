import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/design-system';
import { space } from '@/design-system/theme';

/** Fast loads finish before this and never flash a placeholder. */
const SHOW_AFTER_MS = 200;

/**
 * Loading state for route chunks and the sign-in check. It used to return
 * null, so every slow load was a blank page with nothing announced to a screen
 * reader. Before that it was a 7-second blocking loader. This is neither: a
 * skeleton that appears only if loading is actually slow, and never delays
 * content that is ready.
 */
export function ScreenLoading(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);
  const t = useT();
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!visible) return null;
  return (
    <View style={styles.box}>
      <Skeleton label={t('common.loading')} lines={['40%', '90%', '75%', '85%']} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: space.gutterPhone, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
