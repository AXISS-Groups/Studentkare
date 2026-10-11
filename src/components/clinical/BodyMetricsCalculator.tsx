import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../Card';
import { Badge } from '../Badge';
import {
  calculateBodyMetrics,
  BiologicalSex,
  BmiCategory,
  BodyMetricsReport,
} from '../../core/clinical/bodyMetrics';
import { Activity, Scale, Heart, Info, AlertCircle } from './calculatorIcons';
import { useT } from '@/i18n';
import type { MessageKey } from '@/i18n';

export interface BodyMetricsCalculatorProps {
  initialHeightCm?: number;
  initialWeightKg?: number;
  initialAge?: number;
  initialSex?: BiologicalSex;
  onMetricsCalculated?: (report: BodyMetricsReport) => void;
  compact?: boolean;
}

/** Badge tone for a BMI category. Body metrics never use the emergency (red) tone. */
export function bmiBadgeVariant(category?: string): 'positive' | 'attention' | 'mono' {
  switch (category) {
    case 'healthy':
      return 'positive';
    // DESIGN.md §3: a value outside range is amber, never red.
    case 'underweight':
    case 'overweight':
    case 'obese':
      return 'attention';
    default:
      return 'mono';
  }
}

/**
 * The calculator's own words for each BMI band. The core library's labels
 * ("Elevated cardiometabolic risk", "Obese") read as a diagnosis from two
 * numbers; BMI is a screening figure, so the screen describes the range only.
 */
const BMI_LABEL: Record<BmiCategory, MessageKey> = {
  underweight: 'assist.calc.bmi.under',
  healthy: 'assist.calc.bmi.usual',
  overweight: 'assist.calc.bmi.over',
  obese: 'assist.calc.bmi.wellOver',
};
const BMI_CONTEXT: Record<BmiCategory, MessageKey> = {
  underweight: 'assist.calc.bmi.underBody',
  healthy: 'assist.calc.bmi.usualBody',
  overweight: 'assist.calc.bmi.overBody',
  obese: 'assist.calc.bmi.overBody',
};

/** Validation messages the calculators can show, keyed by the core library's English text. */
export const CALC_ERRORS: Readonly<Record<string, MessageKey>> = {
  'Height must be between 50 cm and 250 cm.': 'assist.calc.err.height',
  'Weight must be between 20 kg and 300 kg.': 'assist.calc.err.weight',
  'Age must be between 16 and 120 years.': 'assist.calc.err.age',
  'Waist circumference must be between 30 cm and 220 cm.': 'assist.calc.err.waist',
  'Invalid physiological inputs.': 'assist.calc.err.numbers',
  'Time in bed must be between 1 hour and 24 hours.': 'assist.calc.err.bed',
  'Total sleep duration cannot exceed time spent in bed.': 'assist.calc.err.sleep',
  'Invalid sleep inputs.': 'assist.calc.err.numbers',
  'Systolic blood pressure must be between 60 mmHg and 280 mmHg.': 'assist.calc.err.systolic',
  'Diastolic blood pressure must be between 30 mmHg and 180 mmHg.': 'assist.calc.err.diastolic',
  'Systolic pressure must be greater than diastolic pressure.': 'assist.calc.err.bpOrder',
  'Resting heart rate must be between 30 bpm and 220 bpm.': 'assist.calc.err.heartRate',
  'Invalid cardiovascular inputs.': 'assist.calc.err.numbers',
  'Daily screen hours must be between 0 and 24.': 'assist.calc.err.screen',
  'Break interval must be between 5 and 480 minutes.': 'assist.calc.err.breaks',
  'Invalid vision ergonomics inputs.': 'assist.calc.err.numbers',
  'Activity duration must be between 0 and 480 minutes.': 'assist.calc.err.activity',
  'Invalid hydration inputs.': 'assist.calc.err.numbers',
};

export function calcError(t: (key: MessageKey) => string, raw: string | undefined): string {
  if (!raw) return t('assist.calc.err.numbers');
  const key = CALC_ERRORS[raw];
  return key ? t(key) : raw;
}

export function BodyMetricsCalculator({
  initialHeightCm = 170,
  initialWeightKg = 65,
  initialAge = 20,
  initialSex = 'female',
  onMetricsCalculated,
  compact: _compact = false,
}: BodyMetricsCalculatorProps): React.ReactElement {
  const { tokens, typography } = useTheme();
  const t = useT();

  const [heightStr, setHeightStr] = useState(String(initialHeightCm));
  const [weightStr, setWeightStr] = useState(String(initialWeightKg));
  const [ageStr, setAgeStr] = useState(String(initialAge));
  const [sex, setSex] = useState<BiologicalSex>(initialSex);
  const [waistStr, setWaistStr] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const parsedHeight = parseFloat(heightStr);
  const parsedWeight = parseFloat(weightStr);
  const parsedAge = ageStr.trim() ? parseFloat(ageStr) : undefined;
  const parsedWaist = waistStr.trim() ? parseFloat(waistStr) : undefined;

  const report: BodyMetricsReport = useMemo(() => {
    if (!Number.isFinite(parsedHeight) || !Number.isFinite(parsedWeight)) {
      return {
        isPhysiologicallyValid: false,
        validationError: 'Invalid physiological inputs.',
      };
    }

    const res = calculateBodyMetrics({
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      ageYears: parsedAge,
      sex,
      waistCm: parsedWaist,
    });

    if (res.isPhysiologicallyValid && onMetricsCalculated) {
      onMetricsCalculated(res);
    }
    return res;
  }, [parsedHeight, parsedWeight, parsedAge, sex, parsedWaist, onMetricsCalculated]);

  const inputStyle = [
    styles.textInput,
    { borderColor: tokens.rule, color: tokens.text, backgroundColor: tokens.canvas, fontFamily: typography.fontMono },
  ];
  const sexButton = (value: BiologicalSex, label: MessageKey, spoken: MessageKey) => (
    <TouchableOpacity
      style={[
        styles.sexBtn,
        sex === value
          ? { backgroundColor: tokens.action, borderColor: tokens.action }
          : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
      ]}
      onPress={() => setSex(value)}
      accessibilityRole="button"
      accessibilityLabel={t(spoken)}
      aria-selected={sex === value}
    >
      <Text style={[styles.sexBtnText, { color: sex === value ? tokens.onAction : tokens.text }]}>{t(label)}</Text>
    </TouchableOpacity>
  );

  return (
    <Card variant="surface" style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
          <Scale size={20} color={tokens.action} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: tokens.text }]}>{t('assist.calc.bmi.title')}</Text>
          <Text style={[styles.subtitle, { color: tokens.text2 }]}>{t('assist.calc.bmi.subtitle')}</Text>
        </View>
      </View>

      {/* Input Grid */}
      <View style={styles.inputsGrid}>
        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.height')}</Text>
          <TextInput
            style={inputStyle}
            value={heightStr}
            onChangeText={setHeightStr}
            keyboardType="decimal-pad"
            placeholder={t('assist.calc.eg', { value: 172 })}
            placeholderTextColor={tokens.text3}
            accessibilityLabel={t('assist.calc.heightSpoken')}
            accessibilityRole="none"
          />
        </View>

        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.weight')}</Text>
          <TextInput
            style={inputStyle}
            value={weightStr}
            onChangeText={setWeightStr}
            keyboardType="decimal-pad"
            placeholder={t('assist.calc.eg', { value: 64 })}
            placeholderTextColor={tokens.text3}
            accessibilityLabel={t('assist.calc.weightSpoken')}
            accessibilityRole="none"
          />
        </View>

        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.sex')}</Text>
          <View style={styles.sexToggleRow}>
            {sexButton('female', 'assist.calc.female', 'assist.calc.femaleSpoken')}
            {sexButton('male', 'assist.calc.male', 'assist.calc.maleSpoken')}
          </View>
        </View>
      </View>

      {/* Advanced Toggle */}
      <View style={styles.advancedToggleRow}>
        <TouchableOpacity
          onPress={() => setShowAdvanced((prev) => !prev)}
          style={styles.toggleLink}
          accessibilityRole="button"
          accessibilityLabel={t('assist.calc.optionalSpoken')}
          aria-expanded={showAdvanced}
        >
          <Text style={[styles.toggleLinkText, { color: tokens.action }]}>
            {showAdvanced ? t('assist.calc.hideOptional') : t('assist.calc.showOptional')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Fields */}
      {showAdvanced && (
        <View style={styles.inputsGrid}>
          <View style={styles.inputCol}>
            <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.age')}</Text>
            <TextInput
              style={inputStyle}
              value={ageStr}
              onChangeText={setAgeStr}
              keyboardType="number-pad"
              placeholder={t('assist.calc.eg', { value: 21 })}
              placeholderTextColor={tokens.text3}
              accessibilityLabel={t('assist.calc.ageSpoken')}
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={[styles.inputLabel, { color: tokens.text2 }]}>{t('assist.calc.waist')}</Text>
            <TextInput
              style={inputStyle}
              value={waistStr}
              onChangeText={setWaistStr}
              keyboardType="decimal-pad"
              placeholder={t('assist.calc.eg', { value: 76 })}
              placeholderTextColor={tokens.text3}
              accessibilityLabel={t('assist.calc.waistSpoken')}
            />
          </View>
        </View>
      )}

      {/* Error Banner */}
      {!report.isPhysiologicallyValid && (
        <View
          style={[
            styles.noticeBox,
            { backgroundColor: tokens.attentionBg, borderColor: tokens.attention },
          ]}
        >
          <AlertCircle size={16} color={tokens.attention} />
          <Text style={[styles.noticeText, { color: tokens.attention }]} accessibilityRole="alert">
            {calcError(t, report.validationError)}
          </Text>
        </View>
      )}

      {/* Results Section */}
      {report.isPhysiologicallyValid && report.bmi && (
        <View style={styles.resultsContainer}>
          <View style={[styles.primaryBmiCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
            <View style={styles.bmiHeader}>
              <View>
                <Text style={[styles.metricLabel, { color: tokens.text2 }]}>{t('assist.calc.bmi.label')}</Text>
                <Text style={[styles.bmiValue, { color: tokens.text }]}>
                  {report.bmi.bmi}{' '}
                  <Text style={[styles.bmiUnit, { color: tokens.text3 }]}>kg/m²</Text>
                </Text>
              </View>
              <Badge
                label={t(BMI_LABEL[report.bmi.category])}
                variant={bmiBadgeVariant(report.bmi.category)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.ruleSoft }]} />

            <View style={styles.rangeRow}>
              <Text style={[styles.smallText, { color: tokens.text2 }]}>
                {t('assist.calc.bmi.usualRange')}{' '}
                <Text style={{ fontFamily: typography.fontMono, color: tokens.text }}>
                  {report.bmi.referenceBand}
                </Text>
              </Text>
              <Text style={[styles.smallText, { color: tokens.text2 }]}>
                {t('assist.calc.bmi.usualWeight', { height: parsedHeight })}{' '}
                <Text style={{ fontFamily: typography.fontMono, color: tokens.text }}>
                  {report.bmi.healthyWeightRangeKg.min} – {report.bmi.healthyWeightRangeKg.max} kg
                </Text>
              </Text>
            </View>

            <Text style={[styles.contextNote, { color: tokens.text2 }]}>
              {t(BMI_CONTEXT[report.bmi.category])}
            </Text>
          </View>

          <View style={styles.metricsGrid}>
            {report.bmr && (
              <View style={[styles.metricCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={styles.metricCardHeader}>
                  <Heart size={14} color={tokens.action} />
                  <Text style={[styles.smallMetricTitle, { color: tokens.text2 }]}>{t('assist.calc.bmr.title')}</Text>
                </View>
                <Text style={[styles.metricCardVal, { color: tokens.text }]}>
                  {report.bmr.bmrKcal} <Text style={[styles.smallUnit, { color: tokens.text3 }]}>kcal/day</Text>
                </Text>
                <Text style={[styles.microText, { color: tokens.text3 }]}>{t('assist.calc.bmr.body')}</Text>
              </View>
            )}

            {report.whtr && (
              <View style={[styles.metricCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={styles.metricCardHeader}>
                  <Activity size={14} color={report.whtr.isWithinOptimal ? tokens.positive : tokens.attention} />
                  <Text style={[styles.smallMetricTitle, { color: tokens.text2 }]}>{t('assist.calc.whtr.title')}</Text>
                </View>
                <Text style={[styles.metricCardVal, { color: tokens.text }]}>
                  {report.whtr.ratio}{' '}
                  <Badge
                    label={report.whtr.isWithinOptimal ? t('assist.calc.whtr.under') : t('assist.calc.whtr.over')}
                    variant={report.whtr.isWithinOptimal ? 'positive' : 'attention'}
                  />
                </Text>
                <Text style={[styles.microText, { color: tokens.text3 }]}>
                  {report.whtr.isWithinOptimal ? t('assist.calc.whtr.underBody') : t('assist.calc.whtr.overBody')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Disclaimer */}
      <View style={[styles.disclaimerBox, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft }]}>
        <Info size={14} color={tokens.text3} />
        <Text style={[styles.disclaimerText, { color: tokens.text3 }]}>{t('assist.calc.bmi.disclaimer')}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 12,
    marginVertical: 12,
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
  sexToggleRow: {
    flexDirection: 'row',
    gap: 6,
    height: 44,
  },
  sexBtn: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  advancedToggleRow: {
    marginBottom: 12,
  },
  toggleLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  toggleLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  resultsContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  primaryBmiCard: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  bmiValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  bmiUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  rangeRow: {
    gap: 4,
    marginBottom: 8,
  },
  smallText: {
    fontSize: 12,
  },
  contextNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  metricCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  smallMetricTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricCardVal: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 4,
  },
  smallUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
  microText: {
    fontSize: 10,
    lineHeight: 14,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  disclaimerText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
});
