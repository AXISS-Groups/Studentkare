import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Card } from '../Card';
import { Badge } from '../Badge';
import {
  calculateBodyMetrics,
  BiologicalSex,
  BodyMetricsReport,
} from '../../core/clinical/bodyMetrics';
import { Activity, Scale, Heart, Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface BodyMetricsCalculatorProps {
  initialHeightCm?: number;
  initialWeightKg?: number;
  initialAge?: number;
  initialSex?: BiologicalSex;
  onMetricsCalculated?: (report: BodyMetricsReport) => void;
  compact?: boolean;
}

export function BodyMetricsCalculator({
  initialHeightCm = 170,
  initialWeightKg = 65,
  initialAge = 20,
  initialSex = 'female',
  onMetricsCalculated,
  compact = false,
}: BodyMetricsCalculatorProps): React.ReactElement {
  const { tokens, typography, radius, spacing } = useTheme();

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
        validationError: 'Please enter valid numerical height and weight values.',
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

  const getBmiBadgeVariant = (category?: string): 'positive' | 'attention' | 'emergency' | 'mono' => {
    switch (category) {
      case 'healthy':
        return 'positive';
      case 'underweight':
      case 'overweight':
        return 'attention';
      case 'obese':
        return 'emergency';
      default:
        return 'mono';
    }
  };

  return (
    <Card variant="surface" style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconCircle, { backgroundColor: tokens.surface2 }]}>
          <Scale size={20} color={tokens.action} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: tokens.text }]}>Body Metrics & BMI Clinical Report</Text>
          <Text style={[styles.subtitle, { color: tokens.text2 }]}>
            ICMR Asia-Pacific standards for Indian campus populations
          </Text>
        </View>
        <Badge label="RULE L COMPLIANT" variant="mono" />
      </View>

      {/* Input Grid */}
      <View style={styles.inputsGrid}>
        {/* Height Input */}
        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Height (cm)</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: tokens.rule,
                color: tokens.text,
                backgroundColor: tokens.canvas,
                fontFamily: typography.fontMono,
              },
            ]}
            value={heightStr}
            onChangeText={setHeightStr}
            keyboardType="decimal-pad"
            placeholder="e.g. 172"
            placeholderTextColor={tokens.text3}
            accessibilityLabel="Height in centimeters"
            accessibilityRole="none"
          />
        </View>

        {/* Weight Input */}
        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Weight (kg)</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: tokens.rule,
                color: tokens.text,
                backgroundColor: tokens.canvas,
                fontFamily: typography.fontMono,
              },
            ]}
            value={weightStr}
            onChangeText={setWeightStr}
            keyboardType="decimal-pad"
            placeholder="e.g. 64"
            placeholderTextColor={tokens.text3}
            accessibilityLabel="Weight in kilograms"
            accessibilityRole="none"
          />
        </View>

        {/* Sex Selector */}
        <View style={styles.inputCol}>
          <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Biological Sex</Text>
          <View style={styles.sexToggleRow}>
            <TouchableOpacity
              style={[
                styles.sexBtn,
                sex === 'female'
                  ? { backgroundColor: tokens.action, borderColor: tokens.action }
                  : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
              ]}
              onPress={() => setSex('female')}
              accessibilityRole="button"
              accessibilityLabel="Select Female biological sex"
            >
              <Text style={[styles.sexBtnText, { color: sex === 'female' ? '#FFFFFF' : tokens.text }]}>
                Female
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sexBtn,
                sex === 'male'
                  ? { backgroundColor: tokens.action, borderColor: tokens.action }
                  : { backgroundColor: tokens.canvas, borderColor: tokens.rule },
              ]}
              onPress={() => setSex('male')}
              accessibilityRole="button"
              accessibilityLabel="Select Male biological sex"
            >
              <Text style={[styles.sexBtnText, { color: sex === 'male' ? '#FFFFFF' : tokens.text }]}>
                Male
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Advanced Toggle */}
      <View style={styles.advancedToggleRow}>
        <TouchableOpacity
          onPress={() => setShowAdvanced((prev) => !prev)}
          style={styles.toggleLink}
          accessibilityRole="button"
          accessibilityLabel="Toggle optional metrics fields"
        >
          <Text style={[styles.toggleLinkText, { color: tokens.action }]}>
            {showAdvanced ? '− Hide optional vitals' : '+ Add Age & Waist Circumference (for BMR & WHtR)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Advanced Fields */}
      {showAdvanced && (
        <View style={styles.inputsGrid}>
          <View style={styles.inputCol}>
            <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Age (years)</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: tokens.rule,
                  color: tokens.text,
                  backgroundColor: tokens.canvas,
                  fontFamily: typography.fontMono,
                },
              ]}
              value={ageStr}
              onChangeText={setAgeStr}
              keyboardType="number-pad"
              placeholder="e.g. 21"
              placeholderTextColor={tokens.text3}
              accessibilityLabel="Age in years"
            />
          </View>

          <View style={styles.inputCol}>
            <Text style={[styles.inputLabel, { color: tokens.text2 }]}>Waist Circumference (cm)</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  borderColor: tokens.rule,
                  color: tokens.text,
                  backgroundColor: tokens.canvas,
                  fontFamily: typography.fontMono,
                },
              ]}
              value={waistStr}
              onChangeText={setWaistStr}
              keyboardType="decimal-pad"
              placeholder="e.g. 76"
              placeholderTextColor={tokens.text3}
              accessibilityLabel="Waist circumference in centimeters"
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
          <Text style={[styles.noticeText, { color: tokens.attention }]}>
            {report.validationError}
          </Text>
        </View>
      )}

      {/* Results Section */}
      {report.isPhysiologicallyValid && report.bmi && (
        <View style={styles.resultsContainer}>
          {/* Primary BMI Banner */}
          <View style={[styles.primaryBmiCard, { backgroundColor: tokens.surface2, borderColor: tokens.rule }]}>
            <View style={styles.bmiHeader}>
              <View>
                <Text style={[styles.metricLabel, { color: tokens.text2 }]}>BODY MASS INDEX (BMI)</Text>
                <Text style={[styles.bmiValue, { color: tokens.text }]}>
                  {report.bmi.bmi}{' '}
                  <Text style={[styles.bmiUnit, { color: tokens.text3 }]}>kg/m²</Text>
                </Text>
              </View>
              <Badge
                label={report.bmi.categoryDisplay}
                variant={getBmiBadgeVariant(report.bmi.category)}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.ruleSoft }]} />

            <View style={styles.rangeRow}>
              <Text style={[styles.smallText, { color: tokens.text2 }]}>
                ICMR Asia-Pacific Reference Window:{' '}
                <Text style={{ fontFamily: typography.fontMono, color: tokens.text }}>
                  {report.bmi.referenceBand}
                </Text>
              </Text>
              <Text style={[styles.smallText, { color: tokens.text2 }]}>
                Healthy weight for {parsedHeight} cm:{' '}
                <Text style={{ fontFamily: typography.fontMono, color: tokens.text }}>
                  {report.bmi.healthyWeightRangeKg.min} – {report.bmi.healthyWeightRangeKg.max} kg
                </Text>
              </Text>
            </View>

            <Text style={[styles.contextNote, { color: tokens.text2 }]}>
              {report.bmi.clinicalContext}
            </Text>
          </View>

          {/* Secondary Metric Grid */}
          <View style={styles.metricsGrid}>
            {/* BMR */}
            {report.bmr && (
              <View style={[styles.metricCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={styles.metricCardHeader}>
                  <Heart size={14} color={tokens.action} />
                  <Text style={[styles.smallMetricTitle, { color: tokens.text2 }]}>Resting Energy (BMR)</Text>
                </View>
                <Text style={[styles.metricCardVal, { color: tokens.text }]}>
                  {report.bmr.bmrKcal} <Text style={[styles.smallUnit, { color: tokens.text3 }]}>kcal/day</Text>
                </Text>
                <Text style={[styles.microText, { color: tokens.text3 }]}>
                  Mifflin-St Jeor resting metabolic expenditure.
                </Text>
              </View>
            )}

            {/* WHtR (Waist-to-Height Ratio) */}
            {report.whtr && (
              <View style={[styles.metricCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={styles.metricCardHeader}>
                  <Activity size={14} color={report.whtr.isWithinOptimal ? tokens.positive : tokens.attention} />
                  <Text style={[styles.smallMetricTitle, { color: tokens.text2 }]}>Waist-to-Height Ratio</Text>
                </View>
                <Text style={[styles.metricCardVal, { color: tokens.text }]}>
                  {report.whtr.ratio}{' '}
                  <Badge
                    label={report.whtr.isWithinOptimal ? 'Optimal (< 0.5)' : 'Review (≥ 0.5)'}
                    variant={report.whtr.isWithinOptimal ? 'positive' : 'attention'}
                  />
                </Text>
                <Text style={[styles.microText, { color: tokens.text3 }]}>
                  {report.whtr.clinicalContext}
                </Text>
              </View>
            )}

            {/* BSA (Body Surface Area) */}
            {report.bsaM2 !== undefined && (
              <View style={[styles.metricCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={styles.metricCardHeader}>
                  <Scale size={14} color={tokens.action} />
                  <Text style={[styles.smallMetricTitle, { color: tokens.text2 }]}>Body Surface Area (BSA)</Text>
                </View>
                <Text style={[styles.metricCardVal, { color: tokens.text }]}>
                  {report.bsaM2} <Text style={[styles.smallUnit, { color: tokens.text3 }]}>m²</Text>
                </Text>
                <Text style={[styles.microText, { color: tokens.text3 }]}>
                  Mosteller clinical index for dosing & hemodynamic reference.
                </Text>
              </View>
            )}

            {/* IBW (Ideal Body Weight) */}
            {report.ibw && (
              <View style={[styles.metricCard, { backgroundColor: tokens.canvas, borderColor: tokens.rule }]}>
                <View style={styles.metricCardHeader}>
                  <CheckCircle2 size={14} color={tokens.action} />
                  <Text style={[styles.smallMetricTitle, { color: tokens.text2 }]}>Ideal Body Weight Ref</Text>
                </View>
                <Text style={[styles.metricCardVal, { color: tokens.text }]}>
                  {report.ibw.idealWeightKg} <Text style={[styles.smallUnit, { color: tokens.text3 }]}>kg</Text>
                </Text>
                <Text style={[styles.microText, { color: tokens.text3 }]}>
                  Devine clinical pharmacology reference.
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Clinical Disclaimer */}
      <View style={[styles.disclaimerBox, { backgroundColor: tokens.canvas, borderColor: tokens.ruleSoft }]}>
        <Info size={14} color={tokens.text3} />
        <Text style={[styles.disclaimerText, { color: tokens.text3 }]}>
          Descriptive physiological reference context only. Body metrics are never used for commercial ranking,
          caloric targets, or peer comparison. Consult the campus health centre or student medical officer for
          clinical advice.
        </Text>
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
    paddingVertical: 6,
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
