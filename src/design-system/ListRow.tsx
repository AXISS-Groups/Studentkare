import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, focusRing, font, fontWeight, size, space } from './theme';

export interface ListRowProps {
  title: string;
  detail?: string;
  /** Trailing value, e.g. a price or status. */
  value?: string;
  selected?: boolean;
  /** With an action the whole row is one 44 px button; without, it is plain content. */
  onPress?: () => void;
  /** Spoken instead of title + detail when those alone are ambiguous. */
  accessibilityLabel?: string;
  testID?: string;
}

/** List row (DESIGN.md §4: default, selected, with action). */
export function ListRow({ title, detail, value, selected = false, onPress, accessibilityLabel, testID }: ListRowProps) {
  const body = (
    <>
      <View style={styles.words}>
        <Text style={styles.title}>{title}</Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {onPress ? <Text style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">›</Text> : null}
    </>
  );
  const rowStyle = [styles.row, selected ? { backgroundColor: color.surface3 } : null];
  if (!onPress) return <View testID={testID} style={rowStyle}>{body}</View>;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, detail, value].filter(Boolean).join(', ')}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [...rowStyle, focused ? focusRing : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: size.touchTarget, flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10, paddingHorizontal: space.s4, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  words: { flex: 1, gap: space.s2 },
  title: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text },
  detail: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  value: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.clinicalValue },
  chevron: { fontSize: font.size.title, color: color.text3 },
});
