import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Button, Card, EmptyState, ErrorState, Eyebrow, ListRow, Note, Rise, Skeleton } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { displayDate } from '@/data/types/workflowTypes';
import { useLocation, useNavigate } from '@/core/navigation';
import { VisitSummaryViewModel } from '../viewmodel/VisitSummaryViewModel';
import type { VisitSummary, VisitSummaryHeader } from '../viewmodel/VisitSummaryViewModel';

export interface VisitSummaryLinks {
  openPrescriptions: () => void;
  openAppointments: () => void;
}

const SECTIONS: Array<{ field: 'subjective' | 'objective' | 'assessment' | 'plan'; label: MessageKey }> = [
  { field: 'subjective', label: 'care.visit.subjective' },
  { field: 'objective', label: 'care.visit.objective' },
  { field: 'assessment', label: 'care.visit.assessment' },
  { field: 'plan', label: 'care.visit.plan' },
];

/**
 * Visit summaries (design 2 ConsultSummary / 3b WebConsultSummary, Tier 1).
 *
 * What the server has, and nothing it doesn't: the signing doctor, their
 * registration number, the visit and signing times, the four parts of the note
 * and the prescriptions issued against it. The design's consult type, price,
 * plain-language rewrite, follow-up booking and star rating have no data behind
 * them, so they are not drawn (DESIGN.md §2.7).
 */
export const VisitSummaryView = observer(function VisitSummaryView({
  viewModel: vm,
  links,
}: {
  viewModel: VisitSummaryViewModel;
  links: VisitSummaryLinks;
}) {
  const t = useT();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {vm.selectedId ? detail(vm, links) : list(vm, links)}
    </ScrollView>
  );

  function list(model: VisitSummaryViewModel, to: VisitSummaryLinks) {
    return (
      <>
        <Rise>
          <Eyebrow>{t('care.visit.eyebrow')}</Eyebrow>
          <Text accessibilityRole="header" style={styles.title}>{t('care.visit.listTitle')}</Text>
          <Text style={styles.lead}>{t('care.visit.listLead')}</Text>
        </Rise>
        {model.listPhase === 'loading' ? <Skeleton label={t('care.visit.loading')} lines={['60%', '100%', '100%']} /> : null}
        {model.listPhase === 'failed' ? (
          <ErrorState title={t('care.visit.failedTitle')} body={t('care.visit.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void model.load()} />
        ) : null}
        {model.listPhase === 'ready' && model.items.length === 0 ? (
          <EmptyState title={t('care.visit.emptyTitle')} body={t('care.visit.emptyBody')} action={{ label: t('care.visit.emptyAction'), onPress: to.openAppointments }} />
        ) : null}
        {model.listPhase === 'ready' && model.items.length > 0 ? (
          <Card testID="visit-summary-list">
            {model.items.map((item) => summaryRow(item, () => void model.open(item.id)))}
          </Card>
        ) : null}
      </>
    );
  }

  function summaryRow(item: VisitSummaryHeader, onOpen: () => void) {
    const name = item.doctorName || t('care.visit.doctorUnknown');
    const signed = displayDate(item.signedAt);
    const detail = [
      item.appointmentStart ? t('care.visit.visitOn', { date: displayDate(item.appointmentStart) }) : '',
      t('care.visit.signed', { date: signed }),
    ].filter(Boolean).join(' · ');
    return (
      <ListRow
        key={item.id}
        title={t('care.visit.consultWith', { name })}
        detail={detail}
        onPress={onOpen}
        accessibilityLabel={t('care.visit.openSpoken', { name, date: signed })}
      />
    );
  }

  function detail(model: VisitSummaryViewModel, to: VisitSummaryLinks) {
    return (
      <>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('care.visit.back')}
          onPress={model.close}
          style={({ focused }) => [styles.back, focused ? focusRing : null]}
        >
          <Icon name="chevron-left" size={18} color={color.action} />
          <Text style={styles.backText}>{t('care.visit.back')}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>{t('care.visit.title')}</Text>
        {model.detailPhase === 'loading' ? <Skeleton label={t('care.visit.loadingOne')} lines={['50%', '100%', '100%', '80%']} /> : null}
        {model.detailPhase === 'failed' && model.selectedId ? (
          <ErrorState title={t('care.visit.failedOneTitle')} body={t('care.visit.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => { if (model.selectedId) void model.open(model.selectedId); }} />
        ) : null}
        {model.detailPhase === 'missing' ? (
          <EmptyState title={t('care.visit.missingTitle')} body={t('care.visit.missingBody')} action={{ label: t('care.visit.back'), onPress: model.close }} />
        ) : null}
        {model.detailPhase === 'ready' && model.detail ? summaryBody(model.detail, to) : null}
      </>
    );
  }

  function summaryBody(summary: VisitSummary, to: VisitSummaryLinks) {
    const name = summary.doctorName || t('care.visit.doctorUnknown');
    const meta = [
      summary.appointmentStart ? t('care.visit.visitOn', { date: displayDate(summary.appointmentStart) }) : '',
      summary.doctorRegistrationNumber ? t('care.visit.reg', { reg: summary.doctorRegistrationNumber }) : '',
    ].filter(Boolean).join(' · ');
    const written = SECTIONS.filter(({ field }) => summary[field].trim() !== '');
    return (
      <View style={styles.columns}>
        <View style={styles.column}>
          <Rise index={1}>
            <Card testID="visit-summary-header">
              <View style={styles.head}>
                <View style={styles.tick}><Icon name="check" size={26} color={color.onAction} strokeWidth={3} /></View>
                <View style={styles.headText}>
                  <Text accessibilityRole="header" style={styles.cardTitle}>{t('care.visit.consultWith', { name })}</Text>
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                  <View style={styles.signedRow}>
                    <Icon name="check" size={14} color={color.positive} />
                    <Text style={styles.signed}>{t('care.visit.signed', { date: displayDate(summary.signedAt) })}</Text>
                  </View>
                </View>
              </View>
            </Card>
          </Rise>
          <Rise index={2}>
            <Card testID="visit-summary-notes">
              <Eyebrow>{t('care.visit.doctorSaid')}</Eyebrow>
              {written.map(({ field, label }) => (
                <View key={field} style={styles.section}>
                  <Text style={styles.sectionLabel}>{t(label)}</Text>
                  <Text style={styles.body}>{summary[field]}</Text>
                </View>
              ))}
            </Card>
          </Rise>
        </View>
        <View style={styles.column}>
          <Rise index={3}>
            <Card testID="visit-summary-rx">
              <Eyebrow>{t('care.visit.rxEyebrow')}</Eyebrow>
              {summary.prescriptions.length ? summary.prescriptions.map((rx) => (
                <View key={rx.id} style={styles.rxRow}>
                  <Text style={styles.rxRef}>{t('care.visit.rxRef', { ref: rx.id.slice(0, 8).toUpperCase() })}</Text>
                  <Text style={styles.meta}>{t('care.visit.rxIssued', { date: displayDate(rx.issuedAt) })}</Text>
                </View>
              )) : <Text style={styles.body}>{t('care.visit.rxNone')}</Text>}
              <Button label={t('care.visit.rxOpen')} onPress={to.openPrescriptions} variant={summary.prescriptions.length ? 'primary' : 'secondary'} />
            </Card>
          </Rise>
          <Note tone="info">{t('care.visit.safety')}</Note>
        </View>
      </View>
    );
  }
});

/** The route: reads `?id=` (a notification links straight to one summary) and owns the view-model. */
export const VisitSummaryRoute = observer(function VisitSummaryRoute({ links }: { links: VisitSummaryLinks }): React.ReactElement {
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
  return <VisitSummaryView viewModel={vm} links={links} />;
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 1120 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  lead: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, marginTop: space.s4 },
  back: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.s4, minHeight: size.touchTarget, borderRadius: radius.sm, paddingRight: space.s8 },
  backText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.action },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16, alignItems: 'flex-start' },
  column: { flexGrow: 1, flexBasis: 320, minWidth: 0, gap: space.s16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s14 },
  tick: { width: 56, height: 56, borderRadius: radius.full, backgroundColor: color.positiveFill, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0, gap: space.s2 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  meta: { fontFamily: font.family.mono, fontSize: font.size.caption, color: color.text2 },
  signedRow: { flexDirection: 'row', alignItems: 'center', gap: space.s4 },
  signed: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.positive },
  section: { gap: space.s4, marginTop: space.s12 },
  sectionLabel: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text, lineHeight: font.size.body * font.lineHeight.body },
  rxRow: { gap: space.s2, marginVertical: space.s8 },
  rxRef: { fontFamily: font.family.mono, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.clinicalValue },
});
