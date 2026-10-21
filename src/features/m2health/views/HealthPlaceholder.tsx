import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { M2Card, M2_BOTTOM_SPACE, m2Text } from '@/design-system/m2';
import { Icon } from '@/design-system/icons';
import { color, size, space } from '@/design-system/theme';
import { useT } from '@/i18n';

/**
 * A My health screen whose own build is not in this version of the app yet
 * (M2ReportUpload, M2Trends ship in their own update). The route exists so
 * the links to it are real; the page says plainly that it is not here yet and
 * where the student's reports already are. The frame's (or the stack's)
 * header carries the title, back and SOS.
 */
export function HealthPlaceholder({ onRecords }: { onRecords?: () => void }): React.ReactElement {
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="m2h-placeholder">
      <View style={styles.gutter}>
        <M2Card style={styles.card}>
          <Icon name="flask" size={24} color={color.text2} />
          <Text style={m2Text.cardTitle}>{t('m2.notYet')}</Text>
          <Text style={m2Text.body}>{t('m2h.placeholderBody')}</Text>
          {onRecords ? <Text accessibilityRole="link" onPress={onRecords} style={[m2Text.link, styles.link]}>{t('m2h.openRecords')}</Text> : null}
        </M2Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingTop: space.s16, paddingBottom: M2_BOTTOM_SPACE, gap: space.s16, width: '100%', maxWidth: size.phoneFrameMax, alignSelf: 'center' },
  gutter: { paddingHorizontal: space.gutterPhone },
  card: { padding: space.s16, gap: space.s8 },
  link: { minHeight: size.touchTarget, paddingTop: space.s12 },
});
