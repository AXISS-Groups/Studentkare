import React, { useEffect, useState } from 'react';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, EmptyState, ErrorState, Note, Rise, Skeleton, TextField } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, ChoiceCard, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { LeaveCampusViewModel } from '../viewmodel/LeaveCampusViewModel';
import type { DepartureReason } from '../viewmodel/LeaveCampusViewModel';

export interface LeaveCampusLinks {
  openRecords: () => void;
  /** Omitted where the platform has no plans screen; the link is then not drawn. */
  openPlans?: () => void;
  openSupport?: () => void;
  back?: () => void;
}

const REASONS: readonly DepartureReason[] = ['GRADUATING', 'TRANSFERRING', 'PAUSING'];

/**
 * Leaving campus (design page 2, LeaveCampus, Tier 2), one source for web and
 * native. Says what stays and what changes before anything is confirmed, and
 * only lists changes the backend actually makes. The view model (and the
 * campus-departure rules behind it) is unchanged; this is its board. The
 * board's personal-email field and plan picker are not drawn: the departure
 * request takes neither (plans are compared on Plan & billing).
 */
export const LeaveCampusView = observer(function LeaveCampusView({ viewModel: vm, links }: { viewModel: LeaveCampusViewModel; links: LeaveCampusLinks }) {
  const s = vm.state;
  const t = useT();

  return (
    <BoardScreen testID="leave-campus">
      <BoardHeader
        title={s?.campus ? t('leave.titleNamed', { university: s.campus.university }) : t('leave.title')}
        backIcon="chevron-left"
        backLabel={t('common.back')}
        onBack={links.back}
      />
      <Rise>
        <Text style={boardText.body}>{t('leave.intro')}</Text>
      </Rise>

      {vm.stage === 'loading' ? <Skeleton label={t('common.loading')} lines={['80%', '100%', '60%']} /> : null}

      {vm.stage === 'failed' ? (
        <ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} />
      ) : null}

      {vm.stage === 'notLinked' ? (
        <EmptyState
          title={t('leave.notLinkedTitle')}
          body={t('leave.notLinkedBody')}
          action={{ label: t('leave.seeRecords'), onPress: links.openRecords }}
        />
      ) : null}

      {vm.stage === 'scheduled' && s?.departure ? (
        <View style={styles.done} testID="leave-campus-scheduled">
          <View style={styles.doneMark}><Icon name="check" size={size.navIcon + space.s8} color={color.positive} strokeWidth={2.6} /></View>
          <Text accessibilityRole="header" style={styles.doneTitle}>{t('leave.scheduledTitle', { date: s.departure.effectiveOn })}</Text>
          <Text style={[boardText.body, styles.center]}>{t('leave.scheduledBody')}</Text>
          <Button label={t('leave.seeRecords')} fullWidth onPress={links.openRecords} />
          <Button label={t('leave.undo')} variant="secondary" fullWidth busy={vm.busy} onPress={() => void vm.undo()} />
        </View>
      ) : null}

      {vm.stage === 'completed' ? (
        <View style={styles.done}>
          <View style={styles.doneMark}><Icon name="check" size={size.navIcon + space.s8} color={color.positive} strokeWidth={2.6} /></View>
          <Text accessibilityRole="header" style={styles.doneTitle}>{t('leave.doneTitle')}</Text>
          <Text style={[boardText.body, styles.center]}>{t('leave.doneBody')}</Text>
          <Button label={t('leave.seeRecords')} fullWidth onPress={links.openRecords} />
        </View>
      ) : null}

      {vm.stage === 'form' && s ? (
        <>
          {s.signsInWithCollegeEmail ? (
            <Note tone="attention" title={t('leave.emailWarnTitle')}>
              {t('leave.emailWarnBody')}
            </Note>
          ) : null}

          <BoardSection label={t('leave.what')}>
            {REASONS.map((r) => (
              <ChoiceCard key={r} radio testID={`leave-reason-${r}`} title={t(`leave.reason.${r}` as MessageKey)} selected={vm.reason === r} onPress={() => vm.setReason(r)} />
            ))}
          </BoardSection>

          {vm.needsDate || vm.reason === 'TRANSFERRING' ? (
            <View style={styles.fields}>
              {vm.needsDate ? (
                <TextField
                  label={vm.reason === 'GRADUATING' ? t('leave.lastDay') : t('leave.moveDay')}
                  mono
                  value={vm.effectiveOn}
                  onChangeText={vm.setEffectiveOn}
                  error={vm.dateError ? t(vm.dateError) : undefined}
                  maxLength={10}
                  placeholder={s.today}
                />
              ) : null}
              {vm.reason === 'TRANSFERRING' ? (
                <TextField
                  label={t('leave.whereTo')}
                  hint={t('leave.whereToHint')}
                  value={vm.destination}
                  onChangeText={vm.setDestination}
                  maxLength={160}
                />
              ) : null}
            </View>
          ) : null}

          <View style={[styles.panel, { backgroundColor: color.positiveBg }]} testID="leave-campus-stays">
            <Text style={[styles.panelLabel, { color: color.positive }]}>{t('leave.stays')}</Text>
            {(['leave.s1', 'leave.s2', 'leave.s3'] as const).map((key) => (
              <View key={key} style={styles.item}>
                <Icon name="check" size={space.s16} color={color.positive} strokeWidth={2.6} />
                <Text style={[styles.itemText, styles.flex]}>{t(key)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.panel, { backgroundColor: color.attentionBg }]} testID="leave-campus-changes">
            <Text style={[styles.panelLabel, { color: color.attention }]}>{t('leave.changes')}</Text>
            <View style={styles.item}>
              <Icon name="arrow-right" size={space.s16} color={color.attention} strokeWidth={2.6} />
              <Text style={[styles.itemText, styles.flex]}>{t('leave.c1', { college: s.campus?.university ?? t('leave.yourCollege') })}</Text>
            </View>
            <View style={styles.item}>
              <Icon name="arrow-right" size={space.s16} color={color.attention} strokeWidth={2.6} />
              <Text style={[styles.itemText, styles.flex]}>{t('leave.c2')}</Text>
            </View>
            {s.collegePlan ? (
              <View style={styles.item}>
                <Icon name="arrow-right" size={space.s16} color={color.attention} strokeWidth={2.6} />
                <Text style={[styles.itemText, styles.flex]}>{t('leave.c3', { org: s.collegePlan.organization })}</Text>
              </View>
            ) : null}
            {vm.reason ? <Text style={boardText.meta}>{vm.reason === 'PAUSING' ? t('leave.effectToday') : t('leave.effectChosen')}</Text> : null}
          </View>

          {s.collegePlan && links.openPlans ? <TextLink label={t('leave.compare')} onPress={links.openPlans} /> : null}
          {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
          <Button label={t('leave.submit')} size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} onPress={() => void vm.submit()} />
          {links.openSupport ? <TextLink label={t('leave.support')} onPress={links.openSupport} /> : null}
        </>
      ) : null}
    </BoardScreen>
  );
});

export function LeaveCampusRoute({ links }: { links: LeaveCampusLinks }): React.ReactElement {
  const [vm] = useState(() => new LeaveCampusViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <LeaveCampusView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  fields: { gap: space.s12 },
  panel: { gap: space.s8, borderRadius: radius.xl, padding: space.s16 },
  panelLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, textTransform: 'uppercase' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s8 },
  itemText: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.strong), color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
  done: { alignItems: 'center', gap: space.s12, backgroundColor: color.surface, borderRadius: radius.sheet, borderWidth: 1, borderColor: color.ruleSoft, padding: space.s24 },
  doneMark: { width: size.controlLg + space.s10, height: size.controlLg + space.s10, borderRadius: radius.full, backgroundColor: color.positiveBg, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.text, textAlign: 'center' },
});
