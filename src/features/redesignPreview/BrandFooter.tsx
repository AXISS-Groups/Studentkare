import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '@/design-system/icons';
import { color, font, fontWeight, space } from '@/design-system/theme';

/**
 * Plain, non-promotional brand mark for the bottom of a page — Krishna
 * asked (2026-11-05) for "the StudentKare logo" near the bottom of
 * screens, after a Tata 1mg reference video showed their wordmark near
 * page footers. 1mg's version is paired with a colourful rotating ad
 * banner; this deliberately isn't — AGENTS.md rule 4 is "No advertising,"
 * so this is just the logo + name, the same way a copyright line would
 * sit at a page's end. No tagline, no promotional copy. See NOTES.md.
 */
export function BrandFooter(): React.ReactElement {
  return (
    <View style={styles.row}>
      <BrandLogo size={18} />
      <Text style={styles.text}>Student Kare</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s8 },
  text: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
});
