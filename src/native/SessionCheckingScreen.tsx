import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Button, Skeleton } from '@/design-system';
import { color, space } from '@/design-system/theme';

/**
 * Shown while the server confirms the session. Emergency help is never behind
 * a loading state (DESIGN.md §2.4), so Call 112 is here too.
 */
export function SessionCheckingScreen(): React.ReactElement {
  return (
    <View style={styles.screen}>
      <Skeleton label="Checking your sign-in" lines={['60%', '100%', '84%', '100%']} />
      <Button label="Emergency? Call 112" variant="danger" fullWidth onPress={() => void Linking.openURL('tel:112')} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', gap: space.s32, padding: space.gutterPhone, backgroundColor: color.canvas },
});
