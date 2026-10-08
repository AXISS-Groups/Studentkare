import React from 'react';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';

/** ClinicianReferral (design page 5, Tier 3). */
export const referralsConfig: ConsoleTableConfig = {
  title: 'Referrals',
  subtitle: 'Out to tertiary care and visiting specialists',
  caption: 'Referrals you have sent, where to, and their state',
  columns: [
    { label: 'Student', width: '140px' },
    { label: 'Reason for referral' },
    { label: 'To', width: '190px' },
    { label: 'Sent', width: '140px' },
    { label: 'State', width: '150px', align: 'end' },
  ],
  footnote:
    'We take nothing on a referral. Where a student is exercising choice, the destination is theirs to pick from the listed providers — the referral carries your reason, not your preferred hospital.',
  empty: { title: 'No referrals open.', body: 'When you refer a student on, the referral and its reply appear here.' },
  unconnected: { title: 'Referrals aren’t connected yet.', body: 'Referrals you send will appear here once they are connected. Until then this page shows nothing rather than a guess.' },
  errorTitle: 'Couldn’t load referrals',
  reference: 'Ref REFERRALS · ClinicianReferral',
};

export function referralsSample(): ConsoleTableData {
  return {
    badge: { label: '1 awaiting acceptance', tone: 'action' },
    stats: [
      { value: '4', label: 'Open referrals' },
      { value: '1', label: 'Awaiting acceptance', tone: 'attention' },
      { value: '2', label: 'Seen within 14 days', tone: 'positive' },
      { value: '0', label: 'Commission taken', tone: 'positive' },
    ],
    rows: [
      { id: 'r1', cells: [strong('D-042 · NP'), cell('Hb 7.1 with no obvious source — needs GI workup'), cell('Apollo · gastroenterology', 'action'), muted('24 Sep'), pill('Accepted, 02 Oct', 'positive')] },
      { id: 'r2', cells: [strong('B-214 · KC'), cell('Persistent vitamin D deficiency despite adherence'), cell('Visiting endocrinologist · campus', 'action'), muted('22 Sep'), pill('On campus 05 Oct', 'action')] },
      { id: 'r3', cells: [strong('A-331 · RM'), cell('Recurrent chest infection, third this term'), cell('KIMS · pulmonology', 'action'), muted('18 Sep'), pill('Awaiting acceptance', 'attention')] },
      { id: 'r4', cells: [strong('C-108 · AK'), cell('Asked for a second opinion'), cell('Student choice — any listed', 'action'), muted('20 Sep'), pill('Student choosing', 'neutral')] },
    ],
  };
}

export function ClinicianReferralsScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  return <ConsoleTableScreen navId="referrals" config={referralsConfig} source={source ?? sampleInDevelopment(referralsSample)} />;
}
