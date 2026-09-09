/**
 * Wellbeing screen — Insights · Suggestions · Activity.
 *
 * DESCRIPTIVE + EDUCATIONAL + ROUTING only. No health score, no risk score,
 * no calorie/weight targets, no streaks, no peer comparison, no food logging,
 * no before/after imagery. Body metrics (BMI) appear ONLY as clinician-recorded
 * context, never as a score, headline, target or directional arrow.
 *
 * Every free-text input passes the crisis gate FIRST (W-7.1). Risk signals
 * route to support and suppress the numeric surfaces.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';
import { useAppStore } from '../../data/store';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { evaluateCrisisGate } from '../../ai/crisisGate';
import {
  detectRiskSignals,
  shouldSuppressNumericSurfaces,
  getSupportRouting,
} from '../../ai/wellbeing/riskSignals';
import { restateValue, buildTrendSeries, computeRecordCompleteness } from '../../ai/wellbeing/insights';
import { generateContextualSuggestions, takeTopSuggestion } from '../../ai/wellbeing/suggestions';
import {
  getPopulationGuidance,
  getCampusActivityOptions,
  getInjuryRouting,
  structuredActivityBlocked,
} from '../../ai/wellbeing/activityGuidance';
import { PARQ_QUESTIONS, evaluateScreening } from '../../ai/wellbeing/screening';
import { getReferenceRange } from '../../ai/wellbeing/referenceRanges';
import type { RiskSignal, SuggestionContext } from '../../ai/wellbeing/types';
import { ShieldCheck, Activity, HeartPulse, AlertTriangle, Sparkles, CheckCircle2, X } from 'lucide-react';

function buildContext(campDaySoon: boolean, immunisationDue: boolean): SuggestionContext {
  const month = new Date().getMonth() + 1;
  return {
    campusName: 'IIT Hyderabad',
    region: 'Telangana',
    month,
    isExamWeek: month === 4 || month === 5 || month === 11,
    campDaySoon,
    monsoonSeason: month >= 6 && month <= 9,
    summerHeat: month >= 3 && month <= 5,
    clearanceExpiring: false,
    immunisationDue,
    campOverdue: false,
    aggregateGiReports: false,
  };
}

export const WellbeingScreen: React.FC = () => {
  const { tokens, typography } = useTheme();
  const { student, records, camp } = useAppStore();

  const [checkIn, setCheckIn] = useState('');
  const [crisisMessage, setCrisisMessage] = useState<string | null>(null);
  const [riskSignals, setRiskSignals] = useState<RiskSignal[]>([]);
  const [dismissedSuggestionId, setDismissedSuggestionId] = useState<string | null>(null);

  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, boolean>>({});
  const screening = evaluateScreening(screeningAnswers);
  const activityBlocked = structuredActivityBlocked(screening);

  const suppressed = shouldSuppressNumericSurfaces(riskSignals) || crisisMessage !== null;

  const population = useMemo(() => getPopulationGuidance(), []);
  const campusOptions = useMemo(() => getCampusActivityOptions('IIT Hyderabad'), []);
  const injury = useMemo(() => getInjuryRouting(), []);
  const completeness = useMemo(() => computeRecordCompleteness(records, camp, student), [records, camp, student]);

  const hasVaccine = records.some((r) => r.category === 'VACCINE');
  const suggestions = useMemo(() => {
    const campSoon = camp ? camp.completedCount < camp.totalStations : false;
    return generateContextualSuggestions(buildContext(campSoon, !hasVaccine));
  }, [camp, hasVaccine]);

  const topSuggestion = takeTopSuggestion(suggestions);

  const values = useMemo(() => {
    return records
      .flatMap((r) => r.observations.map((o) => ({ obs: o, rec: r })))
      .filter(({ obs }) => getReferenceRange(obs.code) !== undefined);
  }, [records]);

  const handleCheckIn = () => {
    const text = checkIn.trim();
    if (!text) return;
    const crisis = evaluateCrisisGate(text, student.fullName.split(' ')[0]);
    if (crisis.isCrisis) {
      setCrisisMessage(crisis.message);
      setRiskSignals([]);
      setCheckIn('');
      return;
    }
    const signals = detectRiskSignals(text);
    setRiskSignals(signals);
    setCrisisMessage(null);
    setCheckIn('');
  };

  const handleDismissSuggestion = () => {
    if (topSuggestion) setDismissedSuggestionId(topSuggestion.id);
  };

  const toggleScreening = (id: string) => {
    setScreeningAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const supportRoute = getSupportRouting(riskSignals);

  return (
    <ScrollView style={[styles.container, { backgroundColor: tokens.canvas }]}>
      <View style={styles.header}>
        <Badge label="WELLBEING · DESCRIPTIVE · EDUCATIONAL" variant="mono" />
        <Text style={[styles.title, { color: tokens.text }]}>Insights, Suggestions & Activity</Text>
        <Text style={[styles.sub, { color: tokens.text2 }]}>
          We restate what is in your record and route you to care. We never predict, score or set targets.
        </Text>
      </View>

      {/* W-7.1 Crisis gate + risk-signal check-in */}
      <Card variant="surface" style={styles.card}>
        <View style={styles.cardHeader}>
          <ShieldCheck size={18} color={tokens.action} />
          <Text style={[styles.cardTitle, { color: tokens.text }]}>How are you doing?</Text>
        </View>
        <TextInput
          style={[styles.input, { borderColor: tokens.rule, color: tokens.text, fontFamily: typography.fontMono }]}
          placeholder="Share anything on your mind (optional)..."
          placeholderTextColor={tokens.text3}
          value={checkIn}
          onChangeText={setCheckIn}
          multiline
        />
        <Button label="Check in" onPress={handleCheckIn} variant="primary" size="sm" style={{ marginTop: 10 }} />

        {crisisMessage && (
          <View style={[styles.alertBox, { backgroundColor: tokens.emergencyBg, borderColor: tokens.emergency }]}>
            <AlertTriangle size={16} color={tokens.emergency} />
            <Text style={[styles.alertText, { color: tokens.emergency }]}>{crisisMessage}</Text>
          </View>
        )}

        {!crisisMessage && riskSignals.length > 0 && (
          <View style={[styles.alertBox, { backgroundColor: tokens.attentionBg, borderColor: tokens.attention }]}>
            <Sparkles size={16} color={tokens.attention} />
            <Text style={[styles.alertText, { color: tokens.attention }]}>
              It sounds like you may be finding things hard. You are not alone — please talk to someone.
            </Text>
            <Text style={[styles.mono, { color: tokens.text2 }]}>{supportRoute.teleManas}</Text>
            <Text style={[styles.small, { color: tokens.text2 }]}>Campus support: {supportRoute.primary}</Text>
            <Text style={[styles.small, { color: tokens.text3 }]}>
              Some measurements below are hidden while you focus on support.
            </Text>
          </View>
        )}
      </Card>

      {/* I-3.4 Record completeness */}
      <Card variant="surface" style={styles.card}>
        <View style={styles.cardHeader}>
          <CheckCircle2 size={18} color={tokens.action} />
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Your record</Text>
        </View>
        {completeness.map((item) => (
          <View key={item.id} style={[styles.row, { borderBottomColor: tokens.ruleSoft }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: tokens.text }]}>{item.label}</Text>
              <Text style={[styles.small, { color: tokens.text2 }]}>{item.detail}</Text>
            </View>
            <Badge label={item.status} variant={item.status === 'COMPLETE' ? 'positive' : 'attention'} />
          </View>
        ))}
      </Card>

      {/* I-3.1 Value restatement (numeric surfaces suppressed on risk signal / crisis) */}
      {!suppressed && (
        <Card variant="surface" style={styles.card}>
          <View style={styles.cardHeader}>
            <HeartPulse size={18} color={tokens.action} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>Measured values</Text>
          </View>
          {values.length === 0 && <Text style={[styles.small, { color: tokens.text2 }]}>No measured values yet.</Text>}
          {values.map(({ obs, rec }) => {
            const v = restateValue(obs, rec);
            return (
              <View key={obs.id} style={[styles.row, { borderBottomColor: tokens.ruleSoft }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.text }]}>
                    {v.display} — {v.value} {v.unit}
                  </Text>
                  <Text style={[styles.small, { color: tokens.text3 }]}>
                    Typical range: {v.referenceRange}
                  </Text>
                  <Text style={[styles.small, { color: tokens.text2 }]}>{v.plainLanguage}</Text>
                  <Text style={[styles.mono, { color: tokens.text3 }]}>
                    {v.provenance.sourceType} · {v.provenance.takenOn}
                  </Text>
                  {v.isBodyMetric && (
                    <Text style={[styles.small, { color: tokens.text3 }]}>
                      Body metric recorded by a clinician, shown for context only.
                    </Text>
                  )}
                </View>
                {v.outsideTypicalRange && (
                  <Badge label="Outside typical range · clinical review" variant="attention" />
                )}
              </View>
            );
          })}
        </Card>
      )}

      {/* I-3.3 Trends (uninterpreted) */}
      {!suppressed && (
        <Card variant="surface" style={styles.card}>
          <View style={styles.cardHeader}>
            <Activity size={18} color={tokens.action} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>Over time</Text>
          </View>
          {values.length === 0 && <Text style={[styles.small, { color: tokens.text2 }]}>No history to show.</Text>}
          {values.map(({ obs }) => {
            const series = buildTrendSeries(records, obs.code);
            if (!series) return null;
            return (
              <View key={obs.code} style={styles.row}>
                <Text style={[styles.rowLabel, { color: tokens.text }]}>{series.display}</Text>
                {series.points.map((p) => (
                  <Text key={p.date} style={[styles.mono, { color: tokens.text2 }]}>
                    {p.date} · {p.value} {p.unit}
                  </Text>
                ))}
              </View>
            );
          })}
        </Card>
      )}

      {/* S-4.1/4.3 One contextual suggestion, dismissible */}
      {topSuggestion && dismissedSuggestionId !== topSuggestion.id && (
        <Card variant="surface" style={styles.card}>
          <View style={styles.cardHeader}>
            <Sparkles size={18} color={tokens.action} />
            <Text style={[styles.cardTitle, { color: tokens.text }]}>{topSuggestion.title}</Text>
            <TouchableOpacity onPress={handleDismissSuggestion} style={{ marginLeft: 'auto' }}>
              <X size={16} color={tokens.text3} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.small, { color: tokens.text2 }]}>{topSuggestion.body}</Text>
          <Text style={[styles.mono, { color: tokens.text3 }]}>
            {topSuggestion.source} · advisor-approved
          </Text>
        </Card>
      )}

      {/* A-5.1/5.2/5.3/5.4 Activity */}
      <Card variant="surface" style={styles.card}>
        <View style={styles.cardHeader}>
          <Activity size={18} color={tokens.action} />
          <Text style={[styles.cardTitle, { color: tokens.text }]}>Physical activity</Text>
        </View>

        <Text style={[styles.small, { color: tokens.text2 }]}>{population.populationGuidance}</Text>

        {/* A-5.2 Pre-participation screening */}
        <Text style={[styles.mono, { color: tokens.text3, marginTop: 12 }]}>
          Before any structured programme, please answer honestly.
        </Text>
        {PARQ_QUESTIONS.map((q) => (
          <TouchableOpacity key={q.id} onPress={() => toggleScreening(q.id)} style={styles.screeningRow}>
            <View style={[styles.checkbox, { borderColor: tokens.rule }]}>
              {screeningAnswers[q.id] === true && <View style={[styles.checkboxInner, { backgroundColor: tokens.action }]} />}
            </View>
            <Text style={[styles.small, { color: tokens.text }]}>{q.prompt}</Text>
          </TouchableOpacity>
        ))}

        {activityBlocked ? (
          <View style={[styles.alertBox, { backgroundColor: tokens.attentionBg, borderColor: tokens.attention }]}>
            <AlertTriangle size={16} color={tokens.attention} />
            <Text style={[styles.alertText, { color: tokens.attention }]}>
              One of your answers means a structured activity programme is not appropriate for you right now.
              Please see your campus clinician before starting any structured exercise.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <Text style={[styles.rowLabel, { color: tokens.text }]}>What is available on campus</Text>
            {campusOptions.map((o) => (
              <View key={o.id} style={styles.row}>
                <Text style={[styles.small, { color: tokens.text }]}>{o.name}</Text>
                <Text style={[styles.small, { color: tokens.text2 }]}>{o.detail}</Text>
              </View>
            ))}
          </View>
        )}

        {/* A-5.4 Injury routing */}
        <View style={[styles.alertBox, { backgroundColor: tokens.surface2, borderColor: tokens.rule, marginTop: 12 }]}>
          <Text style={[styles.small, { color: tokens.text }]}>{injury.routeToCare}</Text>
          <Text style={[styles.small, { color: tokens.text2 }]}>{injury.returnToPlay}</Text>
        </View>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  header: { maxWidth: 880, alignSelf: 'center', width: '100%', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '800', marginTop: 6, marginBottom: 4 },
  sub: { fontSize: 13, maxWidth: 620 },
  card: { padding: 20, marginBottom: 16, maxWidth: 880, width: '100%', alignSelf: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, minHeight: 64, textAlignVertical: 'top' },
  row: { paddingVertical: 10, borderBottomWidth: 1 },
  rowLabel: { fontSize: 14, fontWeight: '700' },
  small: { fontSize: 12, marginTop: 2 },
  mono: { fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', marginTop: 2 },
  alertBox: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  alertText: { fontSize: 13, flex: 1 },
  screeningRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxInner: { width: 12, height: 12, borderRadius: 2 },
});
