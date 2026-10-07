import { describe, it, expect } from 'vitest';
import {
  calculateBmi,
  calculateBmr,
  calculateWhtr,
  calculateIbw,
  calculateBsa,
  calculateBodyMetrics,
  validateAnthropometricInputs,
} from '../bodyMetrics';

describe('Anthropometrics & Body Metrics Clinical Engine', () => {
  describe('validateAnthropometricInputs', () => {
    it('approves physiologically plausible inputs', () => {
      const res = validateAnthropometricInputs({
        heightCm: 172,
        weightKg: 65,
        ageYears: 20,
        waistCm: 76,
      });
      expect(res.valid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('fails closed when height is out of bounds', () => {
      expect(validateAnthropometricInputs({ heightCm: 40, weightKg: 60 }).valid).toBe(false);
      expect(validateAnthropometricInputs({ heightCm: 260, weightKg: 60 }).valid).toBe(false);
      expect(validateAnthropometricInputs({ heightCm: NaN, weightKg: 60 }).valid).toBe(false);
    });

    it('fails closed when weight is out of bounds', () => {
      expect(validateAnthropometricInputs({ heightCm: 170, weightKg: 15 }).valid).toBe(false);
      expect(validateAnthropometricInputs({ heightCm: 170, weightKg: 350 }).valid).toBe(false);
    });

    it('fails closed when age is out of bounds', () => {
      expect(validateAnthropometricInputs({ heightCm: 170, weightKg: 60, ageYears: 12 }).valid).toBe(false);
      expect(validateAnthropometricInputs({ heightCm: 170, weightKg: 60, ageYears: 130 }).valid).toBe(false);
    });

    it('fails closed when waist circumference is out of bounds', () => {
      expect(validateAnthropometricInputs({ heightCm: 170, weightKg: 60, waistCm: 25 }).valid).toBe(false);
      expect(validateAnthropometricInputs({ heightCm: 170, weightKg: 60, waistCm: 230 }).valid).toBe(false);
    });
  });

  describe('calculateBmi (ICMR Asia-Pacific reference bands)', () => {
    it('classifies healthy range (18.5 - 22.9 kg/m²)', () => {
      const res = calculateBmi(175, 65);
      expect(res.bmi).toBe(21.2);
      expect(res.category).toBe('healthy');
      expect(res.referenceBand).toBe('18.5 - 22.9 kg/m²');
      expect(res.healthyWeightRangeKg.min).toBe(56.7);
      expect(res.healthyWeightRangeKg.max).toBe(70.1);
    });

    it('classifies underweight (< 18.5 kg/m²)', () => {
      const res = calculateBmi(175, 50);
      expect(res.bmi).toBe(16.3);
      expect(res.category).toBe('underweight');
    });

    it('classifies overweight (23.0 - 24.9 kg/m² per ICMR standards)', () => {
      const res = calculateBmi(175, 72);
      expect(res.bmi).toBe(23.5);
      expect(res.category).toBe('overweight');
    });

    it('classifies obese (>= 25.0 kg/m² per ICMR standards)', () => {
      const res = calculateBmi(175, 85);
      expect(res.bmi).toBe(27.8);
      expect(res.category).toBe('obese');
    });
  });

  describe('calculateBmr (Mifflin-St Jeor)', () => {
    it('calculates resting metabolic rate for men', () => {
      const bmr = calculateBmr(175, 70, 21, 'male');
      // 10*70 + 6.25*175 - 5*21 + 5 = 700 + 1093.75 - 105 + 5 = 1693.75 -> 1694
      expect(bmr.bmrKcal).toBe(1694);
    });

    it('calculates resting metabolic rate for women', () => {
      const bmr = calculateBmr(165, 55, 20, 'female');
      // 10*55 + 6.25*165 - 5*20 - 161 = 550 + 1031.25 - 100 - 161 = 1320.25 -> 1320
      expect(bmr.bmrKcal).toBe(1320);
    });
  });

  describe('calculateWhtr (Waist-to-Height Ratio)', () => {
    it('identifies optimal ratio below 0.5', () => {
      const whtr = calculateWhtr(175, 75);
      expect(whtr.ratio).toBe(0.43);
      expect(whtr.isWithinOptimal).toBe(true);
    });

    it('identifies elevated ratio above 0.5', () => {
      const whtr = calculateWhtr(170, 92);
      expect(whtr.ratio).toBe(0.54);
      expect(whtr.isWithinOptimal).toBe(false);
    });
  });

  describe('calculateIbw & calculateBsa', () => {
    it('calculates Devine ideal weight for 5ft 10in (177.8cm)', () => {
      const ibwMale = calculateIbw(177.8, 'male');
      // 10 inches over 5ft: 50 + 23 = 73 kg
      expect(ibwMale.idealWeightKg).toBe(73);

      const ibwFemale = calculateIbw(177.8, 'female');
      // 45.5 + 23 = 68.5 kg
      expect(ibwFemale.idealWeightKg).toBe(68.5);
    });

    it('calculates Mosteller body surface area', () => {
      const bsa = calculateBsa(175, 70);
      // sqrt(175*70 / 3600) = sqrt(3.40277) = 1.84 m²
      expect(bsa).toBe(1.84);
    });
  });

  describe('calculateBodyMetrics integration', () => {
    it('returns a comprehensive report for full inputs', () => {
      const report = calculateBodyMetrics({
        heightCm: 172,
        weightKg: 64,
        ageYears: 20,
        sex: 'female',
        waistCm: 72,
      });

      expect(report.isPhysiologicallyValid).toBe(true);
      expect(report.bmi?.bmi).toBe(21.6);
      expect(report.bmi?.category).toBe('healthy');
      expect(report.bmr?.bmrKcal).toBe(1454);
      expect(report.whtr?.isWithinOptimal).toBe(true);
      expect(report.ibw?.idealWeightKg).toBe(63.2);
      expect(report.bsaM2).toBe(1.75);
    });

    it('fails closed on invalid height or weight inputs', () => {
      const report = calculateBodyMetrics({
        heightCm: 0,
        weightKg: 64,
      });

      expect(report.isPhysiologicallyValid).toBe(false);
      expect(report.validationError).toBeDefined();
      expect(report.bmi).toBeUndefined();
    });
  });
});
