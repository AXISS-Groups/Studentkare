import React, { useEffect, useState } from 'react';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, ErrorState, Note, OfflineBanner, Skeleton, TextField, useOnline } from '@/design-system';
import { Icon } from '@/design-system/icons';
import { ChoiceCard, TextLink } from '@/design-system/board/BoardKit';
import {
  M2Callout, M2Card, M2EdgeCard, M2EmptyState, M2Grid, M2Header, M2Heading, M2ListLine, M2PageHero, M2Tile3d, M2WideColumn, SERVICE_HUES, m2Text, useOwnPhoneChrome,
} from '@/design-system/m2';
import { color, space } from '@/design-system/theme';
import { LeaveCampusViewModel } from '../viewmodel/LeaveCampusViewModel';
import type { DepartureReason } from '../viewmodel/LeaveCampusViewModel';

export interface LeaveCampusLinks {
  openRecords: () => void;
  /** Omitted where the platform has no plans screen; the link is then not drawn. */
  openPlans?: () => void;
  openSupport?: () => void;
  /** Download my data (the desktop "Good to know" card); drawn only when given. */
  openExport?: () => void;
  back?: () => void;
}

const REASONS: readonly DepartureReason[] = ['GRADUATING', 'TRANSFERRING', 'PAUSING'];
/** What campus_departure.py leaves alone (records, shares, reminders, the account). */
const STAYS: readonly MessageKey[] = ['leave.s1', 'leave.s2', 'leave.s3'];

/**
 * Leaving campus, one view at every width (design page 2 LeaveCampus, Tier 2;
 * canvas 3b WebLeaveCampus, Tier 1, superseded; Tier 1 look T1LeaveCampus /
 * Scheduled / Desktop, approved by Krishna Chintakayala 2026-10-24; plan
 * tier1-parity-2026-10-24 §20), one source for web and native. Says what
 * stays and what changes before anything is confirmed, and only lists changes
 * the backend actually makes (campus_departure.py, D9-9). The view model and
 * the departure rules behind it are unchanged; the effective date is the
 * server's. Not drawn: the personal-email field (the request takes none), the
 * plan picker (plans are compared on Plan & billing), "Care Circle", "Edu ID
 * prices end" and "checks carry over" (nothing the backend does).
 */
export const LeaveCampusView = observer(function LeaveCampusView({ viewModel: vm, links, wide = false }: { viewModel: LeaveCampusViewModel; links: LeaveCampusLinks; wide?: boolean }) {
  const s = vm.state;
  const t = useT();
  useOwnPhoneChrome();
  const online = useOnline();
  const title = s?.campus ? t('leave.titleNamed', { university: s.campus.university }) : t('leave.title');

  const stays = (
    <M2EdgeCard edge={SERVICE_HUES.green.deep} fill testID="leave-campus-stays">
      <View style={styles.head}>
        <M2Tile3d icon="check" hue="green" />
        <M2Heading style={[m2Text.section, styles.grow]}>{t('leave.stays')}</M2Heading>
      </View>
      {STAYS.map((key) => <M2ListLine key={key} icon="check" ink={color.positive}>{t(key)}</M2ListLine>)}
    </M2EdgeCard>
  );

  const changes = s ? (
    <M2EdgeCard edge={SERVICE_HUES.orange.deep} fill testID="leave-campus-changes">
      <View style={styles.head}>
        <M2Tile3d icon="arrow-right" hue="orange" />
        <M2Heading style={[m2Text.section, styles.grow]}>{t('leave.changes')}</M2Heading>
      </View>
      <M2ListLine icon="arrow-right" ink={color.attention}>{t('leave.c1', { college: s.campus?.university ?? t('leave.yourCollege') })}</M2ListLine>
      <M2ListLine icon="arrow-right" ink={color.attention}>{t('leave.c2')}</M2ListLine>
      {s.collegePlan ? <M2ListLine icon="arrow-right" ink={color.attention}>{t('leave.c3', { org: s.collegePlan.organization })}</M2ListLine> : null}
      <M2ListLine icon="arrow-right" ink={color.attention}>{t('swt.leave.cPass')}</M2ListLine>
      {vm.reason ? <Text style={m2Text.meta}>{vm.reason === 'PAUSING' ? t('leave.effectToday') : t('leave.effectChosen')}</Text> : null}
    </M2EdgeCard>
  ) : null;

  const goodToKnow = (
    <M2Card fill style={styles.card} testID="leave-campus-know">
      <View style={styles.head}>
        <M2Tile3d icon="download" hue="indigo" />
        <M2Heading style={[m2Text.section, styles.grow]}>{t('swt.leave.knowTitle')}</M2Heading>
      </View>
      <Text style={m2Text.body}>{t('swt.leave.know1')}</Text>
      <Text style={m2Text.body}>{t('swt.leave.know2')}</Text>
      {links.openExport ? (
        <>
          <Text style={m2Text.body}>{t('swt.leave.know3')}</Text>
          <Button label={t('swt.leave.download')} variant="secondary" onPress={links.openExport} icon={<Icon name="download" size={16} color={color.action} />} />
        </>
      ) : null}
    </M2Card>
  );

  const form = vm.stage === 'form' && s ? (
    <>
      {s.signsInWithCollegeEmail ? (
        <M2Callout tone="attention" icon="mail" hue="amber" title={t('leave.emailWarnTitle')} body={t('leave.emailWarnBody')} testID="leave-campus-email" />
      ) : null}
      <M2Card style={styles.card} testID="leave-campus-form">
        <M2Heading style={m2Text.section}>{t('leave.what')}</M2Heading>
        <View role="radiogroup" accessibilityLabel={t('leave.what')} aria-label={t('leave.what')} style={styles.choices}>
          {REASONS.map((r) => (
            <ChoiceCard key={r} radio testID={`leave-reason-${r}`} title={t(`leave.reason.${r}` as MessageKey)} selected={vm.reason === r} onPress={() => vm.setReason(r)} />
          ))}
        </View>
        {vm.needsDate ? (
          <TextField
            label={vm.reason === 'GRADUATING' ? t('leave.lastDay') : t('leave.moveDay')}
            mono
            value={vm.effectiveOn}
            onChangeText={vm.setEffectiveOn}
            error={vm.dateError ? t(vm.dateError) : undefined}
            maxLength={10}
            placeholder={s.today}
            testID="leave-date"
          />
        ) : null}
        {vm.reason === 'TRANSFERRING' ? (
          <TextField label={t('leave.whereTo')} hint={t('leave.whereToHint')} value={vm.destination} onChangeText={vm.setDestination} maxLength={160} />
        ) : null}
      </M2Card>
      {wide ? (
        <M2Grid columns={{ desktop: 3, tablet: 2 }}>{stays}{changes}{goodToKnow}</M2Grid>
      ) : (
        <>{stays}{changes}</>
      )}
      {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
      <View style={[styles.actions, wide ? styles.actionsWide : null]}>
        <Button label={t('leave.submit')} size="cta" fullWidth={!wide} busy={vm.busy} disabled={(!vm.canSubmit || !online) && !vm.busy} onPress={() => void vm.submit()} testID="leave-submit" />
        {links.openSupport ? <Button label={t('leave.support')} variant="secondary" fullWidth={!wide} onPress={links.openSupport} /> : null}
        {s.collegePlan && links.openPlans ? <TextLink label={t('leave.compare')} onPress={links.openPlans} /> : null}
      </View>
    </>
  ) : null;

  const scheduled = vm.stage === 'scheduled' && s?.departure ? (
    <M2PageHero hue="orange" testID="leave-campus-scheduled" art={<M2Tile3d icon="calendar" hue="orange" size={72} float />} artOnPhone={false}>
      <View style={styles.head}>
        <M2Tile3d icon="check" hue="green" size={48} />
        <M2Tile3d icon="calendar" hue="orange" size={48} />
      </View>
      <M2Heading style={styles.heroTitle}>{t('leave.scheduledTitle', { date: s.departure.effectiveOn })}</M2Heading>
      <Text style={styles.heroBody}>{t('leave.scheduledBody')}</Text>
      {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
      <View style={styles.heroActions}>
        <Button label={t('leave.undo')} variant="secondary" fullWidth={!wide} busy={vm.busy} disabled={!online && !vm.busy} onPress={() => void vm.undo()} testID="leave-undo" />
        <Button label={t('leave.seeRecords')} variant="ghost" fullWidth={!wide} onPress={links.openRecords} />
      </View>
    </M2PageHero>
  ) : null;

  const completed = vm.stage === 'completed' ? (
    <M2EmptyState animation="anim-check" hue="green" poster={<Icon name="check" size={28} color={color.onHero} />} title={t('leave.doneTitle')} body={t('leave.doneBody')} action={{ label: t('leave.seeRecords'), onPress: links.openRecords }} testID="leave-campus-done" />
  ) : null;

  const body = (
    <>
      {!online ? <OfflineBanner message={t('common.retryConnection')} /> : null}
      {vm.stage === 'loading' ? <M2Card style={styles.card}><Skeleton label={t('common.loading')} lines={['80%', '100%', '60%']} /></M2Card> : null}
      {vm.stage === 'failed' ? <M2Card style={styles.card}><ErrorState title={t('del.failedTitle')} body={t('del.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /></M2Card> : null}
      {vm.stage === 'notLinked' ? (
        <M2EmptyState animation="anim-home" hue="amber" poster={<Icon name="graduation-cap" size={28} color={color.onHero} />} title={t('leave.notLinkedTitle')} body={t('leave.notLinkedBody')} action={{ label: t('leave.seeRecords'), onPress: links.openRecords }} testID="leave-campus-not-linked" />
      ) : null}
      {scheduled}
      {vm.stage === 'scheduled' ? stays : null}
      {completed}
      {form}
    </>
  );

  if (wide) {
    return (
      <M2WideColumn testID="leave-campus">
        <M2Header backLabel={t('common.back')} onBack={links.back} title={title} testID="leave-header" />
        {vm.stage === 'form' ? <M2PageHero hue="orange" icon="graduation-cap" body={t('leave.intro')} testID="leave-hero" art={<M2Tile3d icon="graduation-cap" hue="orange" size={96} float />} artOnPhone={false} /> : null}
        {body}
      </M2WideColumn>
    );
  }
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="leave-campus">
      <M2Header backLabel={t('common.back')} onBack={links.back} title={title} testID="leave-header" />
      <View style={[styles.gutter, styles.column]}>
        {vm.stage === 'form' ? <M2PageHero hue="orange" icon="graduation-cap" body={t('leave.intro')} testID="leave-hero" /> : null}
        {body}
      </View>
    </ScrollView>
  );
});

export function LeaveCampusRoute({ links, wide = false }: { links: LeaveCampusLinks; wide?: boolean }): React.ReactElement {
  const [vm] = useState(() => new LeaveCampusViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <LeaveCampusView viewModel={vm} links={links} wide={wide} />;
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { gap: space.s14, paddingBottom: space.s40 },
  gutter: { paddingHorizontal: space.gutterPhone },
  column: { gap: space.s14 },
  card: { padding: space.s16, gap: space.s12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  choices: { gap: space.s8 },
  actions: { gap: space.s10 },
  actionsWide: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.s12 },
  heroTitle: { ...m2Text.title, color: color.onHero },
  heroBody: { ...m2Text.body, color: color.onHero },
  heroActions: { gap: space.s8, marginTop: space.s6 },
});
