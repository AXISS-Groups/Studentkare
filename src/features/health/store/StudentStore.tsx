import { makeAutoObservable } from 'mobx';
import type { StudentProfile, LanguageCode } from '@/types';

/**
 * Domain store for the signed-in student profile and UI preferences.
 * Platform-agnostic (no DOM / no React) so it runs on web and native alike.
 */
/**
 * Nobody is signed in until a real profile is set. This used to default to a
 * fabricated student (name, blood group, allergies, asthma) from mockData,
 * which every consumer then rendered or submitted as the user's own record.
 */
const NO_STUDENT: StudentProfile = {
  id: '',
  fullName: '',
  phone: '',
  email: '',
  dob: '',
  age: 0,
  ageVerified: false,
  ageVerificationDoc: 'STUDENT_ID',
  ageVerificationEvidence: 'NONE',
  studentIdNumber: '',
  institutionName: '',
  campusName: '',
  rollNumber: '',
  bloodGroup: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  allergies: [],
  chronicConditions: [],
  pointsBalance: 0,
};

export class StudentStore {
  student: StudentProfile = NO_STUDENT;
  language: LanguageCode = 'EN';

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setStudent(student: StudentProfile): void {
    this.student = student;
  }

  updateStudent(updates: Partial<StudentProfile>): void {
    this.student = { ...this.student, ...updates };
  }

  setLanguage(language: LanguageCode): void {
    this.language = language;
  }

  addPoints(points: number): void {
    this.student = { ...this.student, pointsBalance: this.student.pointsBalance + points };
  }
}
