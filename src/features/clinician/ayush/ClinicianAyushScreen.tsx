import React, { useMemo } from 'react';
import { useT } from '@/i18n';
import { ConsoleTableScreen } from '../shared/ConsoleTableScreen';
import { sampleInDevelopment } from '../shared/consoleTable';
import type { ConsoleTableConfig, ConsoleTableData, ConsoleTableSource } from '../shared/consoleTable';
import { cell, muted, pill, strong } from '../shared/cells';
import type { T } from '../shared/clinicalData';

/**
 * ClinicianAyush (design page 5, Tier 1, approved 2026-10-21). Alongside
 * allopathic care, never instead of it. No AYUSH consultation model exists
 * yet, so production shows the not-connected layout; the refusal rule needs a
 * named owner and a server check before this desk can be connected.
 */
export function ayushConfig(t: T): ConsoleTableConfig {
  return {
    title: t('clinAyush.title'),
    subtitle: t('clinAyush.subtitle'),
    caption: t('clinAyush.caption'),
    columns: [
      { label: t('clinAyush.col.student'), width: '140px' },
      { label: t('clinAyush.col.presenting') },
      { label: t('clinAyush.col.practitioner'), width: '170px' },
      { label: t('clinAyush.col.comanaged'), width: '150px' },
      { label: t('clinAyush.col.state'), width: '150px', align: 'end' },
    ],
    footnote: t('clinAyush.footnote'),
    empty: { title: t('clinAyush.emptyTitle'), body: t('clinAyush.emptyBody') },
    emptyIcon: 'stetho-alt--p4',
    unconnected: { title: t('clinAyush.unconnectedTitle'), body: t('clinAyush.unconnectedBody') },
    errorTitle: t('clinAyush.errorTitle'),
    reference: t('clinAyush.reference'),
    statLabels: [t('clinAyush.stat.open'), t('clinAyush.stat.comanaged'), t('clinAyush.stat.refused'), t('clinAyush.stat.replacing')],
  };
}

/* Development demo only (demoDataEnabled): the design's rows, never in production builds. */
export function ayushSample(): ConsoleTableData {
  return {
    badge: { label: '1 request refused', tone: 'danger' },
    stats: [
      { value: '3', label: 'Open consultations' },
      { value: '2', label: 'Co-managed', tone: 'positive' },
      { value: '1', label: 'Refused', tone: 'danger' },
      { value: '0', label: 'Replacing a prescription', tone: 'positive' },
    ],
    rows: [
      { id: 'y1', cells: [strong('C-108 · AK'), cell('Exam-period stress · Ayurveda'), cell('Dr. L. Sharma · BAMS', 'action'), muted('Dr. A. Reddy, informed'), pill('Open', 'positive')] },
      { id: 'y2', cells: [strong('B-119 · IS'), cell('Seasonal allergic rhinitis · Homeopathy'), cell('Dr. P. Roy · BHMS', 'action'), muted('Not co-managed'), pill('Open', 'action')] },
      { id: 'y3', cells: [strong('D-042 · NP'), cell('Menstrual pain · Yoga therapy'), cell('R. Iyer · certified', 'action'), muted('Gynaecology, informed'), pill('Open', 'positive')] },
      { id: 'y4', cells: [strong('A-331 · RM'), cell('Asked to stop inhaler and use Ayurveda only', 'danger'), muted('—'), muted('—'), pill('Refused, explained', 'danger')] },
    ],
  };
}

export function ClinicianAyushScreen({ source }: { source?: ConsoleTableSource }): React.ReactElement {
  const t = useT();
  const config = useMemo(() => ayushConfig(t), [t]);
  return <ConsoleTableScreen navId="ayush" config={config} source={source ?? sampleInDevelopment(ayushSample)} />;
}
