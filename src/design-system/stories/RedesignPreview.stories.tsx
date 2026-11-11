import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
import { LanguageProvider } from '@/i18n';
import { M2HomePreview } from '@/features/redesignPreview/M2HomePreview';
import { M2MedicineInfoPreview } from '@/features/redesignPreview/M2MedicineInfoPreview';
import { LabComparePreview } from '@/features/redesignPreview/LabComparePreview';
import { LabPrepPreview } from '@/features/redesignPreview/LabPrepPreview';
import { M2ConsultsPreview } from '@/features/redesignPreview/M2ConsultsPreview';
import { M2VaccinesPreview } from '@/features/redesignPreview/M2VaccinesPreview';
import { M2InsurancePreview } from '@/features/redesignPreview/M2InsurancePreview';
import { M2OrdersPreview } from '@/features/redesignPreview/M2OrdersPreview';
import { M2CampsPreview } from '@/features/redesignPreview/M2CampsPreview';
import { M2RefillsPreview } from '@/features/redesignPreview/M2RefillsPreview';
import { M2FindCarePreview } from '@/features/redesignPreview/M2FindCarePreview';
import { M2ProfilePreview } from '@/features/redesignPreview/M2ProfilePreview';
import { M2LabsPreview } from '@/features/redesignPreview/M2LabsPreview';
import { M2AskAyushPreview } from '@/features/redesignPreview/M2AskAyushPreview';
import { M2FacilityDetailPreview } from '@/features/redesignPreview/M2FacilityDetailPreview';
import { M2InsightsPreview } from '@/features/redesignPreview/M2InsightsPreview';
import { M2MedicinesPreview } from '@/features/redesignPreview/M2MedicinesPreview';
import { M2ProductPreview } from '@/features/redesignPreview/M2ProductPreview';
import { M2RemindersPreview } from '@/features/redesignPreview/M2RemindersPreview';
import { M2ReorderPreview } from '@/features/redesignPreview/M2ReorderPreview';
import { M2ReportUploadPreview } from '@/features/redesignPreview/M2ReportUploadPreview';
import { M2StepsPreview } from '@/features/redesignPreview/M2StepsPreview';
import { M2TrendsPreview } from '@/features/redesignPreview/M2TrendsPreview';
import { M2WaterPreview } from '@/features/redesignPreview/M2WaterPreview';
import { M2WhatsNewPreview } from '@/features/redesignPreview/M2WhatsNewPreview';
import { DoctorComparePreview } from '@/features/redesignPreview/DoctorComparePreview';
import { ReferFriendPreview } from '@/features/redesignPreview/ReferFriendPreview';
import { WebDashboardPreview } from '@/features/redesignPreview/WebDashboardPreview';
import { WebShopPreview } from '@/features/redesignPreview/WebShopPreview';
import { WebProductPreview } from '@/features/redesignPreview/WebProductPreview';
import { WebCheckoutPreview } from '@/features/redesignPreview/WebCheckoutPreview';
import { WebOrdersPreview } from '@/features/redesignPreview/WebOrdersPreview';
import { WebReorderPreview } from '@/features/redesignPreview/WebReorderPreview';
import { WebGuardianApprovePreview } from '@/features/redesignPreview/WebGuardianApprovePreview';
import { WebGuardianConsentPreview } from '@/features/redesignPreview/WebGuardianConsentPreview';
import { WebReportAssistantPreview } from '@/features/redesignPreview/WebReportAssistantPreview';
import { M2FamilyCirclePreview } from '@/features/redesignPreview/M2FamilyCirclePreview';
import { DevicesPreview } from '@/features/redesignPreview/DevicesPreview';
import { TeleconsultPreview } from '@/features/redesignPreview/TeleconsultPreview';
import { VitalTrendsPreview } from '@/features/redesignPreview/VitalTrendsPreview';
import { InsurancePlanBuilderPreview } from '@/features/redesignPreview/InsurancePlanBuilderPreview';
import { PaymentRetrySheetPreview } from '@/features/redesignPreview/PaymentRetrySheetPreview';
import { AISkinScanPreview } from '@/features/redesignPreview/AISkinScanPreview';
import { SecondOpinionPreview } from '@/features/redesignPreview/SecondOpinionPreview';
import { LabPackageDetailPreview } from '@/features/redesignPreview/LabPackageDetailPreview';
import { LabPackageSelectionPreview } from '@/features/redesignPreview/LabPackageSelectionPreview';
import { CarePlanBenefitsPreview } from '@/features/redesignPreview/CarePlanBenefitsPreview';
import { HomeCollectionStatusPreview } from '@/features/redesignPreview/HomeCollectionStatusPreview';
import { AskAyushOrderCardPreview } from '@/features/redesignPreview/AskAyushOrderCardPreview';
import { CategoryBrowsePreview } from '@/features/redesignPreview/CategoryBrowsePreview';
import { DoctorBrowsePreview } from '@/features/redesignPreview/DoctorBrowsePreview';
import { CommerceExtrasPreview } from '@/features/redesignPreview/CommerceExtrasPreview';
import { WebLabPackageSelectionPreview } from '@/features/redesignPreview/WebLabPackageSelectionPreview';
import { WebLabPackageDetailPreview } from '@/features/redesignPreview/WebLabPackageDetailPreview';
import { WebInsurancePlanBuilderPreview } from '@/features/redesignPreview/WebInsurancePlanBuilderPreview';
import { WebDoctorBrowsePreview } from '@/features/redesignPreview/WebDoctorBrowsePreview';
import { WebCommerceExtrasPreview } from '@/features/redesignPreview/WebCommerceExtrasPreview';
import { WebCategoryBrowsePreview } from '@/features/redesignPreview/WebCategoryBrowsePreview';
import { WebCarePlanBenefitsPreview } from '@/features/redesignPreview/WebCarePlanBenefitsPreview';
import { WebSecondOpinionPreview } from '@/features/redesignPreview/WebSecondOpinionPreview';
import { PaymentFailureScreenPreview } from '@/features/redesignPreview/PaymentFailureScreenPreview';
import { InlineAyushSuggestionPreview } from '@/features/redesignPreview/InlineAyushSuggestionPreview';
import { PhysiotherapyAtHomeLandingPreview } from '@/features/redesignPreview/PhysiotherapyAtHomeLandingPreview';
import { HealthPlansMarketplacePreview } from '@/features/redesignPreview/HealthPlansMarketplacePreview';

/**
 * Flat, non-functional previews of the 4 screens in
 * https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2 ("Student Kare —
 * 1mg-inspired screens"), for review before any of it is wired up for real.
 * Built entirely alongside the real screens — nothing here replaces or
 * edits M2Home, M2MedicineInfo, M2Labs, LabPackages or LabCollection.
 * See src/features/redesignPreview/NOTES.md for what each screen maps to,
 * where it doesn't, and every icon substitution made.
 */
const meta = {
  title: 'Redesign preview (for review)/1mg-inspired screens',
  decorators: [(Story, context) => {
    const lang = context.parameters.language === 'te' ? 'te' : context.parameters.language === 'hi' ? 'hi' : 'en';
    return <LanguageProvider initial={lang} key={lang}><Story /></LanguageProvider>;
  }],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = { render: () => <View><M2HomePreview /></View> };
export const MedicineInfo: Story = { render: () => <View><M2MedicineInfoPreview /></View> };
export const MedicineInfoTelugu: Story = { ...MedicineInfo, parameters: { language: 'te' } };
export const MedicineInfoHindi: Story = { ...MedicineInfo, parameters: { language: 'hi' } };
export const LabCompare: Story = { render: () => <View><LabComparePreview /></View> };
export const LabPrep: Story = { render: () => <View><LabPrepPreview /></View> };

/**
 * The 8 screens Krishna asked (2026-11-05) to extend the same visual
 * language to, beyond the canvas's original 4 — reached from the new Home
 * grid / bottom nav. No canvas mockup exists for these; each is built from
 * its own real brief (design/screens/briefs/*.md). See NOTES.md for Tier
 * status per screen.
 */
export const Consults: Story = { render: () => <View><M2ConsultsPreview /></View> };
export const Vaccines: Story = { render: () => <View><M2VaccinesPreview /></View> };
export const Insurance: Story = { render: () => <View><M2InsurancePreview /></View> };
export const Orders: Story = { render: () => <View><M2OrdersPreview /></View> };
export const Camps: Story = { render: () => <View><M2CampsPreview /></View> };
export const Refills: Story = { render: () => <View><M2RefillsPreview /></View> };
export const FindCare: Story = { render: () => <View><M2FindCarePreview /></View> };
export const FindCareTelugu: Story = { ...FindCare, parameters: { language: 'te' } };
export const FindCareHindi: Story = { ...FindCare, parameters: { language: 'hi' } };
export const Profile: Story = { render: () => <View><M2ProfilePreview /></View> };

/**
 * The 13 remaining M2 student screens (the rest of Home's grid, now fully
 * covered) + M2Labs' own package list, which only had its compare table
 * previewed before. Each built from its own real brief
 * (design/screens/briefs/*.md). See NOTES.md for Tier status per screen.
 */
export const LabsList: Story = { render: () => <View><M2LabsPreview /></View> };
export const AskAyush: Story = { render: () => <View><M2AskAyushPreview /></View> };
export const FacilityDetail: Story = { render: () => <View><M2FacilityDetailPreview /></View> };
export const Insights: Story = { render: () => <View><M2InsightsPreview /></View> };
export const Medicines: Story = { render: () => <View><M2MedicinesPreview /></View> };
export const Product: Story = { render: () => <View><M2ProductPreview /></View> };
export const Reminders: Story = { render: () => <View><M2RemindersPreview /></View> };
export const Reorder: Story = { render: () => <View><M2ReorderPreview /></View> };
export const ReportUpload: Story = { render: () => <View><M2ReportUploadPreview /></View> };
export const Steps: Story = { render: () => <View><M2StepsPreview /></View> };
export const Trends: Story = { render: () => <View><M2TrendsPreview /></View> };
export const Water: Story = { render: () => <View><M2WaterPreview /></View> };
export const WhatsNew: Story = { render: () => <View><M2WhatsNewPreview /></View> };

/**
 * Net-new concepts with no existing brief or screen at all — same caution
 * as the canvas's own LabPrep: if wanted for real, each needs its own
 * brief and ticket first. See NOTES.md.
 */
export const DoctorCompare: Story = { render: () => <View><DoctorComparePreview /></View> };
export const ReferFriend: Story = { render: () => <View><ReferFriendPreview /></View> };

/**
 * Batch 1 of the Web (signed-in student web) screens — wrapped in the real
 * `StudentWebShell`, not a hand-drawn header. See NOTES.md.
 */
export const WebDashboard: Story = { render: () => <WebDashboardPreview /> };
export const WebShop: Story = { render: () => <WebShopPreview /> };
export const WebProduct: Story = { render: () => <WebProductPreview /> };
export const WebCheckout: Story = { render: () => <WebCheckoutPreview /> };
export const WebCheckoutTelugu: Story = { ...WebCheckout, parameters: { language: 'te' } };
export const WebCheckoutHindi: Story = { ...WebCheckout, parameters: { language: 'hi' } };
export const WebOrders: Story = { render: () => <WebOrdersPreview /> };
export const WebReorder: Story = { render: () => <WebReorderPreview /> };

/**
 * Built from the real `design/screens/briefs/FamilyCircle.md` ("Care
 * circle", Tier 1) instead of inventing a family screen from the 1mg
 * reference video — that video's family-member-switcher pattern conflicts
 * with this product's 18+/student-owned-record architecture. See NOTES.md.
 */
export const FamilyCircle: Story = { render: () => <View><M2FamilyCirclePreview /></View> };

/**
 * Built from the real `design/screens/briefs/Devices.md` ("Devices &
 * readings", Tier 1) and `design/screens/briefs/Teleconsult.md`
 * (Tier 1) — the two real-brief screens Krishna asked for (2026-11-05)
 * after the "select your wearable" and "incoming call" patterns in the
 * 1mg reference video. See NOTES.md.
 */
export const Devices: Story = { render: () => <View><DevicesPreview /></View> };
export const Teleconsult: Story = { render: () => <View><TeleconsultPreview /></View> };

/**
 * `VitalTrends` ("Your readings over time", Tier 1) is the one genuine gap
 * found during the 2026-11-06 illustration-coverage pass: every other
 * screen flagged as "unbuilt" (AccountDetails, WebAccount, WebMyLabTests,
 * WebPlans, WebReportInsights, ScanVerify, WebScanVerify, VerifyIdentity,
 * WebVerify, and all 11 public marketing pages) turned out to already be
 * real, shipped screens elsewhere in the app. This one had no built
 * equivalent anywhere. See NOTES.md.
 */
export const VitalTrends: Story = { render: () => <View><VitalTrendsPreview /></View> };

/**
 * `LabPackageDetail` fills a gap found reviewing Apollo 24|7's lab-package
 * detail page against this app (2026-11-11): a social-proof badge, an
 * expandable included-tests/FAQ accordion, a doctor-recommendation card, a
 * cross-sell banner and a star-rating feedback moment, none of which
 * currently exist together on one screen here. Introduces `Accordion` and
 * `StarRating` as new shared design-system primitives. See NOTES.md.
 */
export const LabPackageDetail: Story = { render: () => <View><LabPackageDetailPreview /></View> };

/**
 * `SecondOpinion` previews a "surgery second opinion + cost estimator"
 * flow, modelled on Apollo 24|7's Surgery section, at Krishna's explicit
 * request (2026-11-11 gap-analysis pass) to see what this COULD look like.
 * UI-shape only — a real version is a NEW CLINICAL SERVICE LINE (surgical
 * referrals/second opinions), needing an explicit product +
 * clinical-governance decision (who reviews requests, what liability/
 * consent language is needed, how cost ranges are sourced) before any real
 * engineering starts — a heavier bar than the usual Tier 1 named-reviewer
 * check. See NOTES.md.
 */
export const SecondOpinion: Story = { render: () => <View><SecondOpinionPreview /></View> };

/**
 * `AISkinScanPreview` previews a camera-based AI skin-analysis flow,
 * modelled on Apollo 24|7's "Clear Steps" feature, at Krishna's explicit
 * request (2026-11-11 gap-analysis pass) to see what this COULD look like.
 * UI-shape only — no camera or AI capability is implemented or proposed
 * here. A real version is a NEW BIOMETRIC/AI-DIAGNOSTIC PRODUCT CAPABILITY
 * (camera/biometric data capture), needing its own dedicated product,
 * clinical-safety, AND privacy review before any real engineering starts —
 * a heavier bar than the usual Tier 1 named-reviewer check. See NOTES.md.
 */
export const AISkinScan: Story = { render: () => <View><AISkinScanPreview /></View> };

/**
 * Net-new concept, no existing brief: a "build and compare a plan"
 * insurance flow, filling the gap found reviewing a reference app
 * (Apollo 24|7) against this folder — `M2InsurancePreview` only shows a
 * static policy/cover screen. Reuses `M2Table` as the comparison table.
 * Needs product + compliance review before it becomes real, not just a
 * design sign-off — see the file's own caution comment and NOTES.md.
 */
export const InsurancePlanBuilder: Story = { render: () => <View><InsurancePlanBuilderPreview /></View> };

/**
 * Two still-missing reusable UI patterns on one preview screen, from the
 * same 2026-11-11 gap-analysis pass: a payment-failure/retry bottom sheet
 * (shown already open, not toggleable) over a checkout/orders context, and
 * a loyalty/coins commerce card. Commerce-only, not clinical — see the
 * file's own caution comment and NOTES.md.
 */
export const PaymentRetrySheet: Story = { render: () => <View><PaymentRetrySheetPreview /></View> };

/**
 * `LabPackageSelection` previews the package-picker/browse screen that
 * comes BEFORE `LabPackageDetail` — a grid of selectable package cards
 * plus a personalised "Recommended for you" card — modelled on Tata
 * 1mg's "Full Body Packages" and Apollo 24|7's "Lab Tests" package-list
 * screens (2026-11-11 gap-analysis pass). See NOTES.md.
 */
export const LabPackageSelection: Story = { render: () => <View><LabPackageSelectionPreview /></View> };
export const CarePlanBenefits: Story = { render: () => <View><CarePlanBenefitsPreview /></View> };

/**
 * `HomeCollectionStatus` previews a "your home sample collection is on the
 * way" status screen demonstrating 3 small card patterns from reference-app
 * videos this repo didn't have yet: a phlebotomist credentials card, a
 * testimonial card, and a compact secondary promo strip (2026-11-11
 * gap-analysis pass, round 2). See NOTES.md.
 */
export const HomeCollectionStatus: Story = { render: () => <View><HomeCollectionStatusPreview /></View> };

/**
 * `AskAyushOrderCard` previews ONE new card pattern found in a reference
 * app's AI chatbot flow ("Ask Apollo"): a chat-embedded order-summary card,
 * so the bot can render a structured order (items, address, ETA, charges)
 * inline instead of only text (2026-11-11 gap-analysis pass, round 2). This
 * is a NEW CARD TYPE for the existing Tier 1 `M2AskAyushPreview` chat
 * screen, not an edit to it — see the file's own caution comment and
 * NOTES.md for the product-decision caveat about what the AI assistant is
 * allowed to transact on a student's behalf.
 */
export const AskAyushOrderCard: Story = { render: () => <View><AskAyushOrderCardPreview /></View> };

/**
 * `CategoryBrowse` previews 3 small commerce/browse card patterns from
 * reference-app videos this repo didn't have yet: a category icon-tile
 * grid with ribbon badges, a "who are you shopping for" persona/avatar
 * chip row, and a BOGO/family-offer promo tile pair (2026-11-11
 * gap-analysis pass, round 2). The persona row is a plain visual chip
 * selector only — it is NOT the family-avatar-switcher/"Family Hub"
 * pattern this repo already rejected. See the file's own caution comment
 * and NOTES.md.
 */
export const CategoryBrowse: Story = { render: () => <View><CategoryBrowsePreview /></View> };

/**
 * `DoctorBrowse` previews a doctor-profile browsing carousel seen in
 * reference-app videos (2026-11-11 gap-analysis pass, round 3): a
 * horizontally-scrollable row of doctor cards for discovery, distinct from
 * `DoctorComparePreview`'s side-by-side table of two already-chosen
 * doctors. See the file's own caution comment and NOTES.md.
 */
export const DoctorBrowse: Story = { render: () => <View><DoctorBrowsePreview /></View> };

export const CommerceExtras: Story = { render: () => <View><CommerceExtrasPreview /></View> };

export const WebLabPackageSelection: Story = { render: () => <View><WebLabPackageSelectionPreview /></View> };
export const WebLabPackageDetail: Story = { render: () => <View><WebLabPackageDetailPreview /></View> };

export const WebInsurancePlanBuilder: Story = { render: () => <View><WebInsurancePlanBuilderPreview /></View> };
export const WebDoctorBrowse: Story = { render: () => <View><WebDoctorBrowsePreview /></View> };

/**
 * Web counterparts of `CommerceExtrasPreview` and `CategoryBrowsePreview`,
 * laid out for desktop width inside the real `StudentWebShell`
 * (2026-11-11 gap-analysis pass, round 3). See NOTES.md.
 */
export const WebCommerceExtras: Story = { render: () => <View><WebCommerceExtrasPreview /></View> };
export const WebCategoryBrowse: Story = { render: () => <View><WebCategoryBrowsePreview /></View> };

/**
 * Web counterparts of `CarePlanBenefitsPreview` and `SecondOpinionPreview`,
 * laid out for desktop width inside the real `StudentWebShell`
 * (2026-11-11 gap-analysis pass). See NOTES.md.
 */
export const WebCarePlanBenefits: Story = { render: () => <View><WebCarePlanBenefitsPreview /></View> };
export const WebSecondOpinion: Story = { render: () => <View><WebSecondOpinionPreview /></View> };
export const PaymentFailureScreen: Story = { render: () => <View><PaymentFailureScreenPreview /></View> };
export const InlineAyushSuggestion: Story = { render: () => <View><InlineAyushSuggestionPreview /></View> };
export const PhysiotherapyAtHomeLanding: Story = { render: () => <View><PhysiotherapyAtHomeLandingPreview /></View> };
export const HealthPlansMarketplace: Story = { render: () => <View><HealthPlansMarketplacePreview /></View> };

/**
 * The genuine remainder of task #65's Web* sweep. Most of the 38 briefs
 * that looked unbuilt (no `*Preview.tsx`) turned out to already be real,
 * shipped screens under `src/features/` — same lesson as Part 8's
 * illustration sweep. These 3 are the actual gaps, confirmed empty in
 * `design/screens/implementation-map.json` (`WebGuardianApprove`,
 * `WebGuardianConsent`, `WebReportAssistant`). All three are Tier 1
 * (consent / clinical-AI) — flat previews only, no reviewer sign-off
 * implied. See NOTES.md.
 */
export const WebGuardianApprove: Story = { render: () => <WebGuardianApprovePreview /> };
export const WebGuardianConsent: Story = { render: () => <WebGuardianConsentPreview /> };
export const WebReportAssistant: Story = { render: () => <WebReportAssistantPreview /> };

export const AllScreens: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 24 }}>
      <M2HomePreview />
      <M2MedicineInfoPreview />
      <LabComparePreview />
      <LabPrepPreview />
      <M2ConsultsPreview />
      <M2VaccinesPreview />
      <M2InsurancePreview />
      <M2OrdersPreview />
      <M2CampsPreview />
      <M2RefillsPreview />
      <M2FindCarePreview />
      <M2ProfilePreview />
      <M2LabsPreview />
      <M2AskAyushPreview />
      <M2FacilityDetailPreview />
      <M2InsightsPreview />
      <M2MedicinesPreview />
      <M2ProductPreview />
      <M2RemindersPreview />
      <M2ReorderPreview />
      <M2ReportUploadPreview />
      <M2StepsPreview />
      <M2TrendsPreview />
      <M2WaterPreview />
      <M2WhatsNewPreview />
      <DoctorComparePreview />
      <ReferFriendPreview />
      <WebDashboardPreview />
      <WebShopPreview />
      <WebProductPreview />
      <WebCheckoutPreview />
      <WebOrdersPreview />
      <WebReorderPreview />
      <M2FamilyCirclePreview />
      <DevicesPreview />
      <TeleconsultPreview />
      <VitalTrendsPreview />
      <LabPackageDetailPreview />
      <AISkinScanPreview />
      <SecondOpinionPreview />
      <InsurancePlanBuilderPreview />
      <PaymentRetrySheetPreview />
      <LabPackageSelectionPreview />
      <CarePlanBenefitsPreview />
      <HomeCollectionStatusPreview />
      <AskAyushOrderCardPreview />
      <CategoryBrowsePreview />
      <DoctorBrowsePreview />
      <CommerceExtrasPreview />
      <WebLabPackageSelectionPreview />
      <WebLabPackageDetailPreview />
      <WebCommerceExtrasPreview />
      <WebCategoryBrowsePreview />
      <WebInsurancePlanBuilderPreview />
      <WebDoctorBrowsePreview />
      <WebCarePlanBenefitsPreview />
      <WebSecondOpinionPreview />
      <PaymentFailureScreenPreview />
      <InlineAyushSuggestionPreview />
      <PhysiotherapyAtHomeLandingPreview />
      <HealthPlansMarketplacePreview />
      <WebGuardianApprovePreview />
      <WebGuardianConsentPreview />
      <WebReportAssistantPreview />
    </View>
  ),
};
