import React, { useEffect, useState } from 'react';
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

const REASONS: ReadonlyArray<{ value: DepartureReason; label: string }> = [
  { value: 'GRADUATING', label: 'I’m graduating' },
  { value: 'TRANSFERRING', label: 'Moving to another campus' },
  { value: 'PAUSING', label: 'Taking a break from college' },
];

const WHEN: Record<DepartureReason, string> = {
  GRADUATING: 'on the date you choose',
  TRANSFERRING: 'on the date you choose',
  PAUSING: 'today',
};

/**
 * Leaving campus (design page 2, LeaveCampus, Tier 3), one source for web and
 * native. Says what stays and what changes before anything is confirmed, and
 * only lists changes the backend actually makes.
 */
export const LeaveCampusView = observer(function LeaveCampusView({ viewModel: vm, links }: { viewModel: LeaveCampusViewModel; links: LeaveCampusLinks }) {
  const s = vm.state;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Rise>
        <Eyebrow>Leaving campus</Eyebrow>
        <Text accessibilityRole="header" style={styles.title}>
          {s?.campus ? `Leaving ${s.campus.university}?` : 'Leaving campus'}
        </Text>
        <Text style={styles.body}>Your health records were always yours. Here’s what stays, what changes, and when.</Text>
      </Rise>

      {vm.stage === 'loading' ? <Skeleton label="Loading" lines={['80%', '100%', '60%']} /> : null}

      {vm.stage === 'failed' ? (
        <ErrorState title="Couldn't load this" body="This is on our side, not yours. Try again." retryLabel="Try again" onRetry={() => void vm.load()} />
      ) : null}

      {vm.stage === 'notLinked' ? (
        <EmptyState
          title="You're not linked to a campus"
          body="Your account is already a personal one, so there's nothing to leave."
          action={{ label: 'See my records', onPress: links.openRecords }}
        />
      ) : null}

      {vm.stage === 'scheduled' && s?.departure ? (
        <Card>
          <Text style={styles.cardTitle}>You become a personal account on {s.departure.effectiveOn}</Text>
          <Text style={styles.body}>Until then nothing changes. You can undo this any time before that date.</Text>
          <Button label="Undo — I’m not leaving" variant="secondary" fullWidth busy={vm.busy} onPress={() => void vm.undo()} />
        </Card>
      ) : null}

      {vm.stage === 'completed' ? (
        <Card>
          <Text style={styles.cardTitle}>All set — your records come with you</Text>
          <Text style={styles.body}>You’re a personal account now. If you’ve moved to a new campus, you can verify there from your profile.</Text>
          <Button label="See my records" fullWidth onPress={links.openRecords} />
        </Card>
      ) : null}

      {vm.stage === 'form' && s ? (
        <>
          {s.signsInWithCollegeEmail ? (
            <Note tone="attention" title="You sign in with your college email">
              If that address stops working after you leave, you won’t receive sign-in codes. Contact Studentkare support before you go so you don’t lose access.
            </Note>
          ) : null}

          <Card>
            <RadioGroup label="What’s happening?" options={REASONS} value={vm.reason} onChange={vm.setReason} />
            {vm.needsDate ? (
              <TextField
                label={vm.reason === 'GRADUATING' ? 'Your last day (YYYY-MM-DD)' : 'The day you move (YYYY-MM-DD)'}
                mono
                value={vm.effectiveOn}
                onChangeText={vm.setEffectiveOn}
                error={vm.dateError || undefined}
                maxLength={10}
                placeholder={s.today}
              />
            ) : null}
            {vm.reason === 'TRANSFERRING' ? (
              <TextField
                label="Where to? (optional)"
                hint="You’ll verify at your new campus from your profile once you’ve moved."
                value={vm.destination}
                onChangeText={vm.setDestination}
                maxLength={160}
              />
            ) : null}
          </Card>

          <Card>
            <Eyebrow>Stays yours</Eyebrow>
            <Text style={styles.item}>✓ All your records and reports</Text>
            <Text style={styles.item}>✓ Your care circle and medicine reminders</Text>
            <Text style={styles.item}>✓ Your account and sign-in</Text>
            <Eyebrow>Changes</Eyebrow>
            <Text style={styles.item}>→ {s.campus?.university ?? 'Your college'}’s link to your account is removed</Text>
            <Text style={styles.item}>→ Your verified-student status ends</Text>
            {s.collegePlan ? <Text style={styles.item}>→ Your plan paid by {s.collegePlan.organization} ends</Text> : null}
            {vm.reason ? <Text style={styles.meta}>Changes take effect {WHEN[vm.reason]}.</Text> : null}
          </Card>

          {s.collegePlan && links.openPlans ? <Button label="Compare plans" variant="ghost" onPress={links.openPlans} /> : null}
          {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
          <Button label="Switch to a personal account" size="cta" fullWidth busy={vm.busy} disabled={!vm.canSubmit && !vm.busy} onPress={() => void vm.submit()} />
          {links.openSupport ? <Button label="Talk to support" variant="ghost" onPress={links.openSupport} /> : null}
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
