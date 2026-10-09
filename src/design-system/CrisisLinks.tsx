import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { color, font, space } from './theme';

/** India's emergency number and the national mental-health helpline. */
const CRISIS_LINES = [
  { label: 'Call 112', number: '112', spoken: 'Call 112, emergency services' },
  { label: 'Call Tele-MANAS 14416', number: '14416', spoken: 'Call Tele-MANAS on 14416, mental health support, 24 hours' },
] as const;

export interface CrisisLinksProps {
  /** Short line above the buttons. */
  title?: string;
  testID?: string;
}

/**
 * Crisis help, one tap away (DESIGN.md §2.4). Never behind a login, gate,
 * paywall or loading state, so it carries no state and makes no request.
 */
export function CrisisLinks({ title = 'In danger or thinking of harming yourself?', testID }: CrisisLinksProps): React.ReactElement {
  return (
    <View style={styles.box} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.row}>
        {CRISIS_LINES.map((line) => (
          <View key={line.number} style={styles.cell}>
            <Button
              label={line.label}
              variant={line.number === '112' ? 'danger' : 'secondary'}
              accessibilityLabel={line.spoken}
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
