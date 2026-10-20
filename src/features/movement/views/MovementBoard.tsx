import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ErrorState, Skeleton } from '@/design-system';
import { BoardHeader } from '@/design-system/navigation/BoardHeader';
import { BoardScreen, BoardSection, Pill, TextLink, boardText } from '@/design-system/board/BoardKit';
import { color, focusRing, font, fontWeight, radius, size, space } from '@/design-system/theme';
import { exercises, routineSeconds, routines } from '@/data/datasets/exerciseLibrary';
import type { ExerciseRoutine } from '@/data/datasets/exerciseLibrary';
import type { SessionRecord } from '@/data/contexts/ExerciseStore';
import { useT } from '@/i18n';
import { startOfWeek, toDate } from '@/features/phoneboards/format';

export interface MovementLinks {
  back?: () => void;
  /** Log activity from a device or by hand (Devices & sensors). */
  log?: () => void;
  /** Open a guide: its readiness check, then the guided session. */
  openGuide: (routine: ExerciseRoutine) => void;
}

const SECONDS_PER_MINUTE = 60;
const DAYS = 7;
const RECENT = 3;

/** Where a routine's guidance comes from: the sources of the moves in it. */
function sourcesOf(routine: ExerciseRoutine): string {
  const titles = new Set<string>();
  for (const step of routine.steps) {
    const source = exercises.find((e) => e.id === step.exerciseId)?.source.title;
    if (source) titles.add(source);
  }
  return [...titles].join(' · ');
}

/**
 * Movement (canvas page 2, Movement, Tier 3): the guided sessions the student
 * actually finished this week, the sourced guides, and recent sessions. Rule L:
 * no targets, no streaks, no scores, and no step count the app did not record —
 * a quiet week is shown as a quiet week. The bars are minutes per day, scaled to
 * the week's own longest day, never to a goal.
 */
export function MovementBoard({ sessions, loading, error, onRetry, links }: { sessions: readonly SessionRecord[]; loading: boolean; error: string; onRetry: () => void; links: MovementLinks }): React.ReactElement {
  const t = useT();
  const weekStart = startOfWeek();
  const days = Array.from({ length: DAYS }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));
  const minutesOn = days.map((day) => {
    const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
    return sessions
      .filter((s) => { const at = toDate(s.finishedAt)?.getTime() ?? 0; return at >= day.getTime() && at < next; })
      .reduce((sum, s) => sum + s.activeSeconds, 0) / SECONDS_PER_MINUTE;
  });
  const weekCount = sessions.filter((s) => (toDate(s.finishedAt)?.getTime() ?? 0) >= weekStart.getTime()).length;
  const longest = Math.max(...minutesOn);

  return (
    <BoardScreen testID="movement">
      <BoardHeader
        title={t('pb.move.title')}
        backIcon="arrow-left"
        backLabel={t('common.back')}
        onBack={links.back}
        trailingKey={links.log ? 'log' : ''}
        trailing={links.log ? <TextLink label={t('pb.move.log')} onPress={links.log} /> : null}
      />

      {loading ? <Skeleton label={t('assist.exercise.loadingSaved')} lines={['40%', '100%', '80%']} /> : null}
      {error && !loading ? <ErrorState title={t('pb.move.failedTitle')} body={error} retryLabel={t('common.tryAgain')} onRetry={onRetry} /> : null}

      {!loading && !error ? (
        <View style={styles.week} testID="movement-week">
          <Text style={boardText.eyebrow}>{t('pb.move.thisWeek')}</Text>
          <Text accessibilityRole="header" style={styles.count}>{t('pb.move.sessions', { count: weekCount })}</Text>
          <Text style={boardText.body}>{t('pb.move.noStreaks')}</Text>
          <View style={styles.bars} accessibilityRole="image" accessibilityLabel={t('pb.move.barsLabel', { count: weekCount })}>
            {days.map((day, i) => {
              const minutes = minutesOn[i];
              const share = longest > 0 ? minutes / longest : 0;
              return (
                <View key={day.toISOString()} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: minutes > 0 ? `${Math.max(12, share * 100)}%` : space.s6, backgroundColor: minutes > 0 ? color.chartCategorical1 : color.surface3 }]} />
                  </View>
                  <Text style={[styles.barLabel, minutes > 0 ? styles.barLabelOn : null]}>{day.toLocaleDateString(undefined, { weekday: 'narrow' })}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <BoardSection label={t('pb.move.guides')}>
        {routines.map((routine) => (
          <Pressable
            key={routine.id}
            testID={`movement-guide-${routine.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${routine.name}, ${t('pb.move.minutes', { count: Math.round(routineSeconds(routine) / SECONDS_PER_MINUTE) })}`}
            onPress={() => links.openGuide(routine)}
            style={({ focused }: { pressed: boolean; focused?: boolean }) => [styles.guide, focused ? focusRing : null]}
          >
            <View style={styles.flex}>
              <Text style={boardText.strong}>{routine.name}</Text>
              <Text style={boardText.body}>{routine.description}</Text>
              <Text style={styles.source}>{sourcesOf(routine)}</Text>
            </View>
            <Pill label={t('pb.move.minutes', { count: Math.round(routineSeconds(routine) / SECONDS_PER_MINUTE) })} tone="action" />
          </Pressable>
        ))}
      </BoardSection>

      {sessions.length ? (
        <BoardSection label={t('pb.move.recent')}>
          {sessions.slice(0, RECENT).map((s) => (
            <View key={s.id} style={styles.session}>
              <View style={styles.flex}>
                <Text style={boardText.strong}>{s.routineName}</Text>
                <Text style={boardText.meta}>{t('pb.move.sessionMeta', { day: toDate(s.finishedAt)?.toLocaleDateString(undefined, { weekday: 'long' }) ?? '' })}</Text>
              </View>
              <Text style={styles.sessionMinutes}>{t('pb.move.minutes', { count: Math.max(1, Math.round(s.activeSeconds / SECONDS_PER_MINUTE)) })}</Text>
            </View>
          ))}
        </BoardSection>
      ) : null}

      <Text style={boardText.meta}>{t('pb.move.clinician')}</Text>
    </BoardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0, gap: space.s2 },
  week: { gap: space.s8 },
  count: { fontFamily: font.family.sans, fontSize: font.size.heading, fontWeight: fontWeight(font.weight.heavy), color: color.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: space.s8, height: size.touchTarget * 2, marginTop: space.s8 },
  barCol: { flex: 1, height: '100%', alignItems: 'center', gap: space.s6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm, borderBottomLeftRadius: space.s2, borderBottomRightRadius: space.s2 },
  barLabel: { fontFamily: font.family.sans, fontSize: font.size.caption, color: color.text3 },
  barLabelOn: { fontWeight: fontWeight(font.weight.heavy), color: color.text },
  guide: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s12, borderBottomWidth: 1, borderBottomColor: color.ruleSoft, minHeight: size.touchTarget },
  source: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.strong), color: color.action },
  session: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: space.s10, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  sessionMinutes: { fontFamily: font.family.sans, fontSize: font.size.bodySm, fontWeight: fontWeight(font.weight.heavy), color: color.text },
});
