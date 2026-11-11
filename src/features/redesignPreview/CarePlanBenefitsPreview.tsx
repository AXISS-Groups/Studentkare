import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Accordion } from '@/design-system/Accordion';
import { StatusPill } from '@/design-system';
import { StepDiagram } from '@/design-system/StepDiagram';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, RoundButton, m2Text } from '@/design-system/m2';

const noop = () => undefined;

const TICKETS: ReadonlyArray<{ id: string; title: string; usage: string; icon: 'percent' | 'shield-check' }> = [
  { id: 'lab-discount', title: '[20% off next lab test]', usage: '[Used 2 of 5 times]', icon: 'percent' },
  { id: 'home-collection', title: '[Free home sample collection]', usage: '[Used 0 of 3 times]', icon: 'shield-check' },
  { id: 'priority-support', title: '[Priority support]', usage: '[Used 4 of unlimited times]', icon: 'shield-check' },
];

const CHECKLIST: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'activate', label: '[Activate your plan from the welcome email]' },
  { id: 'show-id', label: '[Show your membership ID at checkout]' },
  { id: 'claim-discount', label: '[Claim your discount automatically on eligible orders]' },
  { id: 'track', label: '[Track savings from the My Care Plan screen]' },
  { id: 'renew', label: '[Renew before Dec 2026 to keep your benefits]' },
];

const HOW_IT_WORKS_STEPS: ReadonlyArray<{ title: string; description?: string }> = [
  { title: '[1. Activate your plan]', description: '[Confirm your membership from the welcome email or this screen.]' },
  { title: '[2. Use your benefits at checkout]', description: '[Eligible discounts and perks apply automatically on supported orders.]' },
  { title: '[3. Track savings in one place]', description: '[See every benefit used and what’s left, right here.]' },
];

const FAQ_ITEMS: ReadonlyArray<{ id: string; title: string; content: string }> = [
  { id: 'eligible-orders', title: '[Which orders are eligible for these benefits?]', content: '[A plain-language list of what this plan covers and what it doesn’t, as stated by the plan terms.]' },
  { id: 'renewal', title: '[What happens if I don’t renew by Dec 2026?]', content: '[What changes for an expired plan — which benefits stop and which (if any) carry over.]' },
];

/**
 * Flat, non-functional preview of a membership/benefits screen, modelled on
 * a reference app's "My Care Plan" section: a perforated coupon-style
 * benefit card, a membership status bar, and a benefits checklist — none
 * of which exist in this design system yet. There is no existing brief or
 * screen for this; it's a commerce/membership pattern this canvas didn't
 * cover. If this direction is wanted for real, it needs its own brief and
 * ticket first, same caution as the other previews in this folder. Not
 * wired, not replacing anything. See NOTES.md.
 */
export function CarePlanBenefitsPreview(): React.ReactElement {
  const t = useT();
  return (
    <View style={styles.screen} testID="preview-care-plan-benefits">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label="Back" onPress={noop} />
        <Text style={styles.headerTitle}>{t('preview.myCarePlan')}</Text>
      </View>

      <View style={styles.scroll}>
        <View style={styles.body}>
          <M2Card style={styles.statusCard} testID="preview-care-plan-status">
            <View style={styles.statusRow}>
              <StatusPill tone="positive">{t('preview.activeTillDec2026')}</StatusPill>
            </View>
            <Text style={m2Text.meta}>{t('preview.yourPlanRenewsAutomaticallyUnlessYouCancelBefore')}</Text>
          </M2Card>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.yourBenefits')}</Text>
          <View style={styles.ticketRow} testID="preview-care-plan-tickets">
            {TICKETS.map((ticket) => (
              <View key={ticket.id} style={styles.ticket}>
                <View style={styles.ticketStub}>
                  <GlossTile icon={ticket.icon} hue="indigo" size={40} />
                </View>
                <View style={styles.ticketPerforation}>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <View key={i} style={styles.perforationHole} />
                  ))}
                </View>
                <View style={styles.ticketBody}>
                  <Text style={styles.ticketTitle}>{ticket.title}</Text>
                  <Text style={m2Text.meta}>{ticket.usage}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.useYourBenefits')}</Text>
          <View style={styles.checklist} testID="preview-care-plan-checklist">
            {CHECKLIST.map((item) => (
              <View key={item.id} style={styles.checklistRow}>
                <Icon name="check-circle-2" size={18} color={color.positive} />
                <Text style={styles.checklistLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.howYourBenefitsWork')}</Text>
          <M2Card style={styles.stepCard} testID="preview-care-plan-how-it-works">
            <StepDiagram steps={HOW_IT_WORKS_STEPS} testID="preview-care-plan-step-diagram" />
          </M2Card>

          <M2Note tone="info" icon="clock" title={t('preview.benefitsResetEachBillingCycle')}>
            {t('preview.unusedBenefitCountsDonTCarryOverTo')}
          </M2Note>

          <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.faqs')}</Text>
          <Accordion items={FAQ_ITEMS} testID="preview-care-plan-faq" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: 390, height: 1480, backgroundColor: color.canvas, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  headerTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  scroll: { flex: 1 },
  body: { padding: space.gutterPhone, gap: space.s12 },
  statusCard: { gap: space.s8 },
  statusRow: { flexDirection: 'row' },
  sectionGap: { marginTop: space.s8 },
  ticketRow: { gap: space.s12 },
  ticket: { flexDirection: 'row', borderRadius: radius.lg, backgroundColor: color.surface, overflow: 'hidden' },
  ticketStub: { width: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: space.s16 },
  ticketPerforation: { width: 1, justifyContent: 'space-between', paddingVertical: space.s8 },
  perforationHole: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.canvas, marginLeft: -4 },
  ticketBody: { flex: 1, padding: space.s16, gap: space.s4, justifyContent: 'center' },
  ticketTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  checklist: { gap: space.s2 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10 },
  checklistLabel: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  stepCard: { paddingVertical: space.s16 },
});
