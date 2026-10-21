import React, { useEffect, useState } from 'react';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Button, Card, ErrorState, Note, Skeleton } from '@/design-system';
import { BrandLogo, Icon } from '@/design-system/icons';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardRow, BoardScreen, BoardSection, HeroCard, Pill, PrivacyNote, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import { initialsOf } from '@/features/account/views/StudentProfileBoard';
import type { MemberIdentity } from '@/data/types/workflowTypes';
import { DigitalIdViewModel } from '../viewmodel/DigitalIdViewModel';


const CELL = 6;

/**
 * Paints the server-issued QR from its cell rows. Each row is drawn as runs of
 * dark cells, so a 37×37 code is a few hundred views, not 1,369.
 */
export function QrCells({ rows, label }: { rows: string[]; label: string }): React.ReactElement {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.qr}>
      {rows.map((row, y) => {
        const runs: { start: number; length: number }[] = [];
        for (let x = 0; x < row.length; x += 1) {
          if (row[x] !== '1') continue;
          const last = runs[runs.length - 1];
          if (last && last.start + last.length === x) last.length += 1;
          else runs.push({ start: x, length: 1 });
        }
        return (
          <View key={y} style={[styles.qrRow, { width: row.length * CELL }]}>
            {runs.map((run) => (
              <View key={run.start} style={[styles.qrDark, { left: run.start * CELL, width: run.length * CELL }]} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

export interface DigitalIdLinks {
  back?: () => void;
  /** Web: the check-in pass page (Tier 1, its own board). Expo keeps the pass card on this screen. */
  pass?: () => void;
  abha?: () => void;
  insurance?: () => void;
}

interface PolicyLine { id: string; insurer: string; validUntil: string }

/**
 * Digital health ID (design page 2: DigitalId, Tier 2). Shows only what GET
 * /identity and GET /health/policies return. The card carries no clinical value.
 *
 * Tier 1 boundary: the live check-in pass (QR, code, replace, revoke) is the
 * MyPass board's, under its own review. On Expo its card is unchanged below the
 * ID; in the web phone frame the ID links to the pass page instead (`links.pass`).
 */
export const DigitalIdNativeView = observer(function DigitalIdNativeView({ viewModel: vm, links = {} }: { viewModel: DigitalIdViewModel; links?: DigitalIdLinks }) {
  const id = vm.identity;
  const t = useT();
  const policies = useApiResource<{ items: PolicyLine[] }>('/health/policies');
  const campusLabel = (status: MemberIdentity['campusStatus']) => t(`verify.campus.${status}.title` as MessageKey);
  const verified = id?.campusStatus === 'VERIFIED';
  const today = new Date().toISOString().slice(0, 10);
  const policy = policies.data?.items.find((p) => p.validUntil >= today) ?? policies.data?.items[0];
  return (
    <BoardScreen testID="digital-id">
      <BoardHeader title={t('pb.id.title')} backIcon="arrow-left" backLabel={t('common.back')} onBack={links.back} />

      {vm.loading ? <Skeleton label={t('id.loading')} lines={['70%', '50%', '90%']} /> : null}
      {vm.loadFailed ? <ErrorState title={t('id.failedTitle')} body={t('id.failedBody')} retryLabel={t('common.tryAgain')} onRetry={() => void vm.load()} /> : null}

      {id ? (
        <>
          <HeroCard testID="digital-id-card">
            <View style={styles.cardTop}>
              <BrandLogo size={size.navIcon + space.s8} label="" />
              <Text style={styles.brand}>{t('phone.brand')}</Text>
              <View style={styles.status}>
                <View style={[styles.statusDot, { backgroundColor: id.issued ? color.onHeroPositive : color.onHeroAttention }]} />
                <Text style={styles.statusText}>{id.issued ? t('pb.id.active') : t('pb.id.notIssued')}</Text>
              </View>
            </View>
            <View style={styles.who}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{initialsOf(id.fullName)}</Text>
                {verified ? <View style={styles.badge}><Icon name="check" size={space.s12} color={color.onAction} strokeWidth={3} /></View> : null}
              </View>
              <View style={styles.flex}>
                <Text style={boardText.heroTitle}>{id.fullName}</Text>
                <Text style={boardText.heroBody}>{[id.university || t('id.campusNotProvided'), id.rollNumber ? t('id.roll', { roll: id.rollNumber }) : ''].filter(Boolean).join(' · ')}</Text>
                <View style={styles.verifiedChip}>
                  {verified ? <Icon name="check" size={space.s12} color={color.onHeroPositive} /> : null}
                  <Text style={[styles.verifiedText, { color: verified ? color.onHeroPositive : color.onHeroAttention }]}>{campusLabel(id.campusStatus)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.fields}>
              <Field label={t('pb.id.eduId')} value={id.memberId} mono />
              <Field label={t('pb.id.campus')} value={id.university || t('id.campusNotProvided')} />
            </View>
            {links.pass ? (
              <Pressable accessibilityRole="link" accessibilityLabel={t('pb.id.openPass')} onPress={links.pass} testID="digital-id-pass"
                style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.passLink, focused ? focusRing : null]}>
                <View style={styles.flex}>
                  <View style={styles.passTitle}>
                    <Text style={boardText.heroTitle}>{t('pb.id.openPass')}</Text>
                    <Icon name="arrow-right" size={size.navIcon - space.s4} color={color.onHero} />
                  </View>
                  <Text style={boardText.heroBody}>{t('pb.id.passNote')}</Text>
                </View>
              </Pressable>
            ) : null}
          </HeroCard>

          {links.pass ? null : (
            <Card>
              {vm.entry?.qrMatrix ? (
                <>
                  <View style={styles.qrWrap}>
                    <QrCells rows={vm.entry.qrMatrix} label={t('id.qrLabel')} />
                  </View>
                  <Text style={styles.meta}>{t('member.pass.code')} <Text style={styles.mono}>{vm.entry.passCode}</Text></Text>
                  <Text style={styles.meta}>{t('member.pass.changesIn', { n: vm.secondsLeft ?? 0 })}</Text>
                  <Text style={styles.meta}>{t('id.qrNote')}</Text>
                </>
              ) : id.issued ? (
                <Note tone="attention">{t('member.pass.stale')}</Note>
              ) : (
                <Text style={styles.meta}>{t('id.noQr')}</Text>
              )}
              {vm.error ? <Note tone="danger">{vm.error}</Note> : null}
              <Button label={id.issued ? t('id.replace') : t('id.create')} variant={id.issued ? 'secondary' : 'primary'} fullWidth busy={vm.busy} onPress={() => void vm.issue()} />
              {id.issued && !vm.confirmingRevoke ? <Button label={t('id.revoke')} variant="ghost" fullWidth onPress={vm.askRevoke} /> : null}
              {vm.confirmingRevoke ? (
                <Note tone="attention" title={t('id.revokeTitle')}>{t('id.revokeBody')}</Note>
              ) : null}
              {vm.confirmingRevoke ? <Button label={t('id.revokeYes')} variant="danger" fullWidth busy={vm.busy} onPress={() => void vm.revoke()} /> : null}
              {vm.confirmingRevoke ? <Button label={t('id.keep')} variant="secondary" fullWidth onPress={vm.cancelRevoke} /> : null}
            </Card>
          )}

          <BoardSection label={t('pb.id.linked')}>
            {links.abha ? (
              <BoardRow icon="shield-2" tone="positive" title={t('pb.id.abha')} meta={t('pb.id.abhaMeta')} onPress={links.abha} />
            ) : null}
            {policy ? (
              <BoardRow
                icon="briefcase"
                tone="positive"
                title={policy.insurer}
                meta={t('pb.id.policyMeta', { date: policy.validUntil })}
                onPress={links.insurance}
                trailing={<Pill label={policy.validUntil >= today ? t('pb.id.active') : t('pb.id.expired')} tone={policy.validUntil >= today ? 'positive' : 'neutral'} />}
              />
            ) : links.insurance ? (
              <BoardRow icon="briefcase" tone="neutral" title={t('pb.id.noPolicy')} meta={t('pb.id.noPolicyMeta')} onPress={links.insurance} />
            ) : null}
          </BoardSection>

          <PrivacyNote icon="lock-3">{t('pb.id.privacy')}</PrivacyNote>
        </>
      ) : null}
    </BoardScreen>
  );
});

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }): React.ReactElement {
  return (
    <View style={styles.field}>
      <Text style={boardText.heroEyebrow}>{label}</Text>
      <Text style={[styles.fieldValue, mono ? { fontFamily: font.family.mono } : null]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function DigitalIdRoute({ links }: { links?: DigitalIdLinks }): React.ReactElement {
  const [vm] = useState(() => new DigitalIdViewModel());
  useEffect(() => {
    void vm.load();
    return () => vm.dispose();
  }, [vm]);
  return <DigitalIdNativeView viewModel={vm} links={links} />;
}

const styles = StyleSheet.create({
  meta: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text2 },
  mono: { fontFamily: font.family.mono, fontSize: font.size.bodySm, color: color.text },
  flex: { flex: 1, minWidth: 0, gap: space.s4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: space.s10 },
  brand: { flex: 1, fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.s6, borderRadius: radius.full, borderWidth: 1, borderColor: color.onHeroRule, paddingHorizontal: space.s10, paddingVertical: space.s4 },
  statusDot: { width: space.s6, height: space.s6, borderRadius: radius.full },
  statusText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  who: { flexDirection: 'row', alignItems: 'center', gap: space.s14 },
  avatar: { width: size.controlLg + space.s10, height: size.controlLg + space.s10, borderRadius: radius.full, backgroundColor: color.onHeroVeil, borderWidth: 2, borderColor: color.onHeroPositive, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: font.family.sans, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  badge: { position: 'absolute', right: -space.s2, bottom: -space.s2, width: space.s20, height: space.s20, borderRadius: radius.full, backgroundColor: color.positiveFill, alignItems: 'center', justifyContent: 'center' },
  verifiedChip: { flexDirection: 'row', alignItems: 'center', gap: space.s4, alignSelf: 'flex-start', borderRadius: radius.full, backgroundColor: color.onHeroVeil, paddingHorizontal: space.s10, paddingVertical: space.s4 },
  verifiedText: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy) },
  fields: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s10 },
  field: { flexGrow: 1, flexBasis: '40%', gap: space.s4, borderRadius: radius.lg, backgroundColor: color.onHeroVeil, padding: space.s12 },
  fieldValue: { fontFamily: font.family.sans, fontSize: font.size.body, fontWeight: fontWeight(font.weight.heavy), color: color.onHero },
  passLink: { minHeight: size.touchTarget, borderRadius: radius.lg, paddingVertical: space.s4 },
  passTitle: { flexDirection: 'row', alignItems: 'center', gap: space.s6 },
  qrWrap: { alignItems: 'center' },
  // A QR needs true black on white to scan, whatever the theme, so these two
  // colours are deliberately not theme tokens.
  // eslint-disable-next-line no-restricted-syntax
  qr: { backgroundColor: '#FFFFFF' },
  qrRow: { height: CELL, position: 'relative' },
  // eslint-disable-next-line no-restricted-syntax
  qrDark: { position: 'absolute', top: 0, height: CELL, backgroundColor: '#000000' },
});
