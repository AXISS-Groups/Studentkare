import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/tokens/theme';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { BodyMetricsCalculator, calcError } from './BodyMetricsCalculator';
import {
  calculateSleepMetrics,
  calculateCardioMetrics,
  calculateVisionErgonomics,
  calculateHydration,
} from '../../core/clinical';
import type { BloodPressureCategory, EyeStrainRisk, SleepEfficiencyBand } from '../../core/clinical';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';
import {
  Scale,
  Moon,
  Heart,
  Eye,
  Droplets,
  AlertCircle,
  CheckCircle2,
  Info,
} from './calculatorIcons';

export type HealthToolTab = 'BODY_BMI' | 'SLEEP' | 'CARDIO' | 'VISION' | 'HYDRATION';

/*
 * Each calculator describes its band in its own plain words. The core library's
 * labels ("Stage 2 Hypertension", "Asthenopia", "Polysomnography") read as a
 * diagnosis from a single number typed into a form, which no calculator can make.
 */
const SLEEP_LABEL: Record<SleepEfficiencyBand, MessageKey> = {
  optimal: 'assist.calc.sleep.band.optimal',
  borderline: 'assist.calc.sleep.band.borderline',
  fragmented: 'assist.calc.sleep.band.fragmented',
};
const SLEEP_CONTEXT: Record<SleepEfficiencyBand, MessageKey> = {
  optimal: 'assist.calc.sleep.ctx.optimal',
  borderline: 'assist.calc.sleep.ctx.borderline',
  fragmented: 'assist.calc.sleep.ctx.fragmented',
};
const BP_LABEL: Record<BloodPressureCategory, MessageKey> = {
  hypotensive: 'assist.calc.bp.band.low',
  optimal: 'assist.calc.bp.band.usual',
  elevated: 'assist.calc.bp.band.slightlyHigh',
  stage1: 'assist.calc.bp.band.high',
  stage2: 'assist.calc.bp.band.veryHigh',
};
const BP_CONTEXT: Record<BloodPressureCategory, MessageKey> = {
  hypotensive: 'assist.calc.bp.ctx.low',
  optimal: 'assist.calc.bp.ctx.usual',
  elevated: 'assist.calc.bp.ctx.slightlyHigh',
  stage1: 'assist.calc.bp.ctx.high',
  stage2: 'assist.calc.bp.ctx.veryHigh',
};
/** Zone names and purposes, in the order the core library returns them. */
const ZONES: readonly { name: MessageKey; purpose: MessageKey }[] = [
  { name: 'assist.calc.zone.1', purpose: 'assist.calc.zone.1Body' },
  { name: 'assist.calc.zone.2', purpose: 'assist.calc.zone.2Body' },
  { name: 'assist.calc.zone.3', purpose: 'assist.calc.zone.3Body' },
  { name: 'assist.calc.zone.4', purpose: 'assist.calc.zone.4Body' },
];
const EYE_LABEL: Record<EyeStrainRisk, MessageKey> = {
  low: 'assist.calc.eyes.band.low',
  moderate: 'assist.calc.eyes.band.moderate',
  high: 'assist.calc.eyes.band.high',
};
const EYE_CONTEXT: Record<EyeStrainRisk, MessageKey> = {
  low: 'assist.calc.eyes.ctx.low',
  moderate: 'assist.calc.eyes.ctx.moderate',
  high: 'assist.calc.eyes.ctx.high',
};

export function ComprehensiveHealthCalculators(): React.ReactElement {
  const { tokens } = useTheme();
  const t = useT();
  const [activeTab, setActiveTab] = useState<HealthToolTab>('BODY_BMI');

  // Sleep State
  const [bedHours, setBedHours] = useState('8');
  const [sleepHours, setSleepHours] = useState('7.2');

  // Cardio State
  const [sbpStr, setSbpStr] = useState('118');
  const [dbpStr, setDbpStr] = useState('76');
  const [hrStr, setHrStr] = useState('72');
  const [cardioAgeStr, setCardioAgeStr] = useState('20');

  // Vision State
  const [screenHoursStr, setScreenHoursStr] = useState('7');
  const [breakMinsStr, setBreakMinsStr] = useState('45');
  const [hasDryEyes, setHasDryEyes] = useState(false);

  // Hydration State
  const [hydroWeightStr, setHydroWeightStr] = useState('65');
  const [activityMinsStr, setActivityMinsStr] = useState('30');
  const [isHotClimate, setIsHotClimate] = useState(true);

  const sleepReport = calculateSleepMetrics({
    timeInBedMinutes: parseFloat(bedHours) * 60,
    totalSleepMinutes: parseFloat(sleepHours) * 60,
  });

  const cardioReport = calculateCardioMetrics({
    systolicBp: parseFloat(sbpStr),
    diastolicBp: parseFloat(dbpStr),
    restingHeartRateBpm: parseFloat(hrStr) || undefined,
    ageYears: parseFloat(cardioAgeStr) || undefined,
  });

  const visionReport = calculateVisionErgonomics({
    dailyScreenHours: parseFloat(screenHoursStr),
    breakIntervalMinutes: parseFloat(breakMinsStr),
    hasDryEyesOrBlur: hasDryEyes,
  });

  const hydrationReport = calculateHydration({
    weightKg: parseFloat(hydroWeightStr),
    activityMinutesDaily: parseFloat(activityMinsStr),
    isHotClimate,
  });

  const TABS: readonly { id: HealthToolTab; label: MessageKey; icon: typeof Scale }[] = [
    { id: 'BODY_BMI', label: 'assist.calc.tab.body', icon: Scale },
    { id: 'SLEEP', label: 'assist.calc.tab.sleep', icon: Moon },
    { id: 'CARDIO', label: 'assist.calc.tab.cardio', icon: Heart },
    { id: 'VISION', label: 'assist.calc.tab.vision', icon: Eye },
    { id: 'HYDRATION', label: 'assist.calc.tab.hydration', icon: Droplets },
  ];

  const inputStyle = [styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }];
  const errorBox = (raw: string | undefined) => (
    <View style={[styles.alertBox, { backgroundColor: tokens.attentionBg, borderColor: tokens.attention }]}>
      <AlertCircle size={14} color={tokens.attention} />
      <Text style={[styles.alertText, { color: tokens.attention }]} accessibilityRole="alert">{calcError(t, raw)}</Text>
    </View>
  );
  const header = (Icon: typeof Scale, title: MessageKey, subtitle: MessageKey) => (
    <View style={styles.headerRow}>
      <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
        <Icon size={20} color={tokens.action} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: tokens.text }]}>{t(title)}</Text>
        <Text style={[styles.subtitle, { color: tokens.text2 }]}>{t(subtitle)}</Text>
      </View>
    </View>
  );
  const sleepDebtHours = Math.round(((sleepReport.sleepDebtMinutes ?? 0) / 60) * 10) / 10;

  return (
    <View style={styles.wrapper}>
      {/* Tab Navigation */}
      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isActive
                  ? { backgroundColor: tokens.action, borderColor: tokens.action }
                  : { backgroundColor: tokens.surface, borderColor: tokens.rule },
              ]}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="tab"
              aria-selected={isActive}
              accessibilityLabel={t(tab.label)}
            >
              <Icon size={16} color={isActive ? tokens.onAction : tokens.text2} />
              <Text style={[styles.tabBtnText, { color: isActive ? tokens.onAction : tokens.text }]}>
                {t(tab.label)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeTab === 'BODY_BMI' && <BodyMetricsCalculator />}

      {activeTab === 'SLEEP' && (
        <Card variant="surface" style={styles.container}>
          {header(Moon, 'assist.calc.sleep.title', 'assist.calc.sleep.subtitle')}

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.sleep.bed')}</Text>
              <TextInput style={inputStyle} value={bedHours} onChangeText={setBedHours} keyboardType="decimal-pad" accessibilityLabel={t('assist.calc.sleep.bed')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.sleep.asleep')}</Text>
              <TextInput style={inputStyle} value={sleepHours} onChangeText={setSleepHours} keyboardType="decimal-pad" accessibilityLabel={t('assist.calc.sleep.asleep')} />
            </View>
          </View>

          {sleepReport.isPhysiologicallyValid && sleepReport.efficiencyBand && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('assist.calc.sleep.label')}</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>{sleepReport.sleepEfficiencyPct}%</Text>
                  </View>
                  <Badge
                    label={t(SLEEP_LABEL[sleepReport.efficiencyBand])}
                    variant={sleepReport.efficiencyBand === 'optimal' ? 'positive' : 'attention'}
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>{t(SLEEP_CONTEXT[sleepReport.efficiencyBand])}</Text>
              </View>

              <View style={styles.miniGrid}>
                <View style={[styles.miniCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                  <Text style={[styles.miniTitle, { color: tokens.text2 }]}>{t('assist.calc.sleep.short')}</Text>
                  <Text style={[styles.miniVal, { color: tokens.text }]}>
                    {sleepDebtHours > 0 ? t('assist.calc.sleep.shortBy', { hours: sleepDebtHours }) : t('assist.calc.sleep.notShort')}
                  </Text>
                  <Text style={[styles.microText, { color: tokens.text3 }]}>{t('assist.calc.sleep.shortNote')}</Text>
                </View>
              </View>
            </View>
          )}

          {!sleepReport.isPhysiologicallyValid && errorBox(sleepReport.validationError)}
        </Card>
      )}

      {activeTab === 'CARDIO' && (
        <Card variant="surface" style={styles.container}>
          {header(Heart, 'assist.calc.bp.title', 'assist.calc.bp.subtitle')}

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.bp.systolic')}</Text>
              <TextInput style={inputStyle} value={sbpStr} onChangeText={setSbpStr} keyboardType="number-pad" accessibilityLabel={t('assist.calc.bp.systolicSpoken')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.bp.diastolic')}</Text>
              <TextInput style={inputStyle} value={dbpStr} onChangeText={setDbpStr} keyboardType="number-pad" accessibilityLabel={t('assist.calc.bp.diastolicSpoken')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.bp.heartRate')}</Text>
              <TextInput style={inputStyle} value={hrStr} onChangeText={setHrStr} keyboardType="number-pad" accessibilityLabel={t('assist.calc.bp.heartRateSpoken')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.age')}</Text>
              <TextInput style={inputStyle} value={cardioAgeStr} onChangeText={setCardioAgeStr} keyboardType="number-pad" accessibilityLabel={t('assist.calc.ageSpoken')} />
            </View>
          </View>

          {cardioReport.isPhysiologicallyValid && cardioReport.bpCategory && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('assist.calc.bp.label')}</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>
                      {cardioReport.meanArterialPressureMmHg} <Text style={{ fontSize: 14 }}>mmHg</Text>
                    </Text>
                  </View>
                  <Badge
                    label={t(BP_LABEL[cardioReport.bpCategory])}
                    variant={cardioReport.bpCategory === 'optimal' ? 'positive' : 'attention'}
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>
                  {t(BP_CONTEXT[cardioReport.bpCategory])} {t('assist.calc.bp.pulsePressure', { value: cardioReport.pulsePressureMmHg ?? '' })}
                </Text>
              </View>

              <Text style={[styles.sectionSubtitle, { color: tokens.text }]}>
                {t('assist.calc.zone.heading', { age: cardioAgeStr })}
              </Text>
              <View style={styles.zonesGrid}>
                {cardioReport.heartRateZones?.map((z, index) => {
                  const words = ZONES[index];
                  return (
                    <View key={z.name} style={[styles.zoneItem, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                      <Text style={[styles.zoneName, { color: tokens.text }]}>{words ? t(words.name) : z.name}</Text>
                      <Text style={[styles.zoneBpm, { color: tokens.action }]}>
                        {z.bpmRange.min} – {z.bpmRange.max} bpm
                      </Text>
                      <Text style={[styles.microText, { color: tokens.text3 }]}>{words ? t(words.purpose) : z.purpose}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.microText, { color: tokens.text3 }]}>{t('assist.calc.zone.note')}</Text>
            </View>
          )}

          {!cardioReport.isPhysiologicallyValid && errorBox(cardioReport.validationError)}
        </Card>
      )}

      {activeTab === 'VISION' && (
        <Card variant="surface" style={styles.container}>
          {header(Eye, 'assist.calc.eyes.title', 'assist.calc.eyes.subtitle')}

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.eyes.screenHours')}</Text>
              <TextInput style={inputStyle} value={screenHoursStr} onChangeText={setScreenHoursStr} keyboardType="decimal-pad" accessibilityLabel={t('assist.calc.eyes.screenHours')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.eyes.breaks')}</Text>
              <TextInput style={inputStyle} value={breakMinsStr} onChangeText={setBreakMinsStr} keyboardType="number-pad" accessibilityLabel={t('assist.calc.eyes.breaks')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.eyes.symptoms')}</Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  hasDryEyes
                    ? { backgroundColor: tokens.action, borderColor: tokens.action }
                    : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
                ]}
                onPress={() => setHasDryEyes((prev) => !prev)}
                accessibilityRole="switch"
                aria-checked={hasDryEyes}
                accessibilityLabel={t('assist.calc.eyes.symptomsSpoken')}
              >
                <Text style={[styles.toggleBtnText, { color: hasDryEyes ? tokens.onAction : tokens.text }]}>
                  {hasDryEyes ? t('assist.calc.eyes.yes') : t('assist.calc.eyes.no')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {visionReport.isPhysiologicallyValid && visionReport.riskBand && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('assist.calc.eyes.label')}</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>{t(EYE_LABEL[visionReport.riskBand])}</Text>
                  </View>
                  <Badge
                    label={visionReport.riskBand === 'low' ? t('assist.calc.eyes.breaksOk') : t('assist.calc.eyes.moreBreaks')}
                    variant={visionReport.riskBand === 'low' ? 'positive' : 'attention'}
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>{t(EYE_CONTEXT[visionReport.riskBand])}</Text>
              </View>

              <View style={[styles.adviceBox, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <CheckCircle2 size={16} color={tokens.positive} />
                <Text style={[styles.adviceText, { color: tokens.text }]}>
                  <Text style={{ fontWeight: '700' }}>{t('assist.calc.eyes.ruleTitle')} </Text>
                  {t('assist.calc.eyes.rule')}
                </Text>
              </View>
            </View>
          )}

          {!visionReport.isPhysiologicallyValid && errorBox(visionReport.validationError)}
        </Card>
      )}

      {activeTab === 'HYDRATION' && (
        <Card variant="surface" style={styles.container}>
          {header(Droplets, 'assist.calc.fluid.title', 'assist.calc.fluid.subtitle')}

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.weight')}</Text>
              <TextInput style={inputStyle} value={hydroWeightStr} onChangeText={setHydroWeightStr} keyboardType="decimal-pad" accessibilityLabel={t('assist.calc.weightSpoken')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.fluid.exercise')}</Text>
              <TextInput style={inputStyle} value={activityMinsStr} onChangeText={setActivityMinsStr} keyboardType="number-pad" accessibilityLabel={t('assist.calc.fluid.exercise')} />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.fluid.heat')}</Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  isHotClimate
                    ? { backgroundColor: tokens.action, borderColor: tokens.action }
                    : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
                ]}
                onPress={() => setIsHotClimate((prev) => !prev)}
                accessibilityRole="switch"
                aria-checked={isHotClimate}
                accessibilityLabel={t('assist.calc.fluid.heatSpoken')}
              >
                <Text style={[styles.toggleBtnText, { color: isHotClimate ? tokens.onAction : tokens.text }]}>
                  {isHotClimate ? t('assist.calc.fluid.hot') : t('assist.calc.fluid.mild')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {hydrationReport.isPhysiologicallyValid && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('assist.calc.fluid.label')}</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>
                      {hydrationReport.recommendedDailyLiters} <Text style={{ fontSize: 16 }}>{t('assist.calc.fluid.unit')}</Text>
                    </Text>
                  </View>
                  <Badge label={t('assist.calc.fluid.glasses', { count: hydrationReport.glassCount8Oz ?? 0 })} variant="mono" />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>{t('assist.calc.fluid.ctx')}</Text>
              </View>
            </View>
          )}

          {!hydrationReport.isPhysiologicallyValid && errorBox(hydrationReport.validationError)}
        </Card>
      )}

      {/* Footer Medical Disclaimer */}
      <View style={[styles.globalDisclaimer, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft }]}>
        <Info size={14} color={tokens.text3} />
        <Text style={[styles.globalDisclaimerText, { color: tokens.text3 }]}>{t('assist.calc.disclaimer')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 12,
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  container: {
    padding: 18,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  inputsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
    minWidth: 120,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  toggleBtn: {
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 6,
    marginBottom: 10,
  },
  primaryCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bigVal: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 2,
  },
  contextNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  miniGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  miniCard: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniVal: {
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  microText: {
    fontSize: 10,
    lineHeight: 14,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 8,
  },
  zonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  zoneItem: {
    flex: 1,
    minWidth: 130,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  zoneName: {
    fontSize: 11,
    fontWeight: '700',
  },
  zoneBpm: {
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 2,
  },
  adviceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  adviceText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  alertText: {
    fontSize: 12,
    flex: 1,
  },
  globalDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  globalDisclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
