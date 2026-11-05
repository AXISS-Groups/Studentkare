import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { View } from 'react-native';
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
import { M2FamilyCirclePreview } from '@/features/redesignPreview/M2FamilyCirclePreview';
import { DevicesPreview } from '@/features/redesignPreview/DevicesPreview';
import { TeleconsultPreview } from '@/features/redesignPreview/TeleconsultPreview';
import { VitalTrendsPreview } from '@/features/redesignPreview/VitalTrendsPreview';

/**
 * Flat, non-functional previews of the 4 screens in
 * https://claude.ai/artifact/XV8ZhTtjc7kQmEfhyAMZP2 ("Student Kare —
 * 1mg-inspired screens"), for review before any of it is wired up for real.
 * Built entirely alongside the real screens — nothing here replaces or
 * edits M2Home, M2MedicineInfo, M2Labs, LabPackages or LabCollection.
 * See src/features/redesignPreview/NOTES.md for what each screen maps to,
 * where it doesn't, and every icon substitution made.
 */
const meta = { title: 'Redesign preview (for review)/1mg-inspired screens' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Home: Story = { render: () => <View><M2HomePreview /></View> };
export const MedicineInfo: Story = { render: () => <View><M2MedicineInfoPreview /></View> };
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
    </View>
  ),
};
