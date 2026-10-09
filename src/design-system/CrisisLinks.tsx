import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { color, font, space } from './theme';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

/** India's emergency number and the national mental-health helpline. Numbers and helpline names are never translated. */
const CRISIS_LINES: readonly { number: string; label: MessageKey; spoken: MessageKey }[] = [
  { number: '112', label: 'crisis.call112', spoken: 'crisis.call112Spoken' },
  { number: '14416', label: 'crisis.callTeleManas', spoken: 'crisis.callTeleManasSpoken' },
];

export interface CrisisLinksProps {
  /** Short line above the buttons, as a message key. */
  titleKey?: MessageKey;
  testID?: string;
}

/**
 * Crisis help, one tap away (DESIGN.md §2.4). Never behind a login, gate,
 * paywall or loading state, so it carries no state and makes no request.
 */
export function CrisisLinks({ titleKey = 'crisis.defaultTitle', testID }: CrisisLinksProps): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.box} testID={testID}>
      <Text style={styles.title}>{t(titleKey)}</Text>
      <View style={styles.row}>
        {CRISIS_LINES.map((line) => (
          <View key={line.number} style={styles.cell}>
            <Button
              label={t(line.label)}
              variant={line.number === '112' ? 'danger' : 'secondary'}
              accessibilityLabel={t(line.spoken)}
              fullWidth
              onPress={() => void Linking.openURL(`tel:${line.number}`)}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: space.s8 },
  title: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  cell: { flexGrow: 1, flexBasis: 160 },
});
