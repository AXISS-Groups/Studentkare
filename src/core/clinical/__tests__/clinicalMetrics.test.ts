import { describe, it, expect } from 'vitest';
import {
  calculateSleepMetrics,
  calculateCardioMetrics,
  calculateVisionErgonomics,
  calculateHydration,
} from '../index';

describe('Expanded Clinical Metrics Suite', () => {
  describe('Sleep Metrics Engine', () => {
    it('calculates optimal sleep efficiency (>= 85%)', () => {
      // 480 mins in bed, 430 mins asleep = 89.6%
      const res = calculateSleepMetrics({
        timeInBedMinutes: 480,
        totalSleepMinutes: 430,
      });
      expect(res.isPhysiologicallyValid).toBe(true);
      expect(res.sleepEfficiencyPct).toBe(89.6);
      expect(res.efficiencyBand).toBe('optimal');
      expect(res.sleepDebtMinutes).toBe(50);
    });

    it('identifies fragmented sleep (< 75%)', () => {
      // 540 mins in bed, 360 mins asleep = 66.7%
      const res = calculateSleepMetrics({
        timeInBedMinutes: 540,
        totalSleepMinutes: 360,
      });
      expect(res.efficiencyBand).toBe('fragmented');
      expect(res.sleepDebtMinutes).toBe(120);
    });

    it('evaluates Epworth Sleepiness Scale', () => {
      const res = calculateSleepMetrics({
        timeInBedMinutes: 480,
        totalSleepMinutes: 420,
        epworthAnswers: [1, 2, 1, 0, 1, 1, 0, 1], // sum = 7 -> normal
      });
      expect(res.epworthTotalScore).toBe(7);
      expect(res.epworthInterpretation).toContain('Normal daytime alertness');
    });

    it('fails closed when sleep exceeds bed time', () => {
      const res = calculateSleepMetrics({
        timeInBedMinutes: 300,
        totalSleepMinutes: 360,
      });
      expect(res.isPhysiologicallyValid).toBe(false);
      expect(res.validationError).toBeDefined();
    });
  });

  describe('Cardio Hemodynamics Engine', () => {
    it('calculates Mean Arterial Pressure (MAP) and Pulse Pressure', () => {
      // BP 120/80 -> MAP = (2*80 + 120)/3 = 93.3 mmHg, PP = 40 mmHg
      const res = calculateCardioMetrics({
        systolicBp: 120,
        diastolicBp: 80,
      });
      expect(res.isPhysiologicallyValid).toBe(true);
      expect(res.meanArterialPressureMmHg).toBe(93.3);
      expect(res.pulsePressureMmHg).toBe(40);
      expect(res.bpCategory).toBe('stage1'); // DBP 80 is Stage 1 threshold
    });

    it('classifies optimal blood pressure (<120 / <80)', () => {
      const res = calculateCardioMetrics({
        systolicBp: 115,
        diastolicBp: 75,
      });
      expect(res.bpCategory).toBe('optimal');
    });

    it('generates Karvonen training zones for 20-year-old', () => {
      const res = calculateCardioMetrics({
        systolicBp: 118,
        diastolicBp: 76,
        ageYears: 20,
        restingHeartRateBpm: 60,
      });
      expect(res.maxHeartRateBpm).toBe(200);
      expect(res.heartRateZones).toHaveLength(4);
      expect(res.heartRateZones?.[0].bpmRange.min).toBe(130); // 60 + 140*0.5 = 130
    });

    it('fails closed if systolic is less than diastolic', () => {
      const res = calculateCardioMetrics({
        systolicBp: 70,
        diastolicBp: 90,
      });
      expect(res.isPhysiologicallyValid).toBe(false);
    });
  });

  describe('Vision Ergonomics & Asthenopia Engine', () => {
    it('evaluates digital strain risk and recommends 20-20-20 rule', () => {
      const res = calculateVisionErgonomics({
        dailyScreenHours: 8,
        breakIntervalMinutes: 90,
        hasDryEyesOrBlur: true,
      });
      expect(res.isPhysiologicallyValid).toBe(true);
      expect(res.riskBand).toBe('high');
      expect(res.breakAdvice).toContain('20 feet');
    });

    it('fails closed on invalid hours', () => {
      const res = calculateVisionErgonomics({
        dailyScreenHours: 28,
        breakIntervalMinutes: 30,
      });
      expect(res.isPhysiologicallyValid).toBe(false);
    });
  });

  describe('Hydration Requirements Engine', () => {
    it('calculates ICMR fluid requirements with activity and heat adjustments', () => {
      // 60 kg -> base 2100 ml + 30 min activity (350 ml) + hot climate (500 ml) = 2950 ml -> 3.0 L
      const res = calculateHydration({
        weightKg: 60,
        activityMinutesDaily: 30,
        isHotClimate: true,
      });
      expect(res.isPhysiologicallyValid).toBe(true);
      expect(res.recommendedDailyLiters).toBe(3);
      expect(res.glassCount8Oz).toBe(12);
    });

    it('fails closed on invalid weight', () => {
      const res = calculateHydration({ weightKg: 10 });
      expect(res.isPhysiologicallyValid).toBe(false);
    });
  });
});
