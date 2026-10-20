import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { StateScreen } from '@/design-system';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

export interface OfflineLinks {
  openEmergencyCard: () => void;
  openPass: () => void;
  openCrisis: () => void;
}

/**
 * The offline state of a phone list board (canvas LabResults / OrderHistory
 * "Offline"): ordering and booking need a connection, so the board says so,
 * offers Retry, and lists what still works without one — the emergency card,
 * the check-in pass and the crisis numbers.
 */
export function OfflineBoard({ links, onRetry, testID = 'offline-board' }: { links: OfflineLinks; onRetry: () => void; testID?: string }) {
  const t = useT();
  const rows: { key: string; label: MessageKey; onPress: () => void }[] = [
    { key: 'card', label: 'phone.offline.emergencyCard', onPress: links.openEmergencyCard },
    { key: 'pass', label: 'phone.offline.pass', onPress: links.openPass },
    { key: 'crisis', label: 'phone.offline.crisis', onPress: links.openCrisis },
  ];
  return (
    <View style={styles.wrap} testID={testID}>
      <StateScreen kind="offline" chip={t('phone.offline.chip')} title={t('phone.offline.title')} body={t('phone.offline.body')}
        primary={{ label: t('common.tryAgain'), onPress: onRetry, testID: 'offline-retry' }} />
      <View style={styles.still}>
        <Text accessibilityRole="header" style={styles.eyebrow}>{t('phone.offline.stillWorks')}</Text>
        {rows.map((r) => (
          <Pressable key={r.key} role="link" accessibilityRole="link" accessibilityLabel={t(r.label)} onPress={r.onPress}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.row, focused ? focusRing : null]}>
            <Icon name="check" size={16} color={color.positive} />
            <Text style={styles.rowText}>{t(r.label)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.s14 },
  still: { gap: space.s4, padding: space.s14, borderRadius: radius.xl, backgroundColor: color.surface, borderWidth: 1, borderColor: color.ruleSoft },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase', color: color.text2 },
  row: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  rowText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text },
});
