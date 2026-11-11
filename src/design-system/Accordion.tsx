import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Icon } from './icons';
import { color, focusRing, font, fontWeight, space } from './theme';

/**
 * A single expandable row. Several `<AccordionItem>`s stacked (or passed
 * through `Accordion`) is the pattern this repo kept hand-rolling per
 * screen — `M2ProductPreview`'s "What it is used for" rows, the FAQ
 * sections on the public Consult/LabTests landing pages — always as a
 * static, non-functional row. This one actually expands/collapses, so a
 * real screen gets the behaviour for free instead of reimplementing it.
 */
export interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  /** Uncontrolled initial state. Ignored once the row has been toggled. */
  defaultOpen?: boolean;
  testID?: string;
}

export function AccordionItem({ title, children, defaultOpen = false, testID }: AccordionItemProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View testID={testID}>
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((v) => !v)}
        style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.row, focused ? focusRing : null]}
      >
        <Text style={styles.title}>{title}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={16} color={color.text3} />
      </Pressable>
      {open ? <View style={styles.body}>{typeof children === 'string' ? <Text style={styles.bodyText}>{children}</Text> : children}</View> : null}
    </View>
  );
}

/** A stack of `AccordionItem`s with a shared top rule between rows. */
export function Accordion({ items, style, testID }: {
  items: ReadonlyArray<{ id: string; title: string; content: React.ReactNode; defaultOpen?: boolean }>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}): React.ReactElement {
  return (
    <View style={style} testID={testID}>
      {items.map((it) => (
        <AccordionItem key={it.id} title={it.title} defaultOpen={it.defaultOpen} testID={testID ? `${testID}-${it.id}` : undefined}>
          {it.content}
        </AccordionItem>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.s14, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  title: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, marginRight: space.s8 },
  body: { paddingBottom: space.s14 },
  bodyText: { fontFamily: font.family.sans, fontSize: font.size.caption + 0.5, lineHeight: (font.size.caption + 0.5) * 1.5, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
});
