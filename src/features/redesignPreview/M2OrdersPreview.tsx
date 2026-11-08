import React from 'react';
import { useT } from '@/i18n';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, space } from '@/design-system/theme';
import { M2Card, M2Pill, M2Tabs, PillNav, RoundButton, m2Text } from '@/design-system/m2';
import type { M2Tab, PressState } from '@/design-system/m2';
import type { SkIconName } from '@/design-system/icons';

const noop = () => undefined;
type OrderTab = 'active' | 'past';
const TABS: readonly M2Tab<OrderTab>[] = [{ key: 'active', label: 'Active · 1' }, { key: 'past', label: 'Past' }];

/** Small item-thumbnail row, one tile per line item — the Blinkit Order
 * History pattern Krishna pointed to (2026-11-05): a row of item tiles
 * above the actions on each order card. We have no product photography in
 * this design system, so each tile is an existing `<Icon>` standing in for
 * that item, not a photo. */
function ItemThumbRow({ icons }: { icons: readonly SkIconName[] }): React.ReactElement {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow} contentContainerStyle={styles.thumbRowContent}>
      {icons.map((name, i) => (
        <View key={`${name}-${i}`} style={styles.thumbTile}><Icon name={name} size={18} color={color.text2} /></View>
      ))}
    </ScrollView>
  );
}

/**
 * Flat, non-functional 1mg-inspired preview of M2Orders. Krishna asked to
 * extend the canvas's style (2026-11-05) past its 4 screens. Content from
 * design/screens/briefs/M2Orders.md (Tier 2) — the Active tab's sample order
 * and the Past tab's three items are the exact examples the brief itself
 * lists, not invented data. Not wired, not replacing the real screen. See
 * NOTES.md.
 */
export function M2OrdersPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-m2-orders">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={m2Text.eyebrow}>{t('preview.myOrders')}</Text>
      </View>
      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Tabs label="Orders" tabs={TABS} current="active" onChange={noop} />

          <M2Card style={styles.activeCard}>
            <View style={styles.activeHead}>
              <View style={styles.riderTile}><Icon name="scooter" size={22} color={color.action} /></View>
              <View style={styles.flexShrink}>
                <Text style={styles.orderTitle}>{t('preview.cetirizineOrsAnd2More')}</Text>
                <M2Pill label="Out for delivery" tone="action" />
              </View>
            </View>
            <ItemThumbRow icons={['pill', 'droplet', 'capsule', 'flask']} />
            <Pressable role="link" accessibilityRole="link" accessibilityLabel={t('preview.needHelpWithThisOrder')} onPress={noop}
              style={({ focused }: PressState) => [styles.helpRow, focused ? focusRing : null]}>
              <Icon name="message-circle" size={18} color={color.action} />
              <Text style={styles.helpText}>{t('preview.needHelpWithThisOrder')}</Text>
              <Icon name="chevron-right" size={16} color={color.action} />
            </Pressable>
          </M2Card>

          <View>
            <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.pastPreviewOfThePastTab')}</Text>
            {[
              { title: 'Cetirizine and ORS', status: 'Delivered', actions: ['Buy again', 'Invoice'], icons: ['pill', 'droplet'] as const },
              { title: 'Complete blood count', status: 'Done', actions: ['See report'], icons: ['flask'] as const },
              { title: 'Vitamin D3 60K', status: 'Picked up', actions: ['Buy again', 'Invoice'], icons: ['med-bottle'] as const },
            ].map((item) => (
              <M2Card key={item.title} style={styles.pastCard}>
                <View style={styles.pastHead}>
                  <View style={styles.flexShrink}>
                    <Text style={styles.pastTitle}>{item.title}</Text>
                    <Text style={m2Text.meta}>{item.status}</Text>
                  </View>
                </View>
                <ItemThumbRow icons={item.icons} />
                <View style={styles.pastActions}>
                  {item.actions.map((a) => (
                    <Pressable key={a} role="button" accessibilityRole="button" accessibilityLabel={a} onPress={noop}
                      style={({ focused }: PressState) => [styles.pastBtn, focused ? focusRing : null]}>
                      {a === 'Invoice' ? <Icon name="download" size={14} color={color.action} /> : null}
                      <Text style={styles.pastBtnText}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              </M2Card>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.navBar}><PillNav current="orders" onSelect={noop} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 844, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { height: 64, paddingHorizontal: space.gutterPhone, flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s16 },
  activeCard: { gap: space.s12 },
  activeHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  riderTile: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  flexShrink: { flex: 1, minWidth: 0 },
  orderTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginBottom: space.s6 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: space.s8, paddingTop: space.s10, borderTopWidth: 1, borderTopColor: color.ruleSoft },
  helpText: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  sectionGap: { marginBottom: space.s12 },
  pastCard: { marginBottom: space.s12 },
  pastHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  pastTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  pastActions: { flexDirection: 'row', gap: space.s8, marginTop: space.s10 },
  thumbRow: { marginTop: space.s10 },
  thumbRowContent: { gap: space.s8 },
  thumbTile: { width: 36, height: 36, borderRadius: radius.md, backgroundColor: color.surface3, alignItems: 'center', justifyContent: 'center' },
  pastBtn: { flexDirection: 'row', alignItems: 'center', gap: space.s4, height: 36, paddingHorizontal: space.s12, borderRadius: radius.full, borderWidth: 1, borderColor: color.actionSoft },
  pastBtnText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  navBar: { height: 72 },
});
