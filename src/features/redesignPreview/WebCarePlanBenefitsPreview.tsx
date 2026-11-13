import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useT } from '@/i18n';
import { Accordion } from '@/design-system/Accordion';
import { StatusPill } from '@/design-system';
import { StepDiagram } from '@/design-system/StepDiagram';
import { Icon } from '@/design-system/icons';
import { color, font, fontWeight, radius, space } from '@/design-system/theme';
import { GlossTile, M2Card, M2Note, m2Text } from '@/design-system/m2';
import { WebShellPreview } from './WebShellPreview';
import { BrandFooter } from './BrandFooter';

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
 * Flat, non-functional preview of WebCarePlanBenefits — the web
 * counterpart of `CarePlanBenefitsPreview.tsx`, inside the real
 * `StudentWebShell`. Part of the 2026-11-11 gap-analysis pass; no
 * `design/screens/briefs/WebCarePlanBenefits.md` exists — same net-new
 * footing as the mobile screen it mirrors, carried over verbatim: this
 * is a commerce/membership pattern (perforated coupon-style benefit
 * cards, a membership status bar, a benefits checklist) that doesn't
 * exist in this design system yet, and if this direction is wanted for
 * real it needs its own brief and ticket first, same caution as the
 * other previews in this folder. Not wired, not replacing anything. See
 * NOTES.md.
 *
 * Reuses the same pieces as the mobile screen — `StepDiagram`,
 * `Accordion`, `StatusPill`, `GlossTile`, `M2Card`, `M2Note`, `m2Text` —
 * with a wider desktop layout only: the three coupon-style benefit
 * cards sit in a row instead of a mobile stack, and the rest of the
 * sections (status bar, checklist, "how your benefits work" step
 * diagram, FAQ accordion) run the same width as the other `Web*Preview`
 * bodies.
 */
export function WebCarePlanBenefitsPreview(): React.ReactElement {
  const t = useT();
  return (
    <WebShellPreview route="rewards">
      <View style={styles.body}>
        <Text style={styles.pageTitle}>{t('preview.myCarePlan')}</Text>

        <M2Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <StatusPill tone="positive">{t('preview.activeTillDec2026')}</StatusPill>
          </View>
          <Text style={m2Text.meta}>{t('preview.yourPlanRenewsAutomaticallyUnlessYouCancelBefore')}</Text>
        </M2Card>

        <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.yourBenefits')}</Text>
        <View style={styles.ticketRow}>
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
        <View style={styles.checklist}>
          {CHECKLIST.map((item) => (
            <View key={item.id} style={styles.checklistRow}>
              <Icon name="check-circle-2" size={18} color={color.positive} />
              <Text style={styles.checklistLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.howYourBenefitsWork')}</Text>
        <M2Card style={styles.stepCard}>
          <StepDiagram steps={HOW_IT_WORKS_STEPS} />
        </M2Card>

        <M2Note tone="info" icon="clock" title={t('preview.benefitsResetEachBillingCycle')}>
          {t('preview.unusedBenefitCountsDonTCarryOverTo')}
        </M2Note>

        <Text style={[m2Text.section, styles.sectionGap]}>{t('preview.faqs')}</Text>
        <Accordion items={FAQ_ITEMS} />
        <BrandFooter />
      </View>
    </WebShellPreview>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.s24, gap: space.s12, maxWidth: 880 },
  pageTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  statusCard: { gap: space.s8 },
  statusRow: { flexDirection: 'row' },
  sectionGap: { marginTop: space.s8 },
  ticketRow: { flexDirection: 'row', gap: space.s12 },
  ticket: { flex: 1, flexDirection: 'row', borderRadius: radius.lg, backgroundColor: color.surface, overflow: 'hidden' },
  ticketStub: { width: 72, alignItems: 'center', justifyContent: 'center', paddingVertical: space.s16 },
  ticketPerforation: { width: 1, justifyContent: 'space-between', paddingVertical: space.s8 },
  perforationHole: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: color.canvas, marginLeft: -4 },
  ticketBody: { flex: 1, padding: space.s16, gap: space.s4, justifyContent: 'center' },
  ticketTitle: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  checklist: { gap: space.s2, maxWidth: 560 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10 },
  checklistLabel: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.regular), color: color.text2 },
  stepCard: { paddingVertical: space.s16 },
});
