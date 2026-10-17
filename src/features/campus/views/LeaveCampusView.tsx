import React, { useEffect, useState } from 'react';
import { say, useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, EmptyState, ErrorState, Eyebrow, Note, RadioGroup, Rise, Skeleton, TextField } from '@/design-system';
import { color, font, fontWeight, space } from '@/design-system/theme';
import { LeaveCampusViewModel } from '../viewmodel/LeaveCampusViewModel';
import type { DepartureReason } from '../viewmodel/LeaveCampusViewModel';

export interface LeaveCampusLinks {
  openRecords: () => void;
  /** Omitted where the platform has no plans screen; the link is then not drawn. */
  openPlans?: () => void;
  openSupport?: () => void;
}

const REASONS: readonly DepartureReason[] = ['GRADUATING', 'TRANSFERRING', 'PAUSING'];

/**
 * Leaving campus (design page 2, LeaveCampus, Tier 3), one source for web and
 * native. Says what stays and what changes before anything is confirmed, and
 * only lists changes the backend actually makes.
 */
export const LeaveCampusView = observer(function LeaveCampusView({ viewModel: vm, links }: { viewModel: LeaveCampusViewModel; links: LeaveCampusLinks }) {
  const s = vm.state;
  const t = useT();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>{t('leave.eyebrow')}</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {s?.campus ? t('leave.titleNamed', { university: s.campus.university }) : t('leave.title')}
        </Text>
        <Text style={styles.body}>{t('leave.intro')}</Text>
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
        <Card>
          <Text style={styles.cardTitle}>{t('leave.scheduledTitle', { date: s.departure.effectiveOn })}</Text>
          <Text style={styles.body}>{t('leave.scheduledBody')}</Text>
          <Button label={t('leave.undo')} variant="secondary" fullWidth busy={vm.busy} onPress={() => void vm.undo()} />
        </Card>
      ) : null}

      {vm.stage === 'completed' ? (
        <Card>
          <Text style={styles.cardTitle}>{t('leave.doneTitle')}</Text>
          <Text style={styles.body}>{t('leave.doneBody')}</Text>
          <Button label={t('leave.seeRecords')} fullWidth onPress={links.openRecords} />
        </Card>
      ) : null}

      {vm.stage === 'form' && s ? (
        <>
          {s.signsInWithCollegeEmail ? (
            <Note tone="attention" title={t('leave.emailWarnTitle')}>
              {t('leave.emailWarnBody')}
            </Note>
          ) : null}

          <Card>
            <RadioGroup label={t('leave.what')} options={REASONS.map((r) => ({ value: r, label: t(`leave.reason.${r}` as MessageKey) }))} value={vm.reason} onChange={vm.setReason} />
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
          </Card>

          <Card>
            <Eyebrow>{t('leave.stays')}</Eyebrow>
            <Text style={styles.item}>{`✓ ${t('leave.s1')}`}</Text>
            <Text style={styles.item}>{`✓ ${t('leave.s2')}`}</Text>
            <Text style={styles.item}>{`✓ ${t('leave.s3')}`}</Text>
            <Eyebrow>{t('leave.changes')}</Eyebrow>
            <Text style={styles.item}>{`→ ${t('leave.c1', { college: s.campus?.university ?? t('leave.yourCollege') })}`}</Text>
            <Text style={styles.item}>{`→ ${t('leave.c2')}`}</Text>
            {s.collegePlan ? <Text style={styles.item}>{`→ ${t('leave.c3', { org: s.collegePlan.organization })}`}</Text> : null}
            {vm.reason ? <Text style={styles.meta}>{vm.reason === 'PAUSING' ? t('leave.effectToday') : t('leave.effectChosen')}</Text> : null}
          </Card>

          {s.collegePlan && links.openPlans ? <Button label={t('leave.compare')} variant="ghost" onPress={links.openPlans} /> : null}
          {vm.error ? <Note tone="danger">{say(t, vm.error)}</Note> : null}
          <Button label={t('leave.submit')} size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} onPress={() => void vm.submit()} />
          {links.openSupport ? <Button label={t('leave.support')} variant="ghost" onPress={links.openSupport} /> : null}
        </>
      ) : null}
    </ScrollView>
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
  screen: { flex: 1, backgroundColor: color.canvas },
  content: { padding: space.gutterPhone, gap: space.s16, maxWidth: 640 },
  title: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text, marginTop: space.s4 },
  cardTitle: { fontFamily: font.family.sans, fontSize: font.size.titleSm, fontWeight: fontWeight(font.weight.strong), color: color.text },
  body: { fontFamily: font.family.sans, fontSize: font.size.body, color: color.text2, lineHeight: font.size.body * font.lineHeight.body },
  item: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text, lineHeight: font.size.bodySm * font.lineHeight.body },
  meta: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
});
