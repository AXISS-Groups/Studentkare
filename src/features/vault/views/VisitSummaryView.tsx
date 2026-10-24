import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, ErrorState, OfflineBanner, Rise, Skeleton, useOnline } from '@/design-system';
import { AnimatedIllustration, Icon } from '@/design-system/icons';
import {
  GlossTile, M2Card, M2EmptyState, M2Header, M2HeroPanel, M2Heading, M2ListRow, M2Note, M2Timeline, M2WideColumn, M2_NAV_CLEARANCE, m2Text, useM2Layout, useOwnPhoneChrome,
} from '@/design-system/m2';
import type { PressState } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { displayDate } from '@/data/types/workflowTypes';
import { useLocation, useNavigate } from '@/core/navigation';
import { VisitSummaryViewModel } from '../viewmodel/VisitSummaryViewModel';
import type { VisitSummary, VisitSummaryHeader } from '../viewmodel/VisitSummaryViewModel';

export interface VisitSummaryLinks {
  openPrescriptions: () => void;
  openAppointments: () => void;
  /** Back to the vault (the board's header). Omitted: no back button. */
  back?: () => void;
}

const SECTIONS: Array<{ field: 'subjective' | 'objective' | 'assessment' | 'plan'; label: MessageKey }> = [
  { field: 'subjective', label: 'care.visit.subjective' },
  { field: 'objective', label: 'care.visit.objective' },
  { field: 'assessment', label: 'care.visit.assessment' },
  { field: 'plan', label: 'care.visit.plan' },
];

/**
 * Visit summaries (design 2 ConsultSummary, Tier 1; Tier 1 parity plan
 * 2026-10-24 §8, design boards T1VisitSummaries / T1VisitSummariesDesktop
 * approved 24 Oct 2026): one view at both widths. The phone goes list, then detail;
 * `wide` draws the list on the left and the open summary on the right.
 *
 * What the server has, and nothing it doesn't: the signing doctor, their
 * registration number, the visit and signing times, the four parts of the note
 * verbatim and the prescriptions issued against it. The design's consult type,
 * price, plain-language rewrite, follow-up booking and star rating have no
 * data behind them, so they are not drawn (DESIGN.md §2.7). Nothing opens on
 * its own: a summary is read (and audited) only when the student picks it.
 */
export const VisitSummaryView = observer(function VisitSummaryView({ viewModel: vm, links, wide = false }: {
  viewModel: VisitSummaryViewModel;
  links: VisitSummaryLinks;
  wide?: boolean;
}) {
  const t = useT();
  const online = useOnline();
  useOwnPhoneChrome();
  const layout = useM2Layout();
  const desktop = layout === 'desktop';
  const gutter = layout === 'phone' ? styles.gutter : null;

  const header = (
    <M2Header
      backLabel={wide ? t('swt.vault.title') : t('common.back')}
      backIcon="chevron-left"
      onBack={links.back}
      eyebrow={t('care.visit.eyebrow')}
      title={vm.selectedId && !desktop ? t('care.visit.title') : t('care.visit.listTitle')}
      testID="m2-visits-header"
    />
  );
  const offline = !online ? <View style={gutter}><OfflineBanner message={t('m2v.offline')} /></View> : null;

  const listNode = (
    <View style={styles.stack} testID="visit-summary-pane">
      <M2HeroPanel
        hue="sky"
        icon="stethoscope"
        title={t('care.visit.listTitle')}
        sub={t('care.visit.listLead')}
        artNode={<AnimatedIllustration name="scene-doctor-consult" size="sm" />}
        testID="visit-summary-lead"
      />
      {vm.listPhase === 'loading' ? <Skeleton label={t('care.visit.loading')} lines={['60%', '100%', '100%']} /> : null}
      {vm.listPhase === 'failed' ? (
        <ErrorState title={t('care.visit.failedTitle')} body={t('care.visit.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      ) : null}
      {vm.listPhase === 'ready' && vm.items.length === 0 ? (
        <M2EmptyState animation="anim-file-text" hue="sky" title={t('care.visit.emptyTitle')} body={t('care.visit.emptyBody')} action={{ label: t('care.visit.emptyAction'), onPress: links.openAppointments }} testID="visit-summary-empty" />
      ) : null}
      {vm.listPhase === 'ready' && vm.items.length > 0 ? (
        <View style={styles.rows} testID="visit-summary-list">
          {vm.items.map((item) => <SummaryRow key={item.id} item={item} selected={desktop && item.id === vm.selectedId} onOpen={() => void vm.open(item.id)} />)}
        </View>
      ) : null}
    </View>
  );

  const detailNode = (
    <View style={styles.stack} testID="visit-summary-detail">
      {desktop ? null : (
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('care.visit.back')} aria-label={t('care.visit.back')} onPress={vm.close}
          style={({ focused }: PressState) => [styles.back, focused ? focusRing : null]} testID="visit-summary-back">
          <Icon name="chevron-left" size={18} color={color.action} strokeWidth={2.4} />
          <Text style={m2Text.link}>{t('care.visit.back')}</Text>
        </Pressable>
      )}
      {desktop ? <M2Heading style={m2Text.title}>{t('care.visit.title')}</M2Heading> : null}
      {vm.detailPhase === 'loading' ? <Skeleton label={t('care.visit.loadingOne')} lines={['50%', '100%', '100%', '80%']} /> : null}
      {vm.detailPhase === 'failed' && vm.selectedId ? (
        <ErrorState title={t('care.visit.failedOneTitle')} body={t('care.visit.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => { if (vm.selectedId) void vm.open(vm.selectedId); }} />
      ) : null}
      {vm.detailPhase === 'missing' ? (
        <M2EmptyState animation="anim-file" hue="sky" title={t('care.visit.missingTitle')} body={t('care.visit.missingBody')} action={desktop ? undefined : { label: t('care.visit.back'), onPress: vm.close }} testID="visit-summary-missing" />
      ) : null}
      {vm.detailPhase === 'ready' && vm.detail ? <SummaryBody summary={vm.detail} links={links} /> : null}
      {desktop && !vm.selectedId ? (
        <M2Card style={styles.pick} testID="visit-summary-pick">
          <GlossTile icon="stethoscope" hue="sky" size={44} iconSize={21} />
          <Text style={m2Text.body}>{t('care.visit.entryBody')}</Text>
        </M2Card>
      ) : null}
    </View>
  );

  let body: React.ReactNode;
  if (desktop) {
    body = (
      <View style={styles.columns}>
        <View style={styles.listCol}>{listNode}</View>
        <View style={styles.detailCol}>{detailNode}</View>
      </View>
    );
  } else {
    body = <View style={gutter}>{vm.selectedId ? detailNode : listNode}</View>;
  }

  if (wide) {
    return (
      <M2WideColumn testID="visit-summaries">
        {header}
        {offline}
        {body}
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="visit-summaries">
      {header}
      {offline}
      {body}
    </ScrollView>
  );
});

function SummaryRow({ item, selected, onOpen }: { item: VisitSummaryHeader; selected: boolean; onOpen: () => void }) {
  const t = useT();
  const name = item.doctorName || t('care.visit.doctorUnknown');
  const signed = displayDate(item.signedAt);
  const meta = [item.appointmentStart ? t('care.visit.visitOn', { date: displayDate(item.appointmentStart) }) : '', t('care.visit.signed', { date: signed })].filter(Boolean).join(' · ');
  // Named by its visible text (cardLabel: WCAG 2.5.3), never a separate spoken label.
  return <M2ListRow icon="stethoscope" hue="sky" tile="gloss" title={t('care.visit.consultWith', { name })} meta={meta} onPress={onOpen} selected={selected} testID={`visit-summary-row-${item.id}`} />;
}

function SummaryBody({ summary, links }: { summary: VisitSummary; links: VisitSummaryLinks }) {
  const t = useT();
  const name = summary.doctorName || t('care.visit.doctorUnknown');
  const meta = [
    summary.doctorRegistrationNumber ? t('care.visit.reg', { reg: summary.doctorRegistrationNumber }) : '',
    summary.appointmentStart ? t('care.visit.visitOn', { date: displayDate(summary.appointmentStart) }) : '',
  ].filter(Boolean).join(' · ');
  const written = SECTIONS.filter(({ field }) => summary[field].trim() !== '');
  return (
    <>
      <Rise index={1}>
        <M2Card style={[styles.card, styles.noteCard]} testID="visit-summary-notes">
          <View style={styles.head} testID="visit-summary-header">
            <GlossTile icon="stethoscope" hue="sky" size={46} iconSize={22} />
            <View style={styles.headText}>
              <M2Heading style={m2Text.section}>{name}</M2Heading>
              {meta ? <Text style={styles.meta}>{meta}</Text> : null}
              <View style={styles.signedRow}>
                <Icon name="check" size={14} color={color.positive} strokeWidth={3} />
                <Text style={styles.signed}>{t('care.visit.signed', { date: displayDate(summary.signedAt) })}</Text>
              </View>
            </View>
          </View>
          <View style={styles.rule} />
          <M2Heading style={m2Text.cardTitle}>{t('care.visit.doctorSaid')}</M2Heading>
          <M2Timeline
            testID="visit-summary-parts"
            items={written.map(({ field, label }) => ({ key: field, title: t(label), body: summary[field], eyebrow: true }))}
          />
        </M2Card>
      </Rise>
      <Rise index={2}>
        <M2Card style={styles.card} testID="visit-summary-rx">
          <Text style={m2Text.eyebrow}>{t('care.visit.rxEyebrow')}</Text>
          <View style={styles.rxRow}>
            <View style={styles.headText}>
              {summary.prescriptions.length ? summary.prescriptions.map((rx) => (
                <View key={rx.id} style={styles.rxItem}>
                  <Text style={styles.rxRef}>{t('care.visit.rxRef', { ref: rx.id.slice(0, 8).toUpperCase() })}</Text>
                  <Text style={m2Text.meta}>{t('care.visit.rxIssued', { date: displayDate(rx.issuedAt) })}</Text>
                </View>
              )) : <Text style={m2Text.body}>{t('care.visit.rxNone')}</Text>}
            </View>
            <Button label={t('care.visit.rxOpen')} onPress={links.openPrescriptions} variant={summary.prescriptions.length ? 'primary' : 'secondary'} icon={<Icon name="arrow-right" size={16} color={summary.prescriptions.length ? color.onAction : color.action} strokeWidth={2.4} />} />
          </View>
        </M2Card>
      </Rise>
      <M2Note tone="danger" icon="phone">{t('care.visit.safety')}</M2Note>
    </>
  );
}

/** The route: reads `?id=` (a notification links straight to one summary) and owns the view-model. */
export const VisitSummaryRoute = observer(function VisitSummaryRoute({ links, wide = false }: { links: VisitSummaryLinks; wide?: boolean }): React.ReactElement {
  const location = useLocation();
  const routerNavigate = useNavigate();
  const linkedId = new URLSearchParams(location.search).get('id');
  const [initialId] = useState(linkedId);
  const [vm] = useState(() => new VisitSummaryViewModel());
  useEffect(() => {
    void vm.load();
    if (initialId) void vm.open(initialId);
    return () => vm.dispose();
  }, [vm, initialId]);
  const selectedId = vm.selectedId;
  const wasOpen = useRef(false);
  useEffect(() => {
    // Back to the list drops the id from the address too, so a reload shows the list.
    if (wasOpen.current && !selectedId && linkedId) routerNavigate('/visit-summaries', { replace: true });
    wasOpen.current = selectedId !== null;
  }, [selectedId, linkedId, routerNavigate]);
  return <VisitSummaryView viewModel={vm} links={links} wide={wide} />;
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  gutter: { paddingHorizontal: space.gutterPhone },
  stack: { gap: space.s12 },
  rows: { gap: space.s8 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s24 },
  listCol: { width: 400 },
  detailCol: { flex: 1, minWidth: 0 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.s4, minHeight: size.touchTarget, borderRadius: radius.sm, paddingRight: space.s8 },
  card: { padding: space.s16, gap: space.s12 },
  noteCard: { borderTopWidth: 3, borderTopColor: color.serviceSkyInk },
  pick: { padding: space.s16, gap: space.s12, flexDirection: 'row', alignItems: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  headText: { flex: 1, minWidth: 0, gap: space.s2 },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.regular), color: color.text3 },
  signedRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  signed: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  rule: { height: 1, backgroundColor: color.ruleSoft },
  rxRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12, flexWrap: 'wrap' },
  rxItem: { gap: space.s2 },
  rxRef: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.clinicalValue },
});
