import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../Card';
import { Badge } from '../Badge';
import { BodyMetricsCalculator } from './BodyMetricsCalculator';
import {
  calculateSleepMetrics,
  calculateCardioMetrics,
  calculateVisionErgonomics,
  calculateHydration,
} from '../../core/clinical';
import {
  Scale,
  Moon,
  Heart,
  Eye,
  Droplets,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

export type HealthToolTab = 'BODY_BMI' | 'SLEEP' | 'CARDIO' | 'VISION' | 'HYDRATION';

export function ComprehensiveHealthCalculators(): React.ReactElement {
  const { tokens } = useTheme();
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

  // Computed Sleep
  const sleepReport = calculateSleepMetrics({
    timeInBedMinutes: parseFloat(bedHours) * 60,
    totalSleepMinutes: parseFloat(sleepHours) * 60,
  });

  // Computed Cardio
  const cardioReport = calculateCardioMetrics({
    systolicBp: parseFloat(sbpStr),
    diastolicBp: parseFloat(dbpStr),
    restingHeartRateBpm: parseFloat(hrStr) || undefined,
    ageYears: parseFloat(cardioAgeStr) || undefined,
  });

  // Computed Vision
  const visionReport = calculateVisionErgonomics({
    dailyScreenHours: parseFloat(screenHoursStr),
    breakIntervalMinutes: parseFloat(breakMinsStr),
    hasDryEyesOrBlur: hasDryEyes,
  });

  // Computed Hydration
  const hydrationReport = calculateHydration({
    weightKg: parseFloat(hydroWeightStr),
    activityMinutesDaily: parseFloat(activityMinsStr),
    isHotClimate,
  });

  const TABS = [
    { id: 'BODY_BMI' as const, label: 'Body & BMI', icon: Scale },
    { id: 'SLEEP' as const, label: 'Sleep & Recovery', icon: Moon },
    { id: 'CARDIO' as const, label: 'Cardio & Vitals', icon: Heart },
    { id: 'VISION' as const, label: 'Vision & Screen', icon: Eye },
    { id: 'HYDRATION' as const, label: 'Hydration', icon: Droplets },
  ];

  return (
    <View style={styles.wrapper}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tabBtn,
                isActive
                  ? { backgroundColor: tokens.action, borderColor: tokens.action }
                  : { backgroundColor: tokens.surface, borderColor: tokens.rule },
              ]}
              onPress={() => setActiveTab(t.id)}
              accessibilityRole="tab"
              accessibilityLabel={`Select ${t.label} tool`}
            >
              <Icon size={16} color={isActive ? '#FFFFFF' : tokens.text2} />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: isActive ? '#FFFFFF' : tokens.text },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content */}
      {activeTab === 'BODY_BMI' && <BodyMetricsCalculator />}

      {activeTab === 'SLEEP' && (
        <Card variant="surface" style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
              <Moon size={20} color={tokens.action} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.text }]}>Clinical Sleep Efficiency & Debt</Text>
              <Text style={[styles.subtitle, { color: tokens.text2 }]}>
                Polysomnography efficiency formulas for student rest restoration
              </Text>
            </View>
            <Badge label="REST ARCHITECTURE" variant="mono" />
          </View>

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Time in Bed (hours)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={bedHours}
                onChangeText={setBedHours}
                keyboardType="decimal-pad"
                accessibilityLabel="Time in bed in hours"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Actual Asleep Duration (hours)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={sleepHours}
                onChangeText={setSleepHours}
                keyboardType="decimal-pad"
                accessibilityLabel="Actual sleep duration in hours"
              />
            </View>
          </View>

          {sleepReport.isPhysiologicallyValid && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>SLEEP EFFICIENCY</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>
                      {sleepReport.sleepEfficiencyPct}%
                    </Text>
                  </View>
                  <Badge
                    label={sleepReport.efficiencyDisplay ?? ''}
                    variant={sleepReport.efficiencyBand === 'optimal' ? 'positive' : 'attention'}
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>
                  {sleepReport.clinicalContext}
                </Text>
              </View>

              <View style={styles.miniGrid}>
                <View style={[styles.miniCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                  <Text style={[styles.miniTitle, { color: tokens.text2 }]}>Sleep Debt Index</Text>
                  <Text style={[styles.miniVal, { color: tokens.text }]}>{sleepReport.sleepDebtDisplay}</Text>
                  <Text style={[styles.microText, { color: tokens.text3 }]}>Target: 8 hours restorative sleep.</Text>
                </View>
              </View>
            </View>
          )}

          {!sleepReport.isPhysiologicallyValid && (
            <View style={[styles.alertBox, { backgroundColor: tokens.attentionBg, borderColor: tokens.attention }]}>
              <AlertCircle size={14} color={tokens.attention} />
              <Text style={[styles.alertText, { color: tokens.attention }]}>{sleepReport.validationError}</Text>
            </View>
          )}
        </Card>
      )}

      {activeTab === 'CARDIO' && (
        <Card variant="surface" style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
              <Heart size={20} color={tokens.action} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.text }]}>Cardiovascular Hemodynamics</Text>
              <Text style={[styles.subtitle, { color: tokens.text2 }]}>
                Mean Arterial Pressure (MAP) & Karvonen Heart Rate Training Zones
              </Text>
            </View>
            <Badge label="HEMODYNAMICS" variant="mono" />
          </View>

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Systolic (mmHg)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={sbpStr}
                onChangeText={setSbpStr}
                keyboardType="number-pad"
                accessibilityLabel="Systolic blood pressure in mmHg"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Diastolic (mmHg)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={dbpStr}
                onChangeText={setDbpStr}
                keyboardType="number-pad"
                accessibilityLabel="Diastolic blood pressure in mmHg"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Resting Heart Rate (bpm)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={hrStr}
                onChangeText={setHrStr}
                keyboardType="number-pad"
                accessibilityLabel="Resting heart rate in beats per minute"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Age (Years)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={cardioAgeStr}
                onChangeText={setCardioAgeStr}
                keyboardType="number-pad"
                accessibilityLabel="Age in years for target heart rate calculation"
              />
            </View>
          </View>

          {cardioReport.isPhysiologicallyValid && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>MEAN ARTERIAL PRESSURE (MAP)</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>
                      {cardioReport.meanArterialPressureMmHg} <Text style={{ fontSize: 14 }}>mmHg</Text>
                    </Text>
                  </View>
                  <Badge
                    label={cardioReport.bpCategoryDisplay ?? ''}
                    variant={cardioReport.bpCategory === 'optimal' ? 'positive' : 'attention'}
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>
                  {cardioReport.clinicalContext} Pulse pressure: {cardioReport.pulsePressureMmHg} mmHg.
                </Text>
              </View>

              <Text style={[styles.sectionSubtitle, { color: tokens.text }]}>
                Karvonen Heart Rate Target Zones (Age {cardioAgeStr}):
              </Text>
              <View style={styles.zonesGrid}>
                {cardioReport.heartRateZones?.map((z) => (
                  <View key={z.name} style={[styles.zoneItem, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                    <Text style={[styles.zoneName, { color: tokens.text }]}>{z.name}</Text>
                    <Text style={[styles.zoneBpm, { color: tokens.action }]}>
                      {z.bpmRange.min} – {z.bpmRange.max} bpm
                    </Text>
                    <Text style={[styles.microText, { color: tokens.text3 }]}>{z.purpose}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!cardioReport.isPhysiologicallyValid && (
            <View style={[styles.alertBox, { backgroundColor: tokens.attentionBg, borderColor: tokens.attention }]}>
              <AlertCircle size={14} color={tokens.attention} />
              <Text style={[styles.alertText, { color: tokens.attention }]}>{cardioReport.validationError}</Text>
            </View>
          )}
        </Card>
      )}

      {activeTab === 'VISION' && (
        <Card variant="surface" style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
              <Eye size={20} color={tokens.action} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.text }]}>Digital Eye Strain (Asthenopia) Index</Text>
              <Text style={[styles.subtitle, { color: tokens.text2 }]}>
                20-20-20 ophthalmological micro-break schedule for campus screen sessions
              </Text>
            </View>
            <Badge label="OCULAR ERGONOMICS" variant="mono" />
          </View>

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Daily Screen Hours</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={screenHoursStr}
                onChangeText={setScreenHoursStr}
                keyboardType="decimal-pad"
                accessibilityLabel="Daily screen hours"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Break Interval (minutes)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={breakMinsStr}
                onChangeText={setBreakMinsStr}
                keyboardType="number-pad"
                accessibilityLabel="Break interval in minutes"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Dry Eye / Blur Symptoms</Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  hasDryEyes
                    ? { backgroundColor: tokens.action, borderColor: tokens.action }
                    : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
                ]}
                onPress={() => setHasDryEyes((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Toggle dry eyes or blur symptom status"
              >
                <Text style={[styles.toggleBtnText, { color: hasDryEyes ? '#FFFFFF' : tokens.text }]}>
                  {hasDryEyes ? '✓ Symptoms Present' : 'None Reported'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {visionReport.isPhysiologicallyValid && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>ASTHENOPIA RISK INDEX</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>
                      {visionReport.riskDisplay}
                    </Text>
                  </View>
                  <Badge
                    label={visionReport.riskBand === 'low' ? 'Optimal Ergonomics' : 'Review Breaks'}
                    variant={visionReport.riskBand === 'low' ? 'positive' : 'attention'}
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>
                  {visionReport.clinicalContext}
                </Text>
              </View>

              <View style={[styles.adviceBox, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <CheckCircle2 size={16} color={tokens.positive} />
                <Text style={[styles.adviceText, { color: tokens.text }]}>
                  <Text style={{ fontWeight: '700' }}>The 20-20-20 Protocol: </Text>
                  {visionReport.breakAdvice}
                </Text>
              </View>
            </View>
          )}
        </Card>
      )}

      {activeTab === 'HYDRATION' && (
        <Card variant="surface" style={styles.container}>
          <View style={styles.headerRow}>
            <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
              <Droplets size={20} color={tokens.action} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: tokens.text }]}>ICMR Campus Hydration Advisor</Text>
              <Text style={[styles.subtitle, { color: tokens.text2 }]}>
                Subtropical climate & physical exertion fluid replacement calculation
              </Text>
            </View>
            <Badge label="FLUID BALANCE" variant="mono" />
          </View>

          <View style={styles.inputsGrid}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Weight (kg)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={hydroWeightStr}
                onChangeText={setHydroWeightStr}
                keyboardType="decimal-pad"
                accessibilityLabel="Weight in kg"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Exercise Duration (mins/day)</Text>
              <TextInput
                style={[styles.textInput, { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas }]}
                value={activityMinsStr}
                onChangeText={setActivityMinsStr}
                keyboardType="number-pad"
                accessibilityLabel="Exercise duration in minutes"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Indian Subtropical Heat</Text>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  isHotClimate
                    ? { backgroundColor: tokens.action, borderColor: tokens.action }
                    : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
                ]}
                onPress={() => setIsHotClimate((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Toggle hot climate adjustment"
              >
                <Text style={[styles.toggleBtnText, { color: isHotClimate ? '#FFFFFF' : tokens.text }]}>
                  {isHotClimate ? '☀️ Summer / High Heat (+500ml)' : 'Moderate Weather'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {hydrationReport.isPhysiologicallyValid && (
            <View style={styles.resultsContainer}>
              <View style={[styles.primaryCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
                <View style={styles.metricHeader}>
                  <View>
                    <Text style={[styles.metricLabel, { color: tokens.text2 }]}>RECOMMENDED DAILY FLUID</Text>
                    <Text style={[styles.bigVal, { color: tokens.text }]}>
                      {hydrationReport.recommendedDailyLiters} <Text style={{ fontSize: 16 }}>Liters / day</Text>
                    </Text>
                  </View>
                  <Badge
                    label={`≈ ${hydrationReport.glassCount8Oz} glasses (250ml)`}
                    variant="positive"
                  />
                </View>
                <Text style={[styles.contextNote, { color: tokens.text2 }]}>
                  {hydrationReport.clinicalContext}
                </Text>
              </View>
            </View>
          )}
        </Card>
      )}

      {/* Footer Medical Disclaimer */}
      <View style={[styles.globalDisclaimer, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft }]}>
        <Info size={14} color={tokens.text3} />
        <Text style={[styles.globalDisclaimerText, { color: tokens.text3 }]}>
          All calculators provide descriptive reference guidelines based on ICMR, WHO, and AHA consensus standards.
          No individual diagnostic assertion is made. Review with student health centre clinicians during campus camps.
        </Text>
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
