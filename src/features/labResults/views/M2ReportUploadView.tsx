import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Icon } from '@/design-system/icons';
import type { SkIconName } from '@/design-system/icons';
import { Banner, Button, ErrorState, OfflineBanner, Rise, Skeleton, TextField } from '@/design-system';
import {
  Gradient, LiftCard, M2Card, M2Heading, M2_NAV_CLEARANCE, RoundButton, heroStops, m2Text, tileStops, useOwnPhoneChrome, webAttrs,
  M2HeaderSos,
} from '@/design-system/m2';
import type { PressState, ServiceHue } from '@/design-system/m2';
import { color, focusRing, font, fontWeight, radius, shadow, shadowStyle, size, space } from '@/design-system/theme';
import { useLanguage, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import type { CheckRow, RowProblem } from '../viewmodel/labValueModels';
import type { ReportCheckViewModel } from '../viewmodel/LabValuesViewModels';
import type { ReleasedLabReport, ReportUploadViewModel } from '../viewmodel/ReportUploadViewModel';
import { dateLocale, fullDate, fullDateFromEpoch } from '../viewmodel/trendScreenModels';

/**
 * Mobile 2.0 Add a lab report (canvas page 9 M2ReportUpload, Tier 1; plan
 * docs/plans/tier1-mobile2-health-2026-10-21.md, approved 2026-10-21), web
 * phone frame and Expo.
 *
 * Add · Check · Saved (D-M2-12). The board's Read step ("Reading your
 * report…", scanning line, progress) is not drawn: there is no value reader,
 * and nothing animates work that is not happening. On Check the student types
 * each value from the report; every row starts unticked and only ticked rows
 * are saved, all or nothing (the server's confirm). Saved shows the server's
 * counts, a plain tick (no pulsing ring), "Ask a doctor to explain it" (a
 * review request for this report) and "See my trends".
 *
 * Range chips appear only once the server has saved a value: whether a value
 * is inside its range is the server's `rangeState`, never worked out here.
 */
export interface M2ReportUploadLinks {
  back: () => void;
  trends: () => void;
}

/** A source this device can use, or null when it cannot (shown as not available, not as a button). */
export interface ReportSources {
  photo: (() => void) | null;
  pdf: (() => void) | null;
}

export interface M2ReportUploadViewProps {
  vm: ReportUploadViewModel;
  sources: ReportSources;
  online: boolean;
  links: M2ReportUploadLinks;
}

const STEPS: readonly MessageKey[] = ['m2v.up.stepAdd', 'm2v.up.stepCheck', 'm2v.up.stepSaved'];

const PROBLEM_KEYS: Record<RowProblem, MessageKey> = {
  testName: 'm2v.up.problem.testName',
  value: 'm2v.up.problem.value',
  unit: 'm2v.up.problem.unit',
  range: 'm2v.up.problem.range',
  tooLarge: 'm2v.up.problem.tooLarge',
};

function StepBar({ stage }: { stage: number }) {
  const t = useT();
  const spoken = t('m2v.up.stepSpoken', { n: stage + 1, total: STEPS.length, step: t(STEPS[stage] ?? 'm2v.up.stepAdd') });
  return (
    <View style={styles.stepper} accessible accessibilityLabel={spoken} aria-label={spoken} role="img" testID="m2-upload-stepper">
      {STEPS.map((key, i) => (
        <View key={key} style={styles.stepCell}>
          <View style={styles.stepTrack}><View style={[styles.stepFill, i <= stage ? styles.stepFillOn : null]} /></View>
          <Text style={[styles.stepLabel, i <= stage ? styles.stepLabelOn : null]}>{t(key)}</Text>
        </View>
      ))}
    </View>
  );
}

function ReportSheetArt() {
  const lines: { w: `${number}%`; c: string }[] = [
    { w: '62%', c: color.serviceOrangeSoft }, { w: '86%', c: color.ruleSoft }, { w: '74%', c: color.ruleSoft },
    { w: '80%', c: color.serviceAmber }, { w: '70%', c: color.ruleSoft }, { w: '50%', c: color.serviceGreenSoft },
  ];
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.sheetArt}>
      {lines.map((l, i) => <View key={i} style={[styles.sheetLine, { width: l.w, backgroundColor: l.c }]} />)}
    </View>
  );
}

function SourceRow({ icon, hue, title, sub, onPress, unavailable, testID }: {
  icon: SkIconName; hue: ServiceHue; title: string; sub: string; onPress: (() => void) | null; unavailable: string; testID: string;
}) {
  const tile = (
    <Gradient colors={tileStops(hue)} angle={150} gloss style={styles.sourceTile}>
      <Icon name={icon} size={22} color={color.onHero} strokeWidth={2.2} />
    </Gradient>
  );
  if (!onPress) {
    return (
      <View style={[styles.source, styles.sourceOff]} accessible accessibilityLabel={`${title}. ${unavailable}`} aria-label={`${title}. ${unavailable}`} testID={testID}>
        {tile}
        <View style={styles.grow}>
          <Text style={m2Text.cardTitle}>{title}</Text>
          <Text style={m2Text.meta}>{unavailable}</Text>
        </View>
      </View>
    );
  }
  return (
    <LiftCard label={`${title}. ${sub}`} role="button" onPress={onPress} testID={testID} style={styles.source}>
      {tile}
      <View style={styles.grow}>
        <Text style={m2Text.cardTitle}>{title}</Text>
        <Text style={m2Text.meta}>{sub}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={color.action} strokeWidth={2.6} />
    </LiftCard>
  );
}

const AddStep = observer(function AddStep({ vm, sources, online }: { vm: ReportUploadViewModel; sources: ReportSources; online: boolean }) {
  const t = useT();
  const offline = t('m2v.up.needsConnection');
  return (
    <>
      <Rise index={1} style={styles.gutter}>
        <Gradient colors={heroStops('orange')} angle={150} style={styles.hero} testID="m2-upload-hero">
          <View pointerEvents="none" style={styles.heroRing} />
          <View style={styles.heroText}>
            <M2Heading style={styles.heroTitle}>{t('m2v.up.heroTitle')}</M2Heading>
            <Text style={styles.heroBody}>{t('m2v.up.heroBody')}</Text>
          </View>
          <ReportSheetArt />
        </Gradient>
      </Rise>
      <Rise index={2} style={[styles.gutter, styles.sources]}>
        <M2Heading style={m2Text.section}>{t('m2v.up.how')}</M2Heading>
        {vm.uploadFailed ? (
          <Banner tone="attention" title={t('m2v.up.uploadFailed')} announce testID="m2-upload-failed">
            {vm.uploadError || t('m2v.up.uploadFailedBody')}
          </Banner>
        ) : null}
        <SourceRow icon="camera-2" hue="orange" title={t('m2v.up.photo')} sub={t('m2v.up.photoSub')} testID="m2-upload-photo"
          onPress={online ? sources.photo : null} unavailable={online ? t('m2v.up.notOnDevice') : offline} />
        <SourceRow icon="doc-upload" hue="violet" title={t('m2v.up.pdf')} sub={t('m2v.up.pdfSub')} testID="m2-upload-pdf"
          onPress={online ? sources.pdf : null} unavailable={online ? t('m2v.up.notOnDevice') : offline} />
        <SourceRow icon="flask" hue="green" title={t('m2v.up.lab')} sub={t('m2v.up.labSub')} testID="m2-upload-lab"
          onPress={online ? () => void vm.showLabs() : null} unavailable={offline} />
        <Text style={m2Text.meta}>{t('m2v.up.formats')}</Text>
        <Text style={[m2Text.meta, styles.promise]}>{t('m2v.up.promise')}</Text>
      </Rise>
    </>
  );
});

const LabsStep = observer(function LabsStep({ vm }: { vm: ReportUploadViewModel }) {
  const t = useT();
  const locale = dateLocale(useLanguage().lang);
  const back = (
    <Button label={t('m2v.up.otherWay')} variant="secondary" onPress={vm.backToAdd} testID="m2-upload-labs-back" />
  );
  if (vm.labsPhase === 'loading' || vm.labsPhase === 'idle') {
    return <View style={styles.gutter}><Skeleton label={t('m2v.up.labsLoading')} lines={['100%', '100%']} /></View>;
  }
  if (vm.labsPhase === 'error') {
    return (
      <View style={[styles.gutter, styles.stack]}>
        <ErrorState title={t('m2v.up.labsError')} body={t('m2v.up.labsErrorBody')} retryLabel={t('m2v.retry')} onRetry={() => void vm.showLabs()} />
        {back}
      </View>
    );
  }
  return (
    <Rise index={1} style={[styles.gutter, styles.stack]} >
      <M2Heading style={m2Text.section}>{t('m2v.up.labsTitle')}</M2Heading>
      {vm.labs.length === 0 ? (
        <M2Card style={styles.pad} testID="m2-upload-labs-empty"><Text style={m2Text.body}>{t('m2v.up.labsEmpty')}</Text></M2Card>
      ) : vm.labs.map((order: ReleasedLabReport) => {
        const tests = order.testPanel.join(', ') || t('m2v.up.labReport');
        const when = fullDateFromEpoch(order.reviewedAt ?? order.updatedAt, locale);
        return (
          <LiftCard key={order.id} role="button" label={`${tests}. ${t('m2v.up.released', { date: when })}`} onPress={() => void vm.pickLab(order)}
            testID={`m2-upload-lab-${order.id}`} style={styles.source}>
            <Gradient colors={tileStops('green')} angle={150} gloss style={styles.sourceTile}>
              <Icon name="flask" size={22} color={color.onHero} strokeWidth={2.2} />
            </Gradient>
            <View style={styles.grow}>
              <Text numberOfLines={2} style={m2Text.cardTitle}>{tests}</Text>
              <Text style={m2Text.meta}>{t('m2v.up.released', { date: when })}</Text>
            </View>
            <Icon name="chevron-right" size={18} color={color.action} strokeWidth={2.6} />
          </LiftCard>
        );
      })}
      {back}
    </Rise>
  );
});

function Checkbox({ checked, label, onChange, testID }: { checked: boolean; label: string; onChange: (next: boolean) => void; testID: string }) {
  return (
    <Pressable role="checkbox" accessibilityRole="checkbox" accessibilityLabel={label} aria-label={label} aria-checked={checked}
      accessibilityState={{ checked }} onPress={() => onChange(!checked)} testID={testID}
      style={({ focused }: PressState) => [styles.checkHit, focused ? focusRing : null]}>
      <View style={[styles.checkBox, checked ? styles.checkBoxOn : null]}>
        {checked ? <Icon name="check" size={16} color={color.onAction} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  );
}

const ValueRowCard = observer(function ValueRowCard({ check, row, index }: { check: ReportCheckViewModel; row: CheckRow; index: number }) {
  const t = useT();
  const problems = check.problemsOf(row.localId);
  const touched = row.ticked || row.testName !== '' || row.value !== '';
  const name = row.testName.trim() || t('m2v.up.valueN', { n: index + 1 });
  const typed = row.testName.trim().toLowerCase();
  const suggestions = row.testCode === null && typed.length >= 2
    ? check.reference.filter((r) => r.displayName.toLowerCase().includes(typed) && r.displayName.toLowerCase() !== typed).slice(0, 4)
    : [];
  return (
    <M2Card style={[styles.rowCard, row.ticked ? styles.rowCardOn : null]} testID={`m2-upload-row-${index}`}>
      <View style={styles.rowHead}>
        <Checkbox checked={row.ticked} label={t('m2v.up.tick', { name })} onChange={(v) => check.setTicked(row.localId, v)} testID={`m2-upload-tick-${index}`} />
        <Text style={[m2Text.cardTitle, styles.grow]} numberOfLines={1}>{name}</Text>
        <Pressable role="button" accessibilityRole="button" accessibilityLabel={t('m2v.up.remove', { name })} aria-label={t('m2v.up.remove', { name })}
          onPress={() => check.removeRow(row.localId)} testID={`m2-upload-remove-${index}`}
          style={({ focused }: PressState) => [styles.removeHit, focused ? focusRing : null]}>
          <Text style={m2Text.link}>{t('m2v.up.removeShort')}</Text>
        </Pressable>
      </View>
      <TextField label={t('m2v.up.test')} value={row.testName} maxLength={120} testID={`m2-upload-test-${index}`}
        onChangeText={(v) => check.updateRow(row.localId, { testName: v, testCode: null })} />
      {suggestions.length > 0 ? (
        <View style={styles.suggestions} {...webAttrs({ role: 'group', 'aria-label': t('m2v.up.fromList') })}>
          {suggestions.map((r) => (
            <Pressable key={r.code} role="button" accessibilityRole="button" accessibilityLabel={t('m2v.up.useTest', { name: r.displayName })}
              aria-label={t('m2v.up.useTest', { name: r.displayName })} onPress={() => check.chooseTest(row.localId, r.code)}
              style={({ focused }: PressState) => [styles.suggestion, focused ? focusRing : null]}>
              <Text style={styles.suggestionText}>{r.displayName}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.pair}>
        <View style={styles.grow}>
          <TextField label={t('m2v.up.value')} value={row.value} mono maxLength={60} hint={t('m2v.up.valueHint')} testID={`m2-upload-value-${index}`}
            onChangeText={(v) => check.updateRow(row.localId, { value: v })} />
        </View>
        <View style={styles.unitCol}>
          <TextField label={t('m2v.up.unit')} value={row.unit} maxLength={40} testID={`m2-upload-unit-${index}`}
            onChangeText={(v) => check.updateRow(row.localId, { unit: v })} />
        </View>
      </View>
      <View style={styles.pair}>
        <View style={styles.grow}>
          <TextField label={t('m2v.up.low')} value={row.refLow} mono keyboardType="numeric" maxLength={20} testID={`m2-upload-low-${index}`}
            onChangeText={(v) => check.updateRow(row.localId, { refLow: v })} />
        </View>
        <View style={styles.grow}>
          <TextField label={t('m2v.up.high')} value={row.refHigh} mono keyboardType="numeric" maxLength={20} testID={`m2-upload-high-${index}`}
            onChangeText={(v) => check.updateRow(row.localId, { refHigh: v })} />
        </View>
      </View>
      <TextField label={t('m2v.up.rangePrinted')} value={row.refText} maxLength={80} hint={t('m2v.up.rangePrintedHint')} testID={`m2-upload-printed-${index}`}
        onChangeText={(v) => check.updateRow(row.localId, { refText: v })} />
      {touched && problems.length > 0 ? (
        <View role="alert" accessibilityLiveRegion="polite" style={styles.problems} testID={`m2-upload-problems-${index}`}>
          {problems.map((p) => <Text key={p} style={styles.problem}>{t(PROBLEM_KEYS[p])}</Text>)}
        </View>
      ) : null}
    </M2Card>
  );
});

const CheckStep = observer(function CheckStep({ check }: { check: ReportCheckViewModel }) {
  const t = useT();
  if (check.step === 'loading') return <View style={styles.gutter}><Skeleton label={t('m2v.up.checkLoading')} lines={['70%', '100%', '100%']} /></View>;
  if (check.step === 'error') {
    return (
      <View style={styles.gutter}>
        <ErrorState title={t('m2v.up.checkError')} body={t('m2v.up.checkErrorBody')} retryLabel={t('m2v.retry')} onRetry={() => void check.load()} />
      </View>
    );
  }
  const ticked = check.tickedRows.length;
  const saving = check.step === 'saving';
  const errorTitle = check.error === 'conflict' ? t('m2v.up.conflict') : check.error === 'validation' ? t('m2v.up.refused') : t('m2v.up.saveFailed');
  return (
    <View style={[styles.gutter, styles.stack]}>
      <Rise index={1} style={styles.stackTight}>
        <M2Heading style={m2Text.section}>{t('m2v.up.checkTitle')}</M2Heading>
        <Text style={m2Text.body}>{t('m2v.up.checkBody')}</Text>
      </Rise>
      <M2Card style={[styles.pad, styles.stackTight]} testID="m2-upload-report">
        <TextField label={t('m2v.up.date')} value={check.collectedOn} mono maxLength={10} placeholder={t('m2v.up.datePlaceholder')} testID="m2-upload-date"
          hint={t('m2v.up.dateHint')} error={check.collectedOn !== '' && !check.reportDateValid ? t('m2v.up.dateInvalid') : undefined}
          onChangeText={(v) => check.setReport({ collectedOn: v })} />
        <TextField label={t('m2v.up.labName')} value={check.labName} maxLength={120} testID="m2-upload-lab-name"
          onChangeText={(v) => check.setReport({ labName: v })} />
      </M2Card>
      {check.rows.length === 0 ? (
        <M2Card style={styles.pad} testID="m2-upload-no-rows"><Text style={m2Text.body}>{t('m2v.up.noRows')}</Text></M2Card>
      ) : check.rows.map((row, i) => <ValueRowCard key={row.localId} check={check} row={row} index={i} />)}
      {check.canAddRow ? (
        <Button label={check.rows.length === 0 ? t('m2v.up.addFirst') : t('m2v.up.addValue')} variant="secondary" onPress={check.addRow} testID="m2-upload-add-row" />
      ) : check.rows.length >= check.maxRows && check.maxRows > 0 ? (
        <Text style={m2Text.meta}>{t('m2v.up.maxRows', { max: check.maxRows })}</Text>
      ) : null}
      {check.error ? (
        <Banner tone="attention" title={errorTitle} announce testID="m2-upload-save-error">
          {check.errorText || (check.error === 'conflict' ? t('m2v.up.conflictBody') : t('m2v.up.nothingSaved'))}
        </Banner>
      ) : null}
      <Text style={m2Text.meta} accessibilityLiveRegion="polite" testID="m2-upload-ticked">
        {ticked === 0 ? t('m2v.up.tickHint') : t(ticked === 1 ? 'm2v.up.tickedOne' : 'm2v.up.ticked', { count: ticked })}
      </Text>
      <Button label={ticked === 1 ? t('m2v.up.saveOne') : t('m2v.up.save', { count: ticked })} onPress={() => void check.save()}
        disabled={!check.canSave} busy={saving} fullWidth size="cta" testID="m2-upload-save" />
    </View>
  );
});

const SavedStep = observer(function SavedStep({ vm, check, links }: { vm: ReportUploadViewModel; check: ReportCheckViewModel; links: M2ReportUploadLinks }) {
  const t = useT();
  const locale = dateLocale(useLanguage().lang);
  const result = check.result;
  if (!result) return null;
  const lab = check.labName.trim();
  const date = fullDate(check.collectedOn, locale);
  const summary = t(result.confirmed === 1 ? 'm2v.up.savedOne' : 'm2v.up.savedMany', { count: result.confirmed, lab: lab || t('m2v.up.yourLab'), date });
  const outside = result.outsideRange === 0 ? t('m2v.up.outsideNone') : t(result.outsideRange === 1 ? 'm2v.up.outsideOne' : 'm2v.up.outsideMany', { count: result.outsideRange });
  const reviewLine = vm.reviewStatus === 'APPROVED' ? t('m2v.up.reviewDone') : vm.reviewStatus === 'ASSIGNED' ? t('m2v.up.reviewAssigned') : t('m2v.up.reviewAsked');
  return (
    <Rise index={1} style={[styles.gutter, styles.stack]}>
      <M2Card style={[styles.pad, styles.saved]} testID="m2-upload-saved">
        <Gradient colors={heroStops('green')} angle={150} style={styles.tick}>
          <Icon name="check" size={34} color={color.onHero} strokeWidth={3} />
        </Gradient>
        <M2Heading style={[m2Text.section, styles.centreText]}>{t('m2v.up.savedTitle')}</M2Heading>
        <Text role="status" accessibilityLiveRegion="polite" style={[m2Text.body, styles.centreText]} testID="m2-upload-saved-summary">{`${summary} ${outside}`}</Text>
        {result.discarded > 0 ? (
          <Text style={[m2Text.meta, styles.centreText]}>{t(result.discarded === 1 ? 'm2v.up.discardedOne' : 'm2v.up.discarded', { count: result.discarded })}</Text>
        ) : null}
      </M2Card>
      {vm.review === 'asked' ? (
        <Banner tone="info" announce testID="m2-upload-review-asked">{reviewLine}</Banner>
      ) : (
        <Button label={t('m2v.up.askDoctor')} onPress={() => void vm.askDoctor()} busy={vm.review === 'asking'} fullWidth size="cta" testID="m2-upload-ask-doctor" />
      )}
      {vm.review === 'error' ? (
        <Banner tone="attention" title={t('m2v.up.reviewFailed')} announce testID="m2-upload-review-error">{vm.reviewError || t('m2v.up.tryAgain')}</Banner>
      ) : null}
      <Button label={t('m2v.up.seeTrends')} variant="secondary" onPress={links.trends} fullWidth testID="m2-upload-trends" />
    </Rise>
  );
});

export const M2ReportUploadView = observer(function M2ReportUploadView({ vm, sources, online, links }: M2ReportUploadViewProps) {
  const t = useT();
  useOwnPhoneChrome();
  const check = vm.check;
  let body: React.ReactNode;
  if (vm.step === 'uploading') {
    body = (
      <M2Card style={[styles.pad, styles.uploading]} testID="m2-upload-uploading">
        <ActivityIndicator color={color.action} />
        <Text role="status" accessibilityLiveRegion="polite" style={m2Text.body}>{t('m2v.up.uploading')}</Text>
      </M2Card>
    );
    body = <View style={styles.gutter}>{body}</View>;
  } else if (vm.step === 'labs') {
    body = <LabsStep vm={vm} />;
  } else if (vm.step === 'check' && check) {
    body = check.step === 'saved' ? <SavedStep vm={vm} check={check} links={links} /> : <CheckStep check={check} />;
  } else {
    body = <AddStep vm={vm} sources={sources} online={online} />;
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" testID="m2-report-upload">
      <View style={styles.header}>
        <RoundButton icon="arrow-left" label={t('m2v.up.back')} onPress={links.back} testID="m2-upload-back" />
        <View style={styles.grow}>
          <Text numberOfLines={1} style={styles.eyebrow}>{t('m2v.up.eyebrow')}</Text>
          <M2Heading level={1} style={styles.title}>{t('m2v.up.title')}</M2Heading>
        </View>
        <M2HeaderSos />
      </View>
      <View style={styles.gutter}><StepBar stage={vm.stage} /></View>
      {!online ? <View style={styles.gutter}><OfflineBanner message={t('m2v.up.offline')} /></View> : null}
      {body}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { paddingBottom: M2_NAV_CLEARANCE, gap: space.s16 },
  grow: { flex: 1, minWidth: 0 },
  gutter: { paddingHorizontal: space.gutterPhone },
  stack: { gap: space.s12 },
  stackTight: { gap: space.s8 },
  pad: { padding: space.s16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingHorizontal: space.gutterPhone, paddingTop: space.s16 },
  eyebrow: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.text3 },
  title: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), letterSpacing: -0.5, color: color.text },
  stepper: { flexDirection: 'row', gap: space.s8 },
  stepCell: { flex: 1, gap: space.s6 },
  stepTrack: { height: 6, borderRadius: radius.full, backgroundColor: color.surface3, overflow: 'hidden' },
  stepFill: { height: 6, width: '0%', borderRadius: radius.full },
  stepFillOn: { width: '100%', backgroundColor: color.action },
  stepLabel: { fontFamily: font.family.sans, fontSize: font.size.caption - 1, fontWeight: fontWeight(font.weight.heavy), color: color.text3 },
  stepLabelOn: { color: color.action },
  hero: { borderRadius: 26, padding: space.s20, minHeight: 200, flexDirection: 'row', overflow: 'hidden', ...shadowStyle(shadow.float) },
  heroRing: { position: 'absolute', right: -60, bottom: -90, width: 220, height: 220, borderRadius: radius.full, borderWidth: 22, borderColor: color.onHeroVeil },
  heroText: { flex: 1, gap: space.s10, paddingRight: space.s8 },
  heroTitle: { fontFamily: font.family.sans, fontSize: font.size.title + 2, lineHeight: (font.size.title + 2) * font.lineHeight.tight, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  heroBody: { fontFamily: font.family.sans, fontSize: font.size.bodySm, lineHeight: font.size.bodySm * font.lineHeight.body, fontWeight: fontWeight(font.weight.strong), color: color.onHero },
  sheetArt: { width: 86, height: 110, borderRadius: radius.lg, backgroundColor: color.surface, padding: space.s10, gap: space.s8, alignSelf: 'flex-start', ...shadowStyle(shadow.card) },
  sheetLine: { height: 5, borderRadius: radius.full },
  sources: { gap: space.s12 },
  source: { minHeight: 72, padding: space.s14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: space.s14, backgroundColor: color.surface, ...shadowStyle(shadow.card) },
  sourceOff: { backgroundColor: color.neutralBg, ...(Platform.OS === 'web' ? { boxShadow: 'none' } : { shadowOpacity: 0, elevation: 0 }) },
  sourceTile: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  promise: { color: color.text2 },
  uploading: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  rowCard: { padding: space.s14, gap: space.s10, borderWidth: 1.5, borderColor: color.surface },
  rowCardOn: { borderColor: color.action },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  checkHit: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, marginLeft: -space.s8 },
  checkBox: { width: 24, height: 24, borderRadius: radius.sm, borderWidth: 2, borderColor: color.ruleStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  checkBoxOn: { backgroundColor: color.action, borderColor: color.action },
  removeHit: { minHeight: size.touchTarget, minWidth: size.touchTarget, alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: space.s10 },
  unitCol: { width: 112 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s6 },
  suggestion: { minHeight: size.touchTarget, paddingHorizontal: space.s12, borderRadius: radius.full, justifyContent: 'center', backgroundColor: color.surface3 },
  suggestionText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.action },
  problems: { gap: space.s2 },
  problem: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.attention },
  saved: { alignItems: 'center', gap: space.s10, paddingVertical: space.s24 },
  tick: { width: 72, height: 72, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  centreText: { textAlign: 'center' },
});
