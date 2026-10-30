import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { color, space } from '../theme';
import { M2WideColumn } from './m2Layout';
import { M2_NAV_CLEARANCE } from './PillNav';

/**
 * A board's container at either width: `wide` draws it in `M2WideColumn`
 * (the desktop web shell's page column), otherwise as the phone's own scroll
 * view. The board's body sits inside, so `useM2Layout()` in the body sees the
 * width the board really has (a hook read beside the container would see the
 * outer, phone, context).
 */
export function M2Screen({ wide = false, children, testID }: { wide?: boolean; children: React.ReactNode; testID?: string }) {
  if (wide) return <M2WideColumn testID={testID}>{children}</M2WideColumn>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID={testID}>{children}</ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
});
