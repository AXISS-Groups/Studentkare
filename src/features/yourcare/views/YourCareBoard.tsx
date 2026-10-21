import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo, Icon } from '@/design-system/icons';
import { ErrorState, Skeleton, useOnline } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import {
  BoardCard, BoardRow, BoardScreen, BoardSection, FirstTime, HeroCard, Meter, OfflinePanel, Pill, boardText,
} from '@/design-system/board/BoardKit';
import type { BoardTone } from '@/design-system/board/BoardKit';
import type { SkIconName } from '@/design-system/icons';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { useApiResource } from '@/hooks/api/useApiResource';
import type { LiveDocument } from '@/data/types/workflowTypes';
import { useT } from '@/i18n';
import { clockLabel, dayLabel, shortDate, startOfWeek, toDate } from '@/features/phoneboards/format';

/** Where each part of Your Care leads. A link left out (no such screen on that platform) hides its row. */
export interface YourCareLinks {
  appointments?: () => void;
  records?: () => void;
  devices?: () => void;
  movement?: () => void;
  refill?: () => void;
  labTests?: () => void;
  emergencyCard?: () => void;
  pass?: () => void;
  crisis?: () => void;
  /** The More / account hub (the board's avatar). */
  more?: () => void;
}

interface Appointment { id: string; slotStart: string; status: string; createdAt: number }
interface Share { id: string; active: boolean }
interface ExerciseSession { id: string; finishedAt: string }
interface MedicinePlan { id: string; name: string }
interface Benefits { benefits: { limit: number; used: number } }
interface ProfileLine { university: string; hostelBlock?: string }

const UPCOMING = new Set(['REQUESTED', 'CONFIRMED']);
/** A record added this recently is "new" on Your Care. */
const NEW_RECORD_DAYS = 7;
const DAY_MS = 86_400_000;

interface Need { key: string; title: string; meta: string; pill: string; icon: SkIconName; tone: BoardTone; pillTone: BoardTone; onPress: () => void }

/**
 * Your Care overview (canvas page 2, YourCare, Tier 2): this week at a glance,
 * what needs the student, and what they have used so far. Every number comes
 * from the student's own records; a part whose data did not load is left out
 * rather than guessed. React Native: the web phone frame and the Expo tab.
 */
export function YourCareBoard({ links }: { links: YourCareLinks }): React.ReactElement {
  const t = useT();
  const online = useOnline();
  const profile = useApiResource<ProfileLine>('/profile');
  const appts = useApiResource<{ items: Appointment[] }>('/appointments');
  const docs = useApiResource<{ items: LiveDocument[]; total?: number }>('/health/documents?limit=12');
  const shares = useApiResource<{ items: Share[] }>('/records/shares');
  const sessions = useApiResource<{ items: ExerciseSession[] }>('/health/exercise-sessions');
  const plans = useApiResource<{ items: MedicinePlan[] }>('/refills/plans');
  const labs = useApiResource<{ total: number }>('/lab-orders?limit=1');
  const billing = useApiResource<Benefits>('/billing/me');

  const reloadAll = () => [profile, appts, docs, shares, sessions, plans, labs, billing].forEach((r) => r.reload());
  const now = Date.now();
  const next = (appts.data?.items ?? [])
    .filter((a) => UPCOMING.has(a.status) && (toDate(a.slotStart)?.getTime() ?? 0) > now)
    .sort((a, b) => (toDate(a.slotStart)?.getTime() ?? 0) - (toDate(b.slotStart)?.getTime() ?? 0))[0];
  const newRecord = (docs.data?.items ?? []).find((d) => (toDate(d.createdAt)?.getTime() ?? 0) > now - NEW_RECORD_DAYS * DAY_MS);
  const weekStart = startOfWeek().getTime();
  const weekSessions = (sessions.data?.items ?? []).filter((s) => (toDate(s.finishedAt)?.getTime() ?? 0) >= weekStart).length;
  const plan = plans.data?.items[0];
  const activeShares = shares.data ? shares.data.items.filter((s) => s.active).length : null;
  const docTotal = docs.data ? docs.data.total ?? docs.data.items.length : null;
  const consultsBooked = appts.data ? appts.data.items.filter((a) => a.status !== 'CANCELLED').length : null;

  // Things waiting on the student, from their own data.
  const waiting: Need[] = [];
  if (newRecord && links.records) waiting.push({ key: 'record', title: t('pb.yc.newRecord', { title: newRecord.title }), meta: t('pb.yc.addedOn', { date: shortDate(newRecord.createdAt) }), pill: t('pb.yc.view'), icon: 'flask-2', tone: 'positive', pillTone: 'positive', onPress: links.records });
  if (next && links.appointments) waiting.push({ key: 'consult', title: t('pb.yc.consult'), meta: t('pb.yc.consultMeta', { day: dayLabel(next.slotStart, t), time: clockLabel(next.slotStart), status: next.status === 'CONFIRMED' ? t('pb.appt.confirmed') : t('pb.appt.requested') }), pill: t('pb.yc.manage'), icon: 'doctor-2', tone: 'action', pillTone: 'action', onPress: links.appointments });
  if (plan && links.refill) waiting.push({ key: 'refill', title: t('pb.yc.refill', { name: plan.name }), meta: t('pb.yc.refillMeta'), pill: t('pb.yc.reorder'), icon: 'pill-2', tone: 'attention', pillTone: 'action', onPress: links.refill });
  // Always offered: things a student can do any day.
  const everyday: Need[] = [];
  if (links.devices) everyday.push({ key: 'reading', title: t('pb.yc.reading'), meta: t('pb.yc.readingMeta'), pill: t('pb.yc.open'), icon: 'activity-3', tone: 'action', pillTone: 'action', onPress: links.devices });
  if (links.movement && sessions.data) everyday.push({ key: 'movement', title: t('pb.yc.movement'), meta: t('pb.yc.movementMeta', { count: weekSessions }), pill: t('pb.yc.open'), icon: 'zap', tone: 'positive', pillTone: 'action', onPress: links.movement });

  const loading = appts.loading || docs.loading;
  const failed = !loading && Boolean(appts.error) && Boolean(docs.error);
  const firstTime = !loading && !failed && appts.data?.items.length === 0 && docTotal === 0 && (plans.data?.items.length ?? 0) === 0 && (sessions.data?.items.length ?? 0) === 0;
  const place = [profile.data?.hostelBlock, profile.data?.university].filter(Boolean).join(' • ');

  return (
    <BoardScreen testID="your-care">
      <BoardHeader
        title={t('tabbar.yourCare')}
        subtitle={place || undefined}
        trailingKey={links.more ? 'more' : ''}
        trailing={links.more ? <Avatar label={t('pb.yc.openMore')} onPress={links.more} /> : null}
      />

      {!online ? (
        <OfflinePanel
          testID="your-care-offline"
          title={t('pb.offline.title')}
          body={t('pb.offline.body')}
          retryLabel={t('pb.offline.retry')}
          onRetry={reloadAll}
          stillWorksLabel={t('pb.offline.stillWorks')}
          tickIcon="check"
          links={[
            ...(links.emergencyCard ? [{ label: t('pb.offline.emergencyCard'), onPress: links.emergencyCard }] : []),
            ...(links.pass ? [{ label: t('pb.offline.pass'), onPress: links.pass }] : []),
            ...(links.crisis ? [{ label: t('pb.offline.crisis'), onPress: links.crisis }] : []),
          ]}
        />
      ) : null}

      {loading ? <Skeleton label={t('pb.yc.loading')} lines={['100%', '80%', '100%', '60%']} /> : null}
      {failed ? <ErrorState title={t('pb.yc.failedTitle')} body={t('pb.yc.failedBody')} retryLabel={t('common.tryAgain')} onRetry={reloadAll} /> : null}

      {firstTime ? (
        <FirstTime
          testID="your-care-first"
          tile="chart-alt--p4"
          title={t('pb.yc.firstTitle')}
          body={t('pb.yc.firstBody')}
          actions={[
            ...(links.labTests ? [{ label: t('pb.yc.bookLab'), onPress: links.labTests }] : []),
            ...(links.emergencyCard ? [{ label: t('pb.yc.setUpCard'), onPress: links.emergencyCard }] : []),
          ]}
        />
      ) : null}

      {!loading && !failed && !firstTime ? (
        <>
          <HeroCard testID="your-care-week">
            <View style={styles.heroHead}>
              <View style={styles.heroTile}><Icon name="heart-pulse-2" size={size.navIcon} color={color.onHero} /></View>
              <View style={styles.heroWords}>
                <Text style={boardText.heroTitle}>{t('pb.yc.week')}</Text>
                <Text style={boardText.heroBody}>{waiting.length ? t('pb.yc.weekSome') : t('pb.yc.weekNone')}</Text>
              </View>
            </View>
            <View style={styles.grid}>
              <HeroStat value={String(waiting.length)} unit={t('pb.yc.things')} label={t('pb.yc.needYou')} />
              <HeroStat
                value={next ? dayLabel(next.slotStart, t) : t('pb.yc.none')}
                unit={next ? clockLabel(next.slotStart) : ''}
                label={t('pb.yc.nextConsult')}
                onPress={links.appointments}
              />
              {activeShares !== null ? <HeroStat value={String(activeShares)} unit={t('pb.yc.shared')} label={t('pb.yc.recordsShared')} onPress={links.records} /> : null}
              {docTotal !== null ? <HeroStat value={String(docTotal)} unit={t('pb.yc.documents')} label={t('pb.yc.inVault')} onPress={links.records} /> : null}
            </View>
          </HeroCard>

          <BoardSection label={t('pb.yc.needsYou')}>
            {[...waiting, ...everyday].map((n) => (
              <BoardRow
                key={n.key}
                testID={`your-care-need-${n.key}`}
                icon={n.icon}
                tone={n.tone}
                title={n.title}
                meta={n.meta}
                onPress={n.onPress}
                accessibilityLabel={`${n.title}, ${n.meta}, ${n.pill}`}
                trailing={<Pill label={n.pill} tone={n.pillTone} />}
              />
            ))}
          </BoardSection>

          <BoardSection label={t('pb.yc.soFar')}>
            <BoardCard>
              {consultsBooked !== null ? <SoFar label={t('pb.yc.consultsBooked')} value={String(consultsBooked)} /> : null}
              {labs.data ? <SoFar label={t('pb.yc.labTests')} value={String(labs.data.total)} /> : null}
              {docTotal !== null ? <SoFar label={t('pb.yc.recordsInVault')} value={t('pb.yc.documentsN', { count: docTotal })} /> : null}
              {billing.data && billing.data.benefits.limit > 0 ? (
                <View style={styles.soFar}>
                  <SoFar label={t('pb.yc.benefits')} value={t('pb.yc.benefitsOf', { used: billing.data.benefits.used, limit: billing.data.benefits.limit })} />
                  <Meter fraction={billing.data.benefits.used / billing.data.benefits.limit} />
                </View>
              ) : null}
            </BoardCard>
          </BoardSection>
        </>
      ) : null}
    </BoardScreen>
  );
}

function Avatar({ label, onPress }: { label: string; onPress: () => void }): React.ReactElement {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID="your-care-more"
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.avatar, focused ? focusRing : null]}>
      <BrandLogo size={size.touchTarget - space.s8} label="" />
    </Pressable>
  );
}

function HeroStat({ value, unit, label, onPress }: { value: string; unit: string; label: string; onPress?: () => void }): React.ReactElement {
  const body = (
    <>
      <Text style={styles.statLine}>
        <Text style={styles.statValue}>{value}</Text>
        {unit ? <Text style={styles.statUnit}>{` ${unit}`}</Text> : null}
      </Text>
      <Text style={boardText.heroEyebrow}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={styles.stat}>{body}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label}: ${value} ${unit}`} onPress={onPress}
      style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.stat, focused ? focusRing : null]}>
      {body}
    </Pressable>
  );
}

function SoFar({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.soFarRow}>
      <Text style={boardText.strong}>{label}</Text>
      <Text style={styles.soFarValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { width: size.touchTarget, height: size.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  heroTile: { width: size.touchTarget - space.s4, height: size.touchTarget - space.s4, borderRadius: radius.md, backgroundColor: color.onHeroVeil, alignItems: 'center', justifyContent: 'center' },
  heroWords: { flex: 1, gap: space.s2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: color.onHeroRule },
  stat: { width: '50%', minHeight: size.touchTarget, paddingVertical: space.s12, paddingRight: space.s8, gap: space.s4, borderBottomWidth: 1, borderBottomColor: color.onHeroRule },
  statLine: { fontFamily: font.family.sans },
  statValue: { fontFamily: font.family.mono, fontSize: font.size.title, fontWeight: fontWeight(font.weight.heavy), color: color.onHeroAttention },
  statUnit: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.onHero2 },
  soFar: { gap: space.s8 },
  soFarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.s12, minHeight: size.touchTarget - space.s12 },
  soFarValue: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
